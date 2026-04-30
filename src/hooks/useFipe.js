/**
 * useFipe v2 — reescrito com log de debug
 * Retorna objetos completos {codigo, nome} nas seleções
 */
import { useState, useEffect, useCallback } from 'react'

const BASE = import.meta.env.DEV
  ? '/fipe/api/v1'
  : 'https://parallelum.com.br/fipe/api/v1'

const _cache = new Map()
async function get(path) {
  if (_cache.has(path)) return _cache.get(path)
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`FIPE ${res.status}`)
  const data = await res.json()
  _cache.set(path, data)
  return data
}

export function tipoFipeEndpoint(tipo = '') {
  const t = tipo.toLowerCase()
  if (t.includes('caminhão') || t.includes('caminhao')) return 'caminhoes'
  return 'carros'
}

export function parseFipeValor(str = '') {
  if (!str) return 0
  return parseFloat(str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0
}

const INIT = { marcas:[], modelos:[], anos:[], preco:null }

export function useFipe(tipoVeiculo) {
  const [state,   setState]   = useState(INIT)
  const [sels,    setSels]    = useState({ marcaCod:'', marcaNome:'', modeloCod:'', modeloNome:'', anoCod:'', anoNome:'' })
  const [loading, setLoading] = useState('')
  const [erro,    setErro]    = useState(null)

  const ep = tipoFipeEndpoint(tipoVeiculo)

  // Carrega marcas quando tipo muda
  useEffect(() => {
    if (!tipoVeiculo) return
    setState(INIT)
    setSels({ marcaCod:'', marcaNome:'', modeloCod:'', modeloNome:'', anoCod:'', anoNome:'' })
    setErro(null)
    setLoading('marcas')
    get(`/${ep}/marcas`)
      .then(marcas => setState(p => ({ ...p, marcas })))
      .catch(e => setErro(e.message))
      .finally(() => setLoading(''))
  }, [ep])

  // Seleciona marca → carrega modelos
  const selecionarMarca = useCallback(async (cod, nome) => {
    console.log('[FIPE] selecionarMarca:', { cod, nome })
    setSels({ marcaCod:cod, marcaNome:nome, modeloCod:'', modeloNome:'', anoCod:'', anoNome:'' })
    setState(p => ({ ...p, modelos:[], anos:[], preco:null }))
    setErro(null)
    if (!cod) return
    setLoading('modelos')
    try {
      const raw = await get(`/${ep}/marcas/${cod}/modelos`)
      const modelos = raw.modelos ?? raw
      console.log('[FIPE] modelos carregados:', modelos.length)
      setState(p => ({ ...p, modelos }))
    } catch(e) { setErro(e.message) }
    finally { setLoading('') }
  }, [ep])

  // Seleciona modelo → carrega anos
  const selecionarModelo = useCallback(async (cod, nome, marcaCod) => {
    console.log('[FIPE] selecionarModelo:', { cod, nome, marcaCod })
    setSels(p => ({ ...p, modeloCod:cod, modeloNome:nome, anoCod:'', anoNome:'' }))
    setState(p => ({ ...p, anos:[], preco:null }))
    setErro(null)
    if (!cod) return
    setLoading('anos')
    try {
      const anos = await get(`/${ep}/marcas/${marcaCod}/modelos/${cod}/anos`)
      console.log('[FIPE] anos carregados:', anos.length)
      setState(p => ({ ...p, anos }))
    } catch(e) { setErro(e.message) }
    finally { setLoading('') }
  }, [ep])

  // Seleciona ano → busca preço
  const selecionarAno = useCallback(async (cod, nome, marcaCod, modeloCod) => {
    console.log('[FIPE] selecionarAno:', { cod, nome, marcaCod, modeloCod })
    setSels(p => ({ ...p, anoCod:cod, anoNome:nome }))
    setState(p => ({ ...p, preco:null }))
    setErro(null)
    if (!cod) return
    setLoading('preco')
    try {
      const preco = await get(`/${ep}/marcas/${marcaCod}/modelos/${modeloCod}/anos/${cod}`)
      console.log('[FIPE] preco:', preco)
      setState(p => ({ ...p, preco }))
    } catch(e) { setErro(e.message) }
    finally { setLoading('') }
  }, [ep])

  const reset = useCallback(() => {
    setState(p => ({ ...p, modelos:[], anos:[], preco:null }))
    setSels({ marcaCod:'', marcaNome:'', modeloCod:'', modeloNome:'', anoCod:'', anoNome:'' })
    setErro(null)
  }, [])

  return { ...state, sels, loading, erro,
           selecionarMarca, selecionarModelo, selecionarAno, reset }
}
