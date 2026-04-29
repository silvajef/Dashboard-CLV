/**
 * FleetControl — Data Access Layer (Supabase)
 * Todas as chamadas ao banco passam por aqui.
 */
import { supabase } from './supabase'

/* ── VEÍCULOS ─────────────────────────────────────────────────── */
export async function getVeiculos() {
  const { data, error } = await supabase
    .from('veiculos')
    .select(`*, servicos(*, prestador:prestadores(id, nome))`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertVeiculo(veiculo) {
  const payload = { ...veiculo }
  delete payload.servicos  // relação separada
  const { data, error } = await supabase
    .from('veiculos')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVeiculo(id) {
  const { error } = await supabase.from('veiculos').delete().eq('id', id)
  if (error) throw error
}

/* ── SERVIÇOS ─────────────────────────────────────────────────── */
export async function upsertServico(servico) {
  const { data, error } = await supabase
    .from('servicos')
    .upsert(servico, { onConflict: 'id' })
    .select(`*, prestador:prestadores(id, nome)`)
    .single()
  if (error) throw error
  return data
}

export async function deleteServico(id) {
  const { error } = await supabase.from('servicos').delete().eq('id', id)
  if (error) throw error
}

/* ── PRESTADORES ──────────────────────────────────────────────── */
export async function getPrestadores() {
  const { data, error } = await supabase
    .from('prestadores')
    .select('*')
    .order('nome')
  if (error) throw error
  return data
}

export async function upsertPrestador(prestador) {
  const { data, error } = await supabase
    .from('prestadores')
    .upsert(prestador, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePrestador(id) {
  const { error } = await supabase.from('prestadores').delete().eq('id', id)
  if (error) throw error
}

/* ── METAS ────────────────────────────────────────────────────── */
export async function getMetas() {
  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error  // PGRST116 = no rows
  return data || { vendas_mes: 3, margem_min: 8, dias_max_estoque: 90, custo_max_pct: 5 }
}

export async function saveMetas(metas) {
  const { data, error } = await supabase
    .from('metas')
    .upsert({ ...metas, id: 1 }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}
