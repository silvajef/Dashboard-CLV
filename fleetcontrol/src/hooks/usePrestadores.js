import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePrestadores() {
  const [prestadores, setPrestadores] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('prestadores')
      .select('*')
      .order('nome')
    if (error) setError(error.message)
    else setPrestadores(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    const channel = supabase
      .channel('prestadores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prestadores' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch])

  const createPrestador = async (dados) => {
    const { data, error } = await supabase
      .from('prestadores')
      .insert([dados])
      .select()
      .single()
    if (error) throw error
    setPrestadores(p => [...p, data].sort((a,b) => a.nome.localeCompare(b.nome)))
    return data
  }

  const updatePrestador = async (id, dados) => {
    const { data, error } = await supabase
      .from('prestadores')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setPrestadores(p => p.map(pr => pr.id === id ? data : pr))
    return data
  }

  const deletePrestador = async (id) => {
    const { error } = await supabase.from('prestadores').delete().eq('id', id)
    if (error) throw error
    setPrestadores(p => p.filter(pr => pr.id !== id))
  }

  return { prestadores, loading, error, createPrestador, updatePrestador, deletePrestador }
}
