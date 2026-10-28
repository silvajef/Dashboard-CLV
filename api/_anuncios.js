/**
 * Helpers server-only compartilhados pelas funções api/anuncios-*.js.
 * Reúne: resolução do adaptador por plataforma, obtenção de um access_token
 * válido (decifra + renova proativamente) e upsert idempotente em
 * `anuncios`. Nenhum destes helpers deve ser importado de código que roda
 * no browser — todos assumem `admin` (service-role, bypassa RLS).
 */
import { encrypt, decrypt } from './_crypto.js'
import { contextoIntegracao } from './_anuncios-contexto.js'
import * as mercadolivre from './_plataformas/mercadolivre.js'
import * as olx from './_plataformas/olx.js'

const ADAPTADORES = { mercadolivre, olx }

/** @param {string} plataforma @returns {typeof mercadolivre} */
export function resolverAdaptador(plataforma) {
  const adaptador = ADAPTADORES[plataforma]
  if (!adaptador) {
    throw new Error(`Plataforma "${plataforma}" sem adaptador de publicação (esperado: ${Object.keys(ADAPTADORES).join(', ')}).`)
  }
  return adaptador
}

const MARGEM_RENOVACAO_MS = 60_000

/**
 * Carrega a integração do usuário para a plataforma, decifra o access_token
 * e renova proativamente se estiver perto de expirar (ML) — mesmo padrão
 * de "tokenValido" da skill oauth-integrations.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {string} plataforma
 * @returns {Promise<{ accessToken: string, integracaoId: number }>}
 */
export async function carregarTokenValido(admin, userId, plataforma) {
  const { data: row, error } = await admin
    .from('integracoes')
    .select('id, access_token_enc, refresh_token_enc, expires_at')
    .eq('user_id', userId)
    .eq('plataforma', plataforma)
    .maybeSingle()
  if (error) throw error
  if (!row || !row.access_token_enc) {
    throw new Error(`integração ausente: usuário=${userId} plataforma=${plataforma} — conecte a conta antes de publicar.`)
  }

  const faltaPouco = row.expires_at && new Date(row.expires_at).getTime() - Date.now() < MARGEM_RENOVACAO_MS
  const adaptador  = resolverAdaptador(plataforma)

  if (faltaPouco && row.refresh_token_enc && typeof adaptador.renovarToken === 'function') {
    const refreshToken = decrypt(row.refresh_token_enc, contextoIntegracao(plataforma, 'refresh_token'))
    const tokens        = await adaptador.renovarToken(refreshToken)
    const expiresAt      = new Date(Date.now() + (tokens.expires_in || 21600) * 1000).toISOString()

    await admin.from('integracoes').update({
      access_token_enc:  encrypt(tokens.access_token, contextoIntegracao(plataforma, 'access_token')),
      refresh_token_enc: tokens.refresh_token
        ? encrypt(tokens.refresh_token, contextoIntegracao(plataforma, 'refresh_token'))
        : row.refresh_token_enc,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)

    return { accessToken: tokens.access_token, integracaoId: row.id }
  }

  const accessToken = decrypt(row.access_token_enc, contextoIntegracao(plataforma, 'access_token'))
  return { accessToken, integracaoId: row.id }
}

/**
 * Upsert idempotente em `anuncios` por (veiculo_id, plataforma) — republicar
 * o mesmo veículo na mesma plataforma atualiza a linha existente, nunca
 * cria duplicata (UNIQUE, migration 20260831190000).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ veiculo_id: number, plataforma: string, listing_id?: string, url?: string,
 *           status: 'ativo'|'pausado'|'encerrado', preco_anunciado?: number, titulo?: string,
 *           erro_sincronizacao?: string|null }} dados
 */
export async function upsertAnuncioIdempotente(admin, dados) {
  const payload = { ...dados, atualizado_em: new Date().toISOString() }
  const { data, error } = await admin
    .from('anuncios')
    .upsert(payload, { onConflict: 'veiculo_id,plataforma' })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Encerra todos os anúncios ativos/pausados de um veículo nas plataformas
 * com adaptador de publicação (chamado ao marcar o veículo como vendido).
 * Falhas individuais por plataforma não interrompem as demais — cada uma
 * é registrada em erro_sincronizacao pra o vendedor ver na aba Anúncios.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {number} veiculoId
 */
export async function encerrarAnunciosDoVeiculo(admin, veiculoId) {
  const { data: anuncios, error } = await admin
    .from('anuncios')
    .select('id, plataforma, listing_id, status')
    .eq('veiculo_id', veiculoId)
    .in('status', ['ativo', 'pausado'])
  if (error) throw error
  if (!anuncios?.length) return []

  const resultados = []
  for (const anuncio of anuncios) {
    try {
      if (anuncio.plataforma === 'facebook') {
        // Facebook não tem chamada por item — some do feed na próxima sincronização.
        await admin.from('anuncios').update({ status: 'encerrado', erro_sincronizacao: null, atualizado_em: new Date().toISOString() }).eq('id', anuncio.id)
        resultados.push({ plataforma: anuncio.plataforma, ok: true })
        continue
      }
      const integ = await carregarIntegracaoQualquerUsuario(admin, anuncio.plataforma)
      const adaptador = resolverAdaptador(anuncio.plataforma)
      await adaptador.fecharAnuncio(integ.accessToken, anuncio.listing_id)
      await admin.from('anuncios').update({ status: 'encerrado', erro_sincronizacao: null, atualizado_em: new Date().toISOString() }).eq('id', anuncio.id)
      resultados.push({ plataforma: anuncio.plataforma, ok: true })
    } catch (e) {
      await admin.from('anuncios').update({ erro_sincronizacao: String(e.message || e), atualizado_em: new Date().toISOString() }).eq('id', anuncio.id)
      resultados.push({ plataforma: anuncio.plataforma, ok: false, erro: String(e.message || e) })
    }
  }
  return resultados
}

/**
 * Loja única (ver [[tenancy-model]]): qualquer integração conectada serve
 * pra fechar o anúncio, independente de qual usuário conectou a conta —
 * não há isolamento por vendedor nesta tabela. Pega a integração mais
 * recente da plataforma.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} plataforma
 */
async function carregarIntegracaoQualquerUsuario(admin, plataforma) {
  const { data: row, error } = await admin
    .from('integracoes')
    .select('id, user_id, access_token_enc, refresh_token_enc, expires_at')
    .eq('plataforma', plataforma)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!row) throw new Error(`nenhuma integração conectada para plataforma=${plataforma}`)
  return carregarTokenValido(admin, row.user_id, plataforma)
}

export { carregarIntegracaoQualquerUsuario }
