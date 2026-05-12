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

  const { data, error } = id
    ? await supabase.from('leads').update(payload).eq('id', id).select().single()
    : await supabase.from('leads').insert(payload).select().single()

  if (error) throw error
  return data
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
