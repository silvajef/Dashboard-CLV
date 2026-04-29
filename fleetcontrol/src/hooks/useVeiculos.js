import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useVeiculos() {
  const [veiculos,  setVeiculos]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // ── Fetch all veiculos with their servicos ──────────────────────
  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('veiculos')
      .select('*, servicos(*)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setVeiculos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // ── Realtime subscription ───────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('veiculos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'veiculos' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicos' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch])

  // ── CRUD veículos ───────────────────────────────────────────────
  const createVeiculo = async (dados) => {
    const { servicos: _, ...veiculoDados } = dados
    const { data, error } = await supabase
      .from('veiculos')
      .insert([veiculoDados])
      .select('*, servicos(*)')
      .single()
    if (error) throw error
    setVeiculos(p => [data, ...p])
    return data
  }

  const updateVeiculo = async (id, dados) => {
    const { servicos: _, ...veiculoDados } = dados
    const { data, error } = await supabase
      .from('veiculos')
      .update(veiculoDados)
      .eq('id', id)
      .select('*, servicos(*)')
      .single()
    if (error) throw error
    setVeiculos(p => p.map(v => v.id === id ? data : v))
    return data
  }

  const deleteVeiculo = async (id) => {
    const { error } = await supabase.from('veiculos').delete().eq('id', id)
    if (error) throw error
    setVeiculos(p => p.filter(v => v.id !== id))
  }

  const marcarVendido = async (id, dados) => {
    return updateVeiculo(id, { ...dados, status: 'vendido' })
  }

  // ── CRUD serviços ───────────────────────────────────────────────
  const createServico = async (veiculoId, dados) => {
    const { data, error } = await supabase
      .from('servicos')
      .insert([{ ...dados, veiculo_id: veiculoId }])
      .select()
      .single()
    if (error) throw error
    // Recalculate vehicle status
    const veiculo = veiculos.find(v => v.id === veiculoId)
    if (veiculo && dados.status !== 'concluido' && dados.status !== 'cancelado') {
      await updateVeiculo(veiculoId, { status: 'manutencao' })
    }
    setVeiculos(p => p.map(v =>
      v.id === veiculoId ? { ...v, servicos: [...(v.servicos||[]), data] } : v
    ))
    return data
  }

  const updateServico = async (veiculoId, servicoId, dados) => {
    const { data, error } = await supabase
      .from('servicos')
      .update(dados)
      .eq('id', servicoId)
      .select()
      .single()
    if (error) throw error
    setVeiculos(p => p.map(v =>
      v.id === veiculoId
        ? { ...v, servicos: v.servicos.map(s => s.id === servicoId ? data : s) }
        : v
    ))
    return data
  }

  const deleteServico = async (veiculoId, servicoId) => {
    const { error } = await supabase.from('servicos').delete().eq('id', servicoId)
    if (error) throw error
    setVeiculos(p => p.map(v =>
      v.id === veiculoId
        ? { ...v, servicos: v.servicos.filter(s => s.id !== servicoId) }
        : v
    ))
  }

  return {
    veiculos, loading, error, refetch: fetch,
    createVeiculo, updateVeiculo, deleteVeiculo, marcarVendido,
    createServico, updateServico, deleteServico,
  }
}
