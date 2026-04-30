/**
 * Dashboard CLV — Data Access Layer (Supabase)
 */
import { supabase } from './supabase'

/* ── VEÍCULOS ──────────────────────────────────────────────────── */
export async function getVeiculos() {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*, servicos(*, prestador:prestadores(id, nome))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertVeiculo(veiculo) {
  const { servicos, prestador, id, ...payload } = veiculo
  payload.modelo = payload.modelo_nome || payload.modelo || ''

  const { data, error } = id
    ? await supabase.from('veiculos').update(payload).eq('id', id).select().single()
    : await supabase.from('veiculos').insert(payload).select().single()

  if (error) throw error
  return data
}

export async function deleteVeiculo(id) {
  const { error } = await supabase.from('veiculos').delete().eq('id', id)
  if (error) throw error
}

/* ── SERVIÇOS ──────────────────────────────────────────────────── */
export async function upsertServico(servico) {
  const { prestador, id, ...payload } = servico

  const { data, error } = id
    ? await supabase.from('servicos').update(payload).eq('id', id)
        .select('*, prestador:prestadores(id, nome)').single()
    : await supabase.from('servicos').insert(payload)
        .select('*, prestador:prestadores(id, nome)').single()

  if (error) throw error
  return data
}

export async function deleteServico(id) {
  const { error } = await supabase.from('servicos').delete().eq('id', id)
  if (error) throw error
}

/* ── PRESTADORES ───────────────────────────────────────────────── */
export async function getPrestadores() {
  const { data, error } = await supabase.from('prestadores').select('*').order('nome')
  if (error) throw error
  return data
}

export async function upsertPrestador(p) {
  const { id, ...payload } = p
  const { data, error } = id
    ? await supabase.from('prestadores').update(payload).eq('id', id).select().single()
    : await supabase.from('prestadores').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function deletePrestador(id) {
  const { error } = await supabase.from('prestadores').delete().eq('id', id)
  if (error) throw error
}

/* ── METAS ─────────────────────────────────────────────────────── */
export async function getMetas() {
  const { data, error } = await supabase.from('metas').select('*').limit(1).single()
  if (error && error.code !== 'PGRST116') throw error
  return data || { vendas_mes:3, margem_min:8, dias_max_estoque:90, custo_max_pct:5 }
}

export async function saveMetas(metas) {
  const { id, ...payload } = metas
  const { data, error } = await supabase
    .from('metas').upsert({ ...payload, id:1 }, { onConflict:'id' }).select().single()
  if (error) throw error
  return data
}
