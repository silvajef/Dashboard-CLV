/**
 * Webhook de entrada do WhatsApp (Meta Cloud API) — recebe mensagem, cria/
 * localiza o lead, registra a atividade e aciona o bot de triagem. Segue o
 * checklist da skill secure-webhooks: assinatura verificada sobre o corpo
 * cru, idempotência via raw_webhook_events, headers sanitizados antes de
 * persistir. Processa de forma síncrona (não ack-e-esquece) — ver
 * docs/CRM_SPEC_CLV_Dashboard.md §2 pra justificativa e o risco aceito no
 * plano Hobby da Vercel (timeout de 10s).
 */
import { createHmac, timingSafeEqual } from 'crypto'
import { admin } from './_supabaseAdmin.js'
import { encrypt, hashParaLookup } from './_crypto.js'
import { normalizarTelefone } from './_telefone.js'
import { CONTEXTO_PII_LEAD } from './_pii-contexto.js'
import { receberWebhook } from './_whatsapp-provider.js'
import { processarMensagemBot } from './_whatsapp-bot.js'

export const config = { api: { bodyParser: false } }

async function lerRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

/** Verifica X-Hub-Signature-256 (HMAC-SHA256 do corpo cru com o App Secret). */
function assinaturaValida(rawBody, header) {
  if (!header || !header.startsWith('sha256=')) return false
  const esperado = createHmac('sha256', process.env.META_APP_SECRET).update(rawBody).digest()
  let recebido
  try { recebido = Buffer.from(header.slice('sha256='.length), 'hex') }
  catch { return false }
  if (esperado.length !== recebido.length) return false
  return timingSafeEqual(esperado, recebido)
}

function sanitizarHeaders(headers) {
  const limpo = { ...headers }
  delete limpo.authorization
  delete limpo['x-api-key']
  delete limpo.cookie
  return limpo
}

/** Comparação constant-time — evita vazar por timing quantos chars do token bateram. */
function tokenValido(recebido, esperado) {
  if (typeof recebido !== 'string' || !esperado) return false
  const bufRecebido = Buffer.from(recebido)
  const bufEsperado = Buffer.from(esperado)
  if (bufRecebido.length !== bufEsperado.length) return false
  return timingSafeEqual(bufRecebido, bufEsperado)
}

function handleVerificacao(req, res) {
  const modo = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  if (modo === 'subscribe' && tokenValido(token, process.env.WHATSAPP_VERIFY_TOKEN)) {
    return res.status(200).send(challenge)
  }
  return res.status(403).send('Forbidden')
}

/**
 * Localiza o lead pelo hash do telefone ou cria um novo, com nome de perfil
 * se disponível. Usa INSERT ... ON CONFLICT DO NOTHING (via upsert +
 * ignoreDuplicates) em vez de check-then-insert — duas mensagens quase
 * simultâneas do mesmo número não criam dois leads (leads_telefone_hash_key
 * é único, ver migration 20260821120000).
 */
async function localizarOuCriarLead(msg) {
  const e164 = normalizarTelefone(msg.numero)
  const hash = hashParaLookup(e164)

  const { data: criado, error: erroInsert } = await admin
    .from('leads')
    .upsert({
      nome_encrypted: msg.nomePerfil ? encrypt(msg.nomePerfil, CONTEXTO_PII_LEAD.nome) : null,
      telefone_encrypted: encrypt(e164, CONTEXTO_PII_LEAD.telefone),
      telefone_hash: hash,
      plataforma_origem: 'whatsapp',
      status: 'novo',
      source: 'whatsapp',
    }, { onConflict: 'telefone_hash', ignoreDuplicates: true })
    .select('id, status, veiculo_id, responsavel_id')
    .maybeSingle()
  if (erroInsert) throw erroInsert
  if (criado) return criado

  // Já existia, ou perdeu a corrida de criação pra outra mensagem concorrente.
  const { data: existente, error: erroSelect } = await admin
    .from('leads')
    .select('id, status, veiculo_id, responsavel_id')
    .eq('telefone_hash', hash)
    .single()
  if (erroSelect) throw erroSelect
  return existente
}

/** Localiza a thread pelo número ou cria uma nova, atualizando o timestamp de última recebida. */
async function localizarOuCriarThread(lead, msg) {
  const { data: existente } = await admin
    .from('whatsapp_threads')
    .select('id, bot_estado, bot_pergunta_atual, bot_respostas, bot_tentativas_invalidas')
    .eq('numero_whatsapp', msg.numero)
    .maybeSingle()

  if (existente) {
    await admin.from('whatsapp_threads')
      .update({ ultima_mensagem_em: msg.timestamp, ultima_mensagem_recebida_em: msg.timestamp })
      .eq('id', existente.id)
    return existente
  }

  const { data: nova, error } = await admin
    .from('whatsapp_threads')
    .insert({
      lead_id: lead.id, numero_whatsapp: msg.numero,
      ultima_mensagem_em: msg.timestamp, ultima_mensagem_recebida_em: msg.timestamp,
    })
    .select('id, bot_estado, bot_pergunta_atual, bot_respostas, bot_tentativas_invalidas')
    .single()
  if (error) throw error
  return nova
}

/** Grava o evento bruto pra idempotência. Retorna false se já foi visto (entrega repetida da Meta). */
async function registrarEventoBruto(msg, headers) {
  const { error } = await admin.from('raw_webhook_events').insert({
    provider: 'whatsapp', payload: msg, headers: sanitizarHeaders(headers), external_id: msg.externalId,
  })
  if (!error) return true
  if (error.code === '23505') return false // já processado — índice único (provider, external_id)
  throw error
}

async function processarMensagem(msg, headers) {
  const novo = await registrarEventoBruto(msg, headers)
  if (!novo) return

  const lead = await localizarOuCriarLead(msg)
  const threadState = await localizarOuCriarThread(lead, msg)

  await admin.from('leads_atividades').insert({
    lead_id: lead.id, canal: 'whatsapp', tipo: 'mensagem_recebida', usuario_id: null, descricao: msg.texto,
  })

  if (threadState.bot_estado === 'coletando') {
    await processarMensagemBot({ lead, threadState, numero: msg.numero, texto: msg.texto })
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleVerificacao(req, res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rawBody = await lerRawBody(req)
  if (!assinaturaValida(rawBody, req.headers['x-hub-signature-256'])) {
    return res.status(401).json({ error: 'Assinatura inválida' })
  }

  let payload
  try { payload = JSON.parse(rawBody.toString('utf8')) }
  catch { return res.status(400).json({ error: 'JSON inválido' }) }

  const mensagens = receberWebhook(payload)
  for (const msg of mensagens) {
    try {
      await processarMensagem(msg, req.headers)
    } catch (err) {
      console.log(JSON.stringify({ event: 'whatsapp_webhook_error', externalId: msg.externalId, error: String(err) }))
    }
  }

  return res.status(200).json({ success: true })
}
