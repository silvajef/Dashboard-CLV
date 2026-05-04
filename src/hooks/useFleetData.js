/**
 * Hook central — carrega e sincroniza todos os dados do FleetControl.
 * Realtime via Supabase channels para atualizações instantâneas.
 *
 * v3.7 — adiciona suporte a clientes e vendas_relacao (pós-venda)
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
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)

  /* ── Carga inicial ────────────────────────────────────────────── */
  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const [v, p, m, c, vr] = await Promise.all([
        api.getVeiculos(),
        api.getPrestadores(),
        api.getMetas(),
        api.getClientes(),
        api.getVendasRelacao(),
      ])
      setVeiculos(v || [])
      setPrestadores(p || [])
      setMetasState(m)
      setClientes(c || [])
      setVendasRelacao(vr || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Aguarda sessão antes de carregar ─────────────────────────── */
  useEffect(() => {
    let channel = null

    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!session) {
          clearTimeout(timeout)
          setLoading(false)
          return
        }

        loadAll().then(() => clearTimeout(timeout))

        channel = supabase
          .channel('fleet_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'veiculos' },        () => loadAll())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'servicos' },        () => loadAll())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'prestadores' },     () => loadAll())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' },        () => loadAll())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas_relacao' },  () => loadAll())
          .subscribe()
      })
      .catch(() => {
        clearTimeout(timeout)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadAll()
      }
      if (event === 'SIGNED_OUT') {
        setVeiculos([])
        setPrestadores([])
        setMetasState(null)
        setClientes([])
        setVendasRelacao([])
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(timeout)
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

  /* ── Pós-Venda (v3.7) ────────────────────────────────────────── */
  const saveCliente = async (dados) => {
    const saved = await api.upsertCliente(dados)
    await loadAll()
    return saved
  }

  const removeCliente = async (id) => {
    await api.deleteCliente(id)
    setClientes(p => p.filter(c => c.id !== id))
  }

  /**
   * registrarVenda — operação composta:
   * cria/atualiza cliente + atualiza veículo + cria vendas_relacao com garantia
   *
   * @param {Object} payload
   *   veiculo_id, cliente {nome, cpf_cnpj, ...}, valor_venda, data_venda, garantia_dias
   */
  const registrarVenda = async (payload) => {
    const saved = await api.registrarVenda(payload)
    await loadAll()
    return saved
  }

  const saveVendaRelacao = async (dados) => {
    const saved = await api.upsertVendaRelacao(dados)
    await loadAll()
    return saved
  }

  const removeVendaRelacao = async (id) => {
    await api.deleteVendaRelacao(id)
    await loadAll()
  }

  return {
    // Existentes
    veiculos, prestadores, metas,
    loading, error, reload: loadAll,
    saveVeiculo, removeVeiculo,
    saveServico, removeServico,
    savePrestador, removePrestador,
    saveMetas,
    // Pós-venda v3.7
    clientes, vendasRelacao,
    saveCliente, removeCliente,
    registrarVenda,
    saveVendaRelacao, removeVendaRelacao,
  }
}
