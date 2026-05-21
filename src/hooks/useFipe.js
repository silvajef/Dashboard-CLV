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
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`FIPE ${res.status}`)
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
      setState(p => ({ ...p, preco: normalizePreco(raw) }))
    } catch(e) { setErro(e.message) }
    finally { setLoading('') }
  }, [ep])

  const reset = useCallback(() => {
    setState(p => ({ ...p, modelos:[], anos:[], preco:null }))
    setSels({ marcaCod:'', marcaNome:'', modeloCod:'', modeloNome:'', anoCod:'', anoNome:'' })
    setErro(null)
  }, [])

  return { ...state, ep, sels, loading, erro,
           selecionarMarca, selecionarModelo, selecionarAno, reset }
}
