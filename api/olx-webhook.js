/**
 * Webhook de leads OLX (Autoservice) — restaurado seguindo a skill
 * secure-webhooks. Diferente da versão anterior (dropada em 2026-07-08):
 * autentica por HASH do webhook_token (não texto claro — ver
 * integracoes.webhook_token_hash) e cifra nome/telefone/email antes de
 * gravar em `leads` (pii-lgpd, obrigatório desde a Fase 1 do CRM).
 *
 * Ack rápido (OLX exige 2XX em 5s) + processamento fire-and-forget, mesmo
 * padrão do secure-webhooks skill.
 *
 * POST /api/olx-webhook
 * Headers: Authorization: Bearer {webhook_token}
 */
import { admin } from './_supabaseAdmin.js'
import { encrypt, hashParaLookup } from './_crypto.js'
import { normalizarTelefone } from './_telefone.js'
import { CONTEXTO_PII_LEAD } from './_pii-contexto.js'

function sanitizarHeaders(headers) {
  const limpo = { ...headers }
  delete limpo.authorization
  delete limpo['x-api-key']
  delete limpo.cookie
  return limpo
}

/**
 * Redige PII antes de gravar em raw_webhook_events — essa tabela tem uma
 * policy de SELECT para o dono do lead (ver leads.raw_event_id), o que
 * tornaria a cifragem de leads.*_encrypted inútil se o payload cru guardasse
 * nome/telefone/email em claro (achado do security-reviewer, 2026-08-31).
 * Mantém os campos operacionais (listId, adId, source, createdAt) — só o
 * que é PII vira '[REDACTED]'.
 */
function redigirPii(body) {
  return { ...body, name: body.name ? '[REDACTED]' : body.name, phone: body.phone ? '[REDACTED]' : body.phone, email: body.email ? '[REDACTED]' : body.email }
}

/** Gera chave de idempotência estável quando a OLX não manda externalId. */
function gerarIdempotencyKey(body) {
  const chave = `${body.listId || ''}-${body.name || ''}-${body.email || ''}-${body.createdAt || ''}`
  return `olx-hash-${Buffer.from(chave).toString('base64').slice(0, 32)}`
}

async function localizarUserIdPeloToken(token) {
  const hash = hashParaLookup(token)
  const { data } = await admin
    .from('integracoes')
    .select('user_id')
    .eq('webhook_token_hash', hash)
    .eq('plataforma', 'olx')
    .maybeSingle()
  return data?.user_id || null
}

async function resolverVeiculoId(adId) {
  if (!adId) return null
  const { data } = await admin
    .from('anuncios')
    .select('veiculo_id')
    .eq('listing_id', String(adId))
    .eq('plataforma', 'olx')
    .maybeSingle()
  return data?.veiculo_id || null
}

/** Grava o evento bruto pra idempotência. Retorna false se já foi visto. */
async function registrarEventoBruto(body, headers, externalId) {
  const { error } = await admin.from('raw_webhook_events').insert({
    provider: 'olx', payload: redigirPii(body), headers: sanitizarHeaders(headers), external_id: externalId,
  })
  if (!error) return true
  if (error.code === '23505') return false // já processado — índice único (provider, external_id)
  throw error
}

/**
 * Upsert idempotente por telefone_hash quando há telefone (mesmo padrão de
 * whatsapp-webhook.js — evita corrida criando 2 leads pro mesmo número);
 * insert simples quando não há telefone.
 */
async function criarLead({ userId, body, veiculoId, externalId, rawEventId }) {
  const temTelefone = !!body.phone
  const e164 = temTelefone ? normalizarTelefone(body.phone) : null
  const telefoneHash = temTelefone ? hashParaLookup(e164) : null

  const payload = {
    user_id: userId,
    external_id: externalId,
    provider: 'olx',
    plataforma_origem: 'olx',
    source: body.source || 'olx',
    status: 'novo',
    nome_encrypted: body.name ? encrypt(body.name, CONTEXTO_PII_LEAD.nome) : null,
    email_encrypted: body.email ? encrypt(body.email.trim().toLowerCase(), CONTEXTO_PII_LEAD.email) : null,
  }
  if (veiculoId)  payload.veiculo_id   = veiculoId
  if (rawEventId) payload.raw_event_id = rawEventId

  if (!temTelefone) {
    const { error } = await admin.from('leads').insert(payload)
    if (error) throw error
    return
  }

  payload.telefone_encrypted = encrypt(e164, CONTEXTO_PII_LEAD.telefone)
  payload.telefone_hash = telefoneHash

  const { data: criado, error: erroInsert } = await admin
    .from('leads')
    .upsert(payload, { onConflict: 'telefone_hash', ignoreDuplicates: true })
    .select('id')
    .maybeSingle()
  if (erroInsert) throw erroInsert
  if (criado) return
  // Já existia (ou perdeu corrida) — não é erro, lead já está no funil.
}

async function processarLead({ userId, body, headers }) {
  const externalId = body.externalId || gerarIdempotencyKey(body)
  const novo = await registrarEventoBruto(body, headers, externalId)
  if (!novo) return

  const { data: raw } = await admin
    .from('raw_webhook_events')
    .select('id')
    .eq('provider', 'olx')
    .eq('external_id', externalId)
    .maybeSingle()

  const veiculoId = await resolverVeiculoId(body.adId)
  await criarLead({ userId, body, veiculoId, externalId, rawEventId: raw?.id || null })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const responseId = crypto.randomUUID()
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return res.status(401).json({ error: 'Token ausente' })

  const userId = await localizarUserIdPeloToken(token)
  if (!userId) return res.status(401).json({ error: 'Token inválido' })

  const body = req.body
  if (!body || !body.name) return res.status(400).json({ error: 'Campo name é obrigatório' })

  // Ack imediato (OLX exige 2XX em 5s) — processamento continua fire-and-forget.
  res.status(200).json({ success: true, responseId })
  processarLead({ userId, body, headers: req.headers }).catch(e =>
    console.log(JSON.stringify({ event: 'olx_webhook_error', responseId, error: String(e) })))
}
