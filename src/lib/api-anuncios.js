/**
 * Camada de dados — anúncios e integrações OAuth (Supabase).
 */
import { supabase } from './supabase'

/* ── Anúncios ─────────────────────────────────────────────────────────── */

export async function getAnuncios() {
  const { data, error } = await supabase
    .from('anuncios')
    .select('*, veiculo:veiculos(id, placa, modelo, marca_nome, modelo_nome, ano_modelo, status)')
    .order('publicado_em', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getAnunciosByVeiculo(veiculoId) {
  const { data, error } = await supabase
    .from('anuncios')
    .select('*')
    .eq('veiculo_id', veiculoId)
  if (error) throw error
  return data || []
}

export async function upsertAnuncio(anuncio) {
  const { id, veiculo, ...payload } = anuncio
  payload.atualizado_em = new Date().toISOString()

  const { data, error } = id
    ? await supabase.from('anuncios').update(payload).eq('id', id).select().single()
    : await supabase.from('anuncios').insert(payload).select().single()

  if (error) throw error
  return data
}

export async function deleteAnuncio(id) {
  const { error } = await supabase.from('anuncios').delete().eq('id', id)
  if (error) throw error
}

/* ── Integrações OAuth ───────────────────────────────────────────────── */

export async function getIntegracoes(userId) {
  const { data, error } = await supabase
    .from('integracoes')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data || []
}

export async function upsertIntegracao(integracao) {
  const payload = { ...integracao, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('integracoes')
    .upsert(payload, { onConflict: 'user_id,plataforma' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteIntegracao(userId, plataforma) {
  const { error } = await supabase
    .from('integracoes')
    .delete()
    .eq('user_id', userId)
    .eq('plataforma', plataforma)
  if (error) throw error
}

/**
 * Persiste webhook_token, webhook_config_id e webhook_configurado na integração.
 * Chamado após registrar o webhook com sucesso no OLX Autoservice.
 *
 * salvarWebhookToken(userId, 'olx', { token: 'uuid', configId: 'uuid' })
 *
 * @param {string} userId
 * @param {string} plataforma
 * @param {{ token: string, configId: string }} dados
 */
export async function salvarWebhookToken(userId, plataforma, { token, configId }) {
  const { error } = await supabase
    .from('integracoes')
    .update({
      webhook_token:       token,
      webhook_config_id:   configId,
      webhook_configurado: true,
      updated_at:          new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('plataforma', plataforma)
  if (error) throw error
}
