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

export function useFipe(tipoVeiculo) {
  const [marcas,  setMarcas]  = useState([])
  const [modelos, setModelos] = useState([])
  const [anos,    setAnos]    = useState([])
  const [preco,   setPreco]   = useState(null)
  const [sels,    setSels]    = useState({ marca:'', modelo:'', ano:'' })
  const [loading, setLoading] = useState('')
  const [erro,    setErro]    = useState(null)
  const ep = tipoFipeEndpoint(tipoVeiculo)

  useEffect(() => {
    if (!tipoVeiculo) return
    setMarcas([]); setModelos([]); setAnos([]); setPreco(null)
    setSels({ marca:'', modelo:'', ano:'' }); setErro(null)
    setLoading('marcas')
    get(`/${ep}/marcas`)
      .then(setMarcas).catch(e=>setErro(e.message)).finally(()=>setLoading(''))
  }, [ep])

  const selecionarMarca = useCallback(async (codigo) => {
    setSels({ marca:codigo, modelo:'', ano:'' })
    setModelos([]); setAnos([]); setPreco(null); setErro(null)
    if (!codigo) return
    setLoading('modelos')
    try { const r = await get(`/${ep}/marcas/${codigo}/modelos`); setModelos(r.modelos??r) }
    catch(e) { setErro(e.message) } finally { setLoading('') }
  }, [ep])

  const selecionarModelo = useCallback(async (codigo, marcaCodigo) => {
    setSels(p=>({...p,modelo:codigo,ano:''}))
    setAnos([]); setPreco(null); setErro(null)
    if (!codigo) return
    setLoading('anos')
    try { setAnos(await get(`/${ep}/marcas/${marcaCodigo}/modelos/${codigo}/anos`)) }
    catch(e) { setErro(e.message) } finally { setLoading('') }
  }, [ep])

  const selecionarAno = useCallback(async (codigo, marcaCodigo, modeloCodigo) => {
    setSels(p=>({...p,ano:codigo}))
    setPreco(null); setErro(null)
    if (!codigo) return
    setLoading('preco')
    try { setPreco(await get(`/${ep}/marcas/${marcaCodigo}/modelos/${modeloCodigo}/anos/${codigo}`)) }
    catch(e) { setErro(e.message) } finally { setLoading('') }
  }, [ep])

  const reset = useCallback(() => {
    setModelos([]); setAnos([]); setPreco(null)
    setSels({ marca:'', modelo:'', ano:'' }); setErro(null)
  }, [])

  return { marcas, modelos, anos, preco, sels, loading, erro,
           selecionarMarca, selecionarModelo, selecionarAno, reset }
}
