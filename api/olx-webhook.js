/**
 * Vercel Serverless Function — receptor de leads OLX via webhook.
 * Arquitetura: OLX → POST aqui → salva raw event → upsert lead idempotente → 200
 *
 * Requisitos: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no Vercel.
 * O token na query string identifica a integração do usuário.
 *
 * POST /api/olx-webhook?token={webhook_token}
 * Body: payload OLX conforme docs (externalId, name, phone, email, message, adId…)
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

/* ── Handler principal ────────────────────────────────────────────────── */
export default async function handler(req, res) {
  const requestId = crypto.randomUUID()
  const t0        = Date.now()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── 1. Validar token na query string ──────────────────────────────────
  const { token } = req.query
  if (!token) {
    console.log(JSON.stringify({ event: 'webhook_rejected', reason: 'token_missing', requestId }))
    return res.status(401).json({ error: 'Token ausente' })
  }

  // ── 2. Identificar usuário pelo token ─────────────────────────────────
  const integData = await sbGet(
    `/integracoes?webhook_token=eq.${encodeURIComponent(token)}&plataforma=eq.olx&select=user_id`
  )
  const userId = Array.isArray(integData) ? integData[0]?.user_id : null

  if (!userId) {
    console.log(JSON.stringify({ event: 'webhook_rejected', reason: 'token_invalid', requestId }))
    return res.status(401).json({ error: 'Token inválido' })
  }

  // ── 3. Validar estrutura do payload ───────────────────────────────────
  const body       = req.body
  const externalId = body?.externalId

  if (!externalId || !body?.name) {
    console.log(JSON.stringify({ event: 'payload_invalid', requestId, userId, fields: Object.keys(body || {}) }))
    return res.status(400).json({ error: 'externalId e name são obrigatórios' })
  }

  console.log(JSON.stringify({ event: 'webhook_received', provider: 'olx', requestId, externalId, userId }))

  // ── 4. Salvar evento bruto (conforme PersistenciaOLX.md) ──────────────
  let rawEventId = null
  try {
    const { ok, json: raw } = await sbPost('/raw_webhook_events', {
      provider:    'olx',
      payload:     body,
      headers:     sanitizeHeaders(req.headers),
      status:      'received',
    })
    rawEventId = ok ? (Array.isArray(raw) ? raw[0]?.id : raw?.id) : null
    console.log(JSON.stringify({ event: 'raw_event_saved', requestId, rawEventId }))
  } catch (e) {
    // Continua mesmo sem salvar o raw — lead é mais importante
    console.log(JSON.stringify({ event: 'raw_event_error', requestId, error: e.message }))
  }

  // ── 5. Vincular ao veículo interno via listing_id (adId da OLX) ───────
  let veiculoId = null
  if (body.adId) {
    try {
      const ads = await sbGet(
        `/anuncios?listing_id=eq.${encodeURIComponent(String(body.adId))}&plataforma=eq.olx&select=veiculo_id`
      )
      veiculoId = Array.isArray(ads) ? ads[0]?.veiculo_id : null
      if (veiculoId) {
        console.log(JSON.stringify({ event: 'vehicle_matched', requestId, veiculoId, adId: body.adId }))
      }
    } catch (e) {
      console.log(JSON.stringify({ event: 'vehicle_match_error', requestId, error: e.message }))
    }
  }

  // ── 6. Upsert idempotente do lead (UNIQUE external_id + provider) ─────
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
  if (veiculoId)   leadPayload.veiculo_id   = veiculoId
  if (rawEventId)  leadPayload.raw_event_id = rawEventId

  const { ok: leadOk, status: leadStatus } = await sbPost(
    '/leads',
    leadPayload,
    // ignore-duplicates = idempotente: reenvio do mesmo externalId não cria duplicata
    'resolution=ignore-duplicates,return=representation',
  )

  if (leadOk) {
    console.log(JSON.stringify({ event: 'lead_saved', requestId, externalId, ms: Date.now() - t0 }))
  } else {
    console.log(JSON.stringify({ event: 'lead_error', requestId, httpStatus: leadStatus }))
  }

  // ── 7. Atualizar status do evento bruto ───────────────────────────────
  if (rawEventId) {
    sbPatch(`/raw_webhook_events?id=eq.${rawEventId}`, {
      status: leadOk ? 'processed' : 'failed',
    })
  }

  // Responde sempre 200 para evitar retentativas desnecessárias da OLX
  return res.status(200).json({ success: true, requestId })
}
