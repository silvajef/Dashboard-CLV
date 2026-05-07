/**
 * Hook central — carrega e sincroniza todos os dados do FleetControl.
 * v3.9 — processos_venda adicionado
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import * as api from '../lib/api'

export function useFleetData() {
  const [veiculos,       setVeiculos]       = useState([])
  const [prestadores,    setPrestadores]    = useState([])
  const [metas,          setMetasState]     = useState(null)
  const [clientes,       setClientes]       = useState([])
  const [vendasRelacao,  setVendasRelacao]  = useState([])
  const [processos,      setProcessos]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)

  /* ── Carga inicial ──────────────────────────────────────────── */
  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const [v, p, m, c, vr, proc] = await Promise.all([
        api.getVeiculos(),
        api.getPrestadores(),
        api.getMetas(),
        api.getClientes(),
        api.getVendasRelacao(),
        api.getProcessosVenda(),
      ])
      setVeiculos(v || [])
      setPrestadores(p || [])
      setMetasState(m)
      setClientes(c || [])
      setVendasRelacao(vr || [])
      setProcessos(proc || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Aguarda sessão antes de carregar ───────────────────────── */
  useEffect(() => {
    let channel = null
    const timeout = setTimeout(() => setLoading(false), 5000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!session) { clearTimeout(timeout); setLoading(false); return }

        loadAll().then(() => clearTimeout(timeout))

        channel = supabase
          .channel('fleet_changes')
          .on('postgres_changes', { event:'*', schema:'public', table:'veiculos' },         () => loadAll())
          .on('postgres_changes', { event:'*', schema:'public', table:'servicos' },         () => loadAll())
          .on('postgres_changes', { event:'*', schema:'public', table:'prestadores' },      () => loadAll())
          .on('postgres_changes', { event:'*', schema:'public', table:'custos_fixos' },     () => loadAll())
          .on('postgres_changes', { event:'*', schema:'public', table:'clientes' },         () => loadAll())
          .on('postgres_changes', { event:'*', schema:'public', table:'vendas_relacao' },   () => loadAll())
          .on('postgres_changes', { event:'*', schema:'public', table:'processos_venda' },  () => loadAll())
          .subscribe()
      })
      .catch(() => { clearTimeout(timeout); setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') loadAll()
      if (event === 'SIGNED_OUT') {
        setVeiculos([]); setPrestadores([]); setMetasState(null)
        setClientes([]); setVendasRelacao([]); setProcessos([])
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(timeout)
      if (channel) supabase.removeChannel(channel)
      subscription.unsubscribe()
    }
  }, [loadAll])

  /* ── Actions ────────────────────────────────────────────────── */
  const saveVeiculo      = async (dados)   => { const s = await api.upsertVeiculo(dados);   await loadAll(); return s }
  const removeVeiculo    = async (id)      => { await api.deleteVeiculo(id);   setVeiculos(p => p.filter(v => v.id !== id)) }
  const saveServico      = async (servico) => { const s = await api.upsertServico(servico); await loadAll(); return s }
  const removeServico    = async (id)      => { await api.deleteServico(id);   await loadAll() }
  const savePrestador    = async (dados)   => { const s = await api.upsertPrestador(dados); await loadAll(); return s }
  const removePrestador  = async (id)      => { await api.deletePrestador(id); setPrestadores(p => p.filter(pr => pr.id !== id)) }
  const saveMetas        = async (m)       => { const s = await api.saveMetas(m); setMetasState(s); return s }
  const saveCustosFixos  = async (dados)   => { const s = await api.upsertCustosFixos(dados); await loadAll(); return s }
  const removeCustosFixos= async (vid)     => { await api.deleteCustosFixos(vid); await loadAll() }
  const saveCliente      = async (dados)   => { const s = await api.upsertCliente(dados);      await loadAll(); return s }
  const removeCliente    = async (id)      => { await api.deleteCliente(id); setClientes(p => p.filter(c => c.id !== id)) }
  const registrarVenda   = async (p)       => { const s = await api.registrarVenda(p);         await loadAll(); return s }
  const saveVendaRelacao = async (dados)   => { const s = await api.upsertVendaRelacao(dados); await loadAll(); return s }
  const removeVendaRelacao=async (id)      => { await api.deleteVendaRelacao(id); await loadAll() }

  // Processos de venda (v3.9)
  const saveProcesso     = async (dados)   => { const s = await api.upsertProcessoVenda(dados);  await loadAll(); return s }
  const concluirProcesso = async (params)  => { await api.concluirProcessoVenda(params);          await loadAll() }
  const cancelarProcesso = async (params)  => { await api.cancelarProcessoVenda(params);          await loadAll() }

  return {
    veiculos, prestadores, metas, clientes, vendasRelacao, processos,
    loading, error, reload: loadAll,
    saveVeiculo, removeVeiculo,
    saveServico, removeServico,
    savePrestador, removePrestador,
    saveMetas,
    saveCustosFixos, removeCustosFixos,
    saveCliente, removeCliente,
    registrarVenda, saveVendaRelacao, removeVendaRelacao,
    saveProcesso, concluirProcesso, cancelarProcesso,
  }
}
