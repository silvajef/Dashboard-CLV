/**
 * Camada de dados — leads e atividades do CRM (Supabase).
 */
import { supabase } from './supabase'

/* ── Leads ────────────────────────────────────────────────────────────── */

export async function getLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('*, veiculo:veiculos(id, placa, modelo, marca_nome, modelo_nome, ano_modelo)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function upsertLead(lead) {
  const { id, veiculo, ...payload } = lead
  payload.updated_at = new Date().toISOString()

  if (id) {
    const { data, error } = await supabase.from('leads').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  // Proveniência: lead manual carimba quem criou (não é fronteira de RLS —
  // ver migration 20260708120000). O webhook OLX já grava user_id próprio.
  if (payload.user_id == null) payload.user_id = await usuarioAtualId()

  const { data, error } = await supabase.from('leads').insert(payload).select().single()
  if (error) throw error
  return data
}

async function usuarioAtualId() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.user?.id ?? null
}

export async function deleteLead(id) {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

/* ── Atividades ───────────────────────────────────────────────────────── */

export async function getAtividades(leadId) {
  const { data, error } = await supabase
    .from('leads_atividades')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addAtividade(atividade) {
  const { data, error } = await supabase
    .from('leads_atividades')
    .insert(atividade)
    .select()
    .single()
  if (error) throw error
  return data
}
