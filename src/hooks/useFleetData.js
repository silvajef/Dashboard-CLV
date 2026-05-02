/**
 * Hook central — carrega e sincroniza todos os dados do FleetControl.
 * Realtime via Supabase channels para atualizações instantâneas.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import * as api from '../lib/api'

export function useFleetData() {
  const [veiculos,    setVeiculos]    = useState([])
  const [prestadores, setPrestadores] = useState([])
  const [metas,       setMetasState]  = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  /* ── Carga inicial ────────────────────────────────────────────── */
  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const [v, p, m] = await Promise.all([
        api.getVeiculos(),
        api.getPrestadores(),
        api.getMetas(),
      ])
      setVeiculos(v || [])
      setPrestadores(p || [])
      setMetasState(m)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Aguarda sessão antes de carregar ─────────────────────────── */
  useEffect(() => {
    let channel = null

    // Aguarda sessão ativa antes de fazer qualquer query
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return // App.jsx já redireciona para Login

      loadAll()

      channel = supabase
        .channel('fleet_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'veiculos' },   () => loadAll())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'servicos' },   () => loadAll())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prestadores' },() => loadAll())
        .subscribe()
    })

    // Recarrega quando a sessão muda (ex: refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadAll()
      }
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
      subscription.unsubscribe()
    }
  }, [loadAll])

  /* ── Actions ──────────────────────────────────────────────────── */
  const saveVeiculo = async (dados) => {
    const saved = await api.upsertVeiculo(dados)
    await loadAll()
    return saved
  }

  const removeVeiculo = async (id) => {
    await api.deleteVeiculo(id)
    setVeiculos(p => p.filter(v => v.id !== id))
  }

  const saveServico = async (servico) => {
    const saved = await api.upsertServico(servico)
    await loadAll()
    return saved
  }

  const removeServico = async (id) => {
    await api.deleteServico(id)
    await loadAll()
  }

  const savePrestador = async (dados) => {
    const saved = await api.upsertPrestador(dados)
    await loadAll()
    return saved
  }

  const removePrestador = async (id) => {
    await api.deletePrestador(id)
    setPrestadores(p => p.filter(pr => pr.id !== id))
  }

  const saveMetas = async (novasMetas) => {
    const saved = await api.saveMetas(novasMetas)
    setMetasState(saved)
    return saved
  }

  return {
    veiculos, prestadores, metas,
    loading, error, reload: loadAll,
    saveVeiculo, removeVeiculo,
    saveServico, removeServico,
    savePrestador, removePrestador,
    saveMetas,
  }
}