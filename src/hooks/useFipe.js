/**
 * useFipe v3 — FIPE API v2 (fipe.parallelum.com.br/api/v2)
 * Auth header injected server-side via /api/fipe proxy.
 * Returns normalized PascalCase price + priceHistory as `historico`.
 */
import { useState, useEffect, useCallback } from 'react'

const BASE = '/api/fipe'

const _cache = new Map()
async function get(path) {
  if (_cache.has(path)) return _cache.get(path)
  // Usa query param ?p= para evitar problemas de catch-all routing no Vercel
  const url = `${BASE}?p=${encodeURIComponent(path.replace(/^\//, ''))}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`FIPE ${res.status} (${path})`)
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('json')) throw new Error('Serviço FIPE indisponível.')
  const data = await res.json()
  _cache.set(path, data)
  return data
}

// v2 uses English type slugs
export function tipoFipeEndpoint(tipo = '') {
  const t = tipo.toLowerCase()
  if (t.includes('caminhão') || t.includes('caminhao')) return 'trucks'
  if (t === 'moto') return 'motorcycles'
  return 'cars'
}

// v2 list items: {code, name} → {codigo, nome}
function normalizeItem(item) {
  return { codigo: item.code ?? item.codigo, nome: item.name ?? item.nome }
}

// v2 price response → PascalCase (backward compat) + historico array
function normalizePreco(raw) {
  return {
    CodigoFipe:    raw.codeFipe       || raw.CodigoFipe   || '',
    Valor:         raw.price          || raw.Valor         || '',
    MesReferencia: raw.referenceMonth || raw.MesReferencia || '',
    Combustivel:   raw.fuel           || raw.Combustivel   || '',
    Marca:         raw.brand          || raw.Marca         || '',
    Modelo:        raw.model          || raw.Modelo        || '',
    AnoModelo:     String(raw.modelYear || raw.AnoModelo || ''),
    historico:     raw.priceHistory   || [],
  }
}

export function parseFipeValor(str = '') {
  if (!str) return 0
  return parseFloat(str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0
}

/**
 * Acha o item da lista FIPE pelo nome gravado no veículo, sem diferenciar
 * caixa nem espaços nas pontas. Null se não houver correspondência.
 * Ex.: acharPorNome([{ codigo:'21', nome:'Fiat' }], 'FIAT') → { codigo:'21', nome:'Fiat' }
 */
export function acharPorNome(lista, nome) {
  const alvo = String(nome ?? '').trim().toLowerCase()
  if (!alvo) return null
  return lista.find(i => String(i.nome || '').trim().toLowerCase() === alvo) || null
}

/**
 * Busca marca → modelos → anos a partir dos nomes salvos e para no primeiro
 * nível que não casar (ex.: modelo renomeado na FIPE). Não busca preço.
 */
async function carregarCascata(ep, alvo) {
  const vazio = { marca: null, modelo: null, ano: null, modelos: [], anos: [] }
  const marca = acharPorNome((await get(`/${ep}/brands`)).map(normalizeItem), alvo.marca)
  if (!marca) return vazio
  const modelos = (await get(`/${ep}/brands/${marca.codigo}/models`)).map(normalizeItem)
  const modelo  = acharPorNome(modelos, alvo.modelo)
  if (!modelo) return { ...vazio, marca, modelos }
  const anos = (await get(`/${ep}/brands/${marca.codigo}/models/${modelo.codigo}/years`)).map(normalizeItem)
  return { marca, modelo, ano: acharPorNome(anos, alvo.ano), modelos, anos }
}

function selsDaCascata(c) {
  return {
    marcaCod:  c.marca?.codigo  || '', marcaNome:  c.marca?.nome  || '',
    modeloCod: c.modelo?.codigo || '', modeloNome: c.modelo?.nome || '',
    anoCod:    c.ano?.codigo    || '', anoNome:    c.ano?.nome    || '',
  }
}

const INIT = { marcas: [], modelos: [], anos: [], preco: null }

export function useFipe(tipoVeiculo) {
  const [state,   setState]   = useState(INIT)
  const [sels,    setSels]    = useState({ marcaCod:'', marcaNome:'', modeloCod:'', modeloNome:'', anoCod:'', anoNome:'' })
  const [loading, setLoading] = useState('')
  const [erro,    setErro]    = useState(null)

  const ep = tipoFipeEndpoint(tipoVeiculo)

  useEffect(() => {
    if (!tipoVeiculo) return
    setState(INIT)
    setSels({ marcaCod:'', marcaNome:'', modeloCod:'', modeloNome:'', anoCod:'', anoNome:'' })
    setErro(null)
    setLoading('marcas')
    get(`/${ep}/brands`)
      .then(data => setState(p => ({ ...p, marcas: data.map(normalizeItem) })))
      .catch(e => setErro(e.message))
      .finally(() => setLoading(''))
  }, [ep])

  const selecionarMarca = useCallback(async (cod, nome) => {
    setSels({ marcaCod:cod, marcaNome:nome, modeloCod:'', modeloNome:'', anoCod:'', anoNome:'' })
    setState(p => ({ ...p, modelos:[], anos:[], preco:null }))
    setErro(null)
    if (!cod) return
    setLoading('modelos')
    try {
      const data = await get(`/${ep}/brands/${cod}/models`)
      setState(p => ({ ...p, modelos: data.map(normalizeItem) }))
    } catch(e) { setErro(e.message) }
    finally { setLoading('') }
  }, [ep])

  const selecionarModelo = useCallback(async (cod, nome, marcaCod) => {
    setSels(p => ({ ...p, modeloCod:cod, modeloNome:nome, anoCod:'', anoNome:'' }))
    setState(p => ({ ...p, anos:[], preco:null }))
    setErro(null)
    if (!cod) return
    setLoading('anos')
    try {
      const anos = await get(`/${ep}/brands/${marcaCod}/models/${cod}/years`)
      setState(p => ({ ...p, anos: anos.map(normalizeItem) }))
    } catch(e) { setErro(e.message) }
    finally { setLoading('') }
  }, [ep])

  const selecionarAno = useCallback(async (cod, nome, marcaCod, modeloCod) => {
    setSels(p => ({ ...p, anoCod:cod, anoNome:nome }))
    setState(p => ({ ...p, preco:null }))
    setErro(null)
    if (!cod) return
    setLoading('preco')
    try {
      const raw = await get(`/${ep}/brands/${marcaCod}/models/${modeloCod}/years/${cod}`)
      const fipeCod = raw.codeFipe || ''
      let priceHistory = []
      if (fipeCod) {
        try {
          const hist = await get(`/${ep}/${fipeCod}/years/${cod}/history`)
          priceHistory = hist.priceHistory || []
        } catch { /* histórico não crítico */ }
      }
      setState(p => ({ ...p, preco: normalizePreco({ ...raw, priceHistory }) }))
    } catch(e) { setErro(e.message) }
    finally { setLoading('') }
  }, [ep])

  /**
   * Repõe nos selects a marca/modelo/ano de um veículo já salvo — o banco só
   * guarda os nomes, então sem isto a edição abria em "Selecione a marca".
   * Não busca o preço: o valor_fipe gravado prevalece até o usuário trocar.
   * Ex.: fipe.restaurarSelecao({ marca:'Fiat', modelo:'Ducato Cargo 2.3', ano:'2020 Diesel' })
   */
  const restaurarSelecao = useCallback(async (alvo) => {
    setErro(null)
    setLoading('seleção salva')
    try {
      const c = await carregarCascata(ep, alvo)
      setState(p => ({ ...p, modelos: c.modelos, anos: c.anos, preco: null }))
      setSels(selsDaCascata(c))
    } catch(e) { setErro(e.message) }
    finally { setLoading('') }
  }, [ep])

  const reset = useCallback(() => {
    setState(p => ({ ...p, modelos:[], anos:[], preco:null }))
    setSels({ marcaCod:'', marcaNome:'', modeloCod:'', modeloNome:'', anoCod:'', anoNome:'' })
    setErro(null)
  }, [])

  return { ...state, ep, sels, loading, erro,
           selecionarMarca, selecionarModelo, selecionarAno, restaurarSelecao, reset }
}
