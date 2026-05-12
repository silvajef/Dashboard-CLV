/**
 * Hook para o CRM de leads — carrega, sincroniza e expõe ações de pipeline.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import * as api from '../lib/api-leads'

export function useLeads() {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const loadLeads = useCallback(async () => {
    try {
      setLeads(await api.getLeads())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeads()
    const channel = supabase
      .channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, loadLeads)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadLeads])

  async function saveLead(lead) {
    const saved = await api.upsertLead(lead)
    await loadLeads()
    return saved
  }

  async function removeLead(id) {
    await api.deleteLead(id)
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  async function moverLead(leadId, novoStatus) {
    await api.upsertLead({ id: leadId, status: novoStatus })
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: novoStatus } : l))
  }

  async function registrarAtividade(leadId, tipo, descricao, usuarioId) {
    return api.addAtividade({ lead_id: leadId, tipo, descricao, usuario_id: usuarioId })
  }

  async function buscarAtividades(leadId) {
    return api.getAtividades(leadId)
  }

  return {
    leads, loading, error,
    saveLead, removeLead, moverLead,
    registrarAtividade, buscarAtividades,
  }
}
