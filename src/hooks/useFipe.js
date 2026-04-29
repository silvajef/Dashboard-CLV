/**
 * Hook: useFipe
 * Gerencia o fluxo cascata: marca → modelo → ano → preço
 * Usado dentro do ModalVeiculo para busca FIPE integrada
 */
import { useState, useEffect, useCallback } from 'react'
import { getMarcas, getModelos, getAnos, getPreco, tipoFipe } from '../lib/fipe'

export function useFipe(tipoVeiculo) {
  const [marcas,      setMarcas]      = useState([])
  const [modelos,     setModelos]     = useState([])
  const [anos,        setAnos]        = useState([])
  const [resultado,   setResultado]   = useState(null)

  const [marcaSel,    setMarcaSel]    = useState('')
  const [modeloSel,   setModeloSel]   = useState('')
  const [anoSel,      setAnoSel]      = useState('')

  const [loading,     setLoading]     = useState(false)
  const [erro,        setErro]        = useState(null)
  const [etapa,       setEtapa]       = useState('marca') // marca|modelo|ano|preco

  // Reset quando tipo muda
  useEffect(() => {
    setMarcas([]); setModelos([]); setAnos([]); setResultado(null)
    setMarcaSel(''); setModeloSel(''); setAnoSel('')
    setEtapa('marca'); setErro(null)
    if (!tipoVeiculo) return
    setLoading(true)
    getMarcas(tipoVeiculo)
      .then(setMarcas)
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [tipoVeiculo])

  const selecionarMarca = useCallback(async (codigo) => {
    setMarcaSel(codigo); setModelos([]); setAnos([]); setResultado(null)
    setModeloSel(''); setAnoSel(''); setEtapa('modelo'); setErro(null)
    try {
      setLoading(true)
      const m = await getModelos(tipoVeiculo, codigo)
      setModelos(m)
    } catch(e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [tipoVeiculo])

  const selecionarModelo = useCallback(async (codigo) => {
    setModeloSel(codigo); setAnos([]); setResultado(null)
    setAnoSel(''); setEtapa('ano'); setErro(null)
    try {
      setLoading(true)
      const a = await getAnos(tipoVeiculo, marcaSel, codigo)
      setAnos(a)
    } catch(e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [tipoVeiculo, marcaSel])

  const selecionarAno = useCallback(async (codigo) => {
    setAnoSel(codigo); setResultado(null); setEtapa('preco'); setErro(null)
    try {
      setLoading(true)
      const p = await getPreco(tipoVeiculo, marcaSel, modeloSel, codigo)
      setResultado(p)
    } catch(e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [tipoVeiculo, marcaSel, modeloSel])

  const reset = () => {
    setMarcaSel(''); setModeloSel(''); setAnoSel('')
    setModelos([]); setAnos([]); setResultado(null)
    setEtapa('marca'); setErro(null)
  }

  return {
    marcas, modelos, anos, resultado,
    marcaSel, modeloSel, anoSel,
    loading, erro, etapa,
    selecionarMarca, selecionarModelo, selecionarAno, reset,
    tipo: tipoFipe(tipoVeiculo),
  }
}
