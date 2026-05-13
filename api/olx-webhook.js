/**
 * Vercel Serverless Function — receptor de leads OLX via webhook.
 * Arquitetura: OLX → POST aqui → salva raw event → upsert lead idempotente → 200
 *
 * Requisitos: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no Vercel.
 *
 * Conforme docs OLX (leads.html):
 * - OLX faz POST com payload JSON, timeout de 5s, espera 2XX
 * - OLX envia o webhook_token em Authorization: Bearer
 * - Resposta deve incluir responseId para rastreamento
 * - externalId é opcional — usado para idempotência quando presente
 * - adId = nosso ID interno do veículo (enviado no autoupload)
 *
 * POST /api/olx-webhook
 * Headers: Authorization: Bearer {webhook_token}
 */

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/* ── Supabase REST helpers ────────────────────────────────────────────── */

function sbHeaders(prefer = 'return=representation') {
  return {
    apikey:         SERVICE_ROLE_KEY,
    Authorization:  `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer:         prefer,
  }
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: sbHeaders(''),
  })
  return res.json().catch(() => [])
}

async function sbPost(path, body, prefer = 'return=representation') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method:  'POST',
    headers: sbHeaders(prefer),
    body:    JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) }
}

async function sbPatch(path, body) {
  await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method:  'PATCH',
    headers: sbHeaders(''),
    body:    JSON.stringify(body),
  }).catch(() => {})
}

/* ── Segurança: nunca logar tokens de autenticação ────────────────────── */
function sanitizeHeaders(headers) {
  const { authorization, 'x-api-key': _k, cookie: _c, ...safe } = headers
  return safe
}

/**
 * Gera ID de idempotência quando externalId não está presente.
 * Usa campos estáveis do payload para evitar duplicatas.
 */
function gerarIdempotencyKey(body) {
  const chave = `${body.listId || ''}-${body.name || ''}-${body.email || ''}-${body.createdAt || ''}`
  return `olx-hash-${btoa(chave).slice(0, 32)}`
}

/* ── Handler principal ────────────────────────────────────────────────── */
export default async function handler(req, res) {
  // responseId é o campo que a OLX usa para rastreamento na resposta
  const responseId = crypto.randomUUID()
  const t0         = Date.now()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── 1. Extrair token do header Authorization enviado pela OLX ─────────
  const authHeader = req.headers.authorization || ''
  const token      = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    console.log(JSON.stringify({ event: 'webhook_rejected', reason: 'token_missing', responseId }))
    return res.status(401).json({ error: 'Token ausente' })
  }

  // ── 2. Identificar usuário pelo token ─────────────────────────────────
  const integData = await sbGet(
    `/integracoes?webhook_token=eq.${encodeURIComponent(token)}&plataforma=eq.olx&select=user_id`
  )
  const userId = Array.isArray(integData) ? integData[0]?.user_id : null

  if (!userId) {
    console.log(JSON.stringify({ event: 'webhook_rejected', reason: 'token_invalid', responseId }))
    return res.status(401).json({ error: 'Token inválido' })
  }

  // ── 3. Validar campos mínimos do payload ──────────────────────────────
  // Conforme docs: name é o único campo crítico para criar um lead útil
  const body = req.body
  if (!body || !body.name) {
    console.log(JSON.stringify({ event: 'payload_invalid', responseId, userId, fields: Object.keys(body || {}) }))
    return res.status(400).json({ error: 'Campo name é obrigatório' })
  }

  // externalId é opcional — gera chave de idempotência quando ausente
  const externalId = body.externalId || gerarIdempotencyKey(body)

  console.log(JSON.stringify({ event: 'webhook_received', provider: 'olx', responseId, externalId, source: body.source, userId }))

  // ── 4. Salvar evento bruto ────────────────────────────────────────────
  let rawEventId = null
  try {
    const { ok, json: raw } = await sbPost('/raw_webhook_events', {
      provider: 'olx',
      payload:  body,
      headers:  sanitizeHeaders(req.headers),
      status:   'received',
    })
    rawEventId = ok ? (Array.isArray(raw) ? raw[0]?.id : raw?.id) : null
    console.log(JSON.stringify({ event: 'raw_event_saved', responseId, rawEventId }))
  } catch (e) {
    console.log(JSON.stringify({ event: 'raw_event_error', responseId, error: e.message }))
  }

  // ── 5. Vincular ao veículo interno via adId ───────────────────────────
  // adId = ID interno que enviamos ao publicar o anúncio (String(veiculo.id))
  let veiculoId = null
  if (body.adId) {
    try {
      const ads = await sbGet(
        `/anuncios?listing_id=eq.${encodeURIComponent(String(body.adId))}&plataforma=eq.olx&select=veiculo_id`
      )
      veiculoId = Array.isArray(ads) ? ads[0]?.veiculo_id : null
      if (veiculoId) {
        console.log(JSON.stringify({ event: 'vehicle_matched', responseId, veiculoId, adId: body.adId }))
      }
    } catch (e) {
      console.log(JSON.stringify({ event: 'vehicle_match_error', responseId, error: e.message }))
    }
  }

  // ── 6. Upsert idempotente do lead ─────────────────────────────────────
  const leadPayload = {
    external_id: externalId,
    provider:    'olx',
    user_id:     userId,
    nome:        body.name    || '',
    telefone:    body.phone   || '',
    email:       body.email   || '',
    mensagem:    body.message || '',
    source:      body.source  || 'olx',
    status:      'novo',
  }
  if (veiculoId)  leadPayload.veiculo_id   = veiculoId
  if (rawEventId) leadPayload.raw_event_id = rawEventId

  const { ok: leadOk, status: leadStatus } = await sbPost(
    '/leads',
    leadPayload,
    // ignore-duplicates = mesmo externalId não cria duplicata (idempotência)
    'resolution=ignore-duplicates,return=representation',
  )

  if (leadOk) {
    console.log(JSON.stringify({ event: 'lead_saved', responseId, externalId, ms: Date.now() - t0 }))
  } else {
    console.log(JSON.stringify({ event: 'lead_error', responseId, httpStatus: leadStatus }))
  }

  // ── 7. Atualizar status do evento bruto ───────────────────────────────
  if (rawEventId) {
    sbPatch(`/raw_webhook_events?id=eq.${rawEventId}`, {
      status: leadOk ? 'processed' : 'failed',
    })
  }

  // OLX espera 2XX com responseId para rastreamento
  return res.status(200).json({ success: true, responseId })
}
