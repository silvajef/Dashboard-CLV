/**
 * Webhook de notificações do Mercado Livre (tópico "questions") — vira lead
 * quando um comprador pergunta sobre um anúncio. Diferente do OLX/Meta, o
 * ML NÃO assina o payload da notificação (sem HMAC/token compartilhado) —
 * por isso este handler trata o corpo só como um "avise que há algo novo"
 * e busca o conteúdo real na API do ML com nosso próprio access_token
 * antes de gravar qualquer coisa. Um forjador não consegue injetar dados
 * de lead falsos: o que entra em `leads` vem sempre de uma chamada
 * autenticada nossa, nunca do corpo da notificação.
 *
 * Loja única (ver [[tenancy-model]]): não há múltiplos vendedores ML
 * distintos a desambiguar — usa a integração ML conectada mais recente.
 *
 * POST /api/anuncios-ml-webhook
 * Body (ML): { resource: "/questions/123", topic: "questions", ... }
 */
import { admin } from '../_supabaseAdmin.js'
import { encrypt } from '../_crypto.js'
import { CONTEXTO_PII_LEAD } from '../_pii-contexto.js'
import { carregarIntegracaoQualquerUsuario } from '../_anuncios.js'
import { dentroDoLimitePorChave } from '../_guard.js'

const LIMITE_POR_IP = 30
import { buscarPergunta } from '../_plataformas/mercadolivre.js'

function sanitizarHeaders(headers) {
  const limpo = { ...headers }
  delete limpo.authorization
  delete limpo['x-api-key']
  delete limpo.cookie
  return limpo
}

/** Retorna false se a notificação já foi processada (reenvio do ML). */
async function registrarEventoBruto(body, headers, externalId) {
  const { error } = await admin.from('raw_webhook_events').insert({
    provider: 'mercadolivre', payload: body, headers: sanitizarHeaders(headers), external_id: externalId,
  })
  if (!error) return true
  if (error.code === '23505') return false
  throw error
}

async function processarPergunta(questionId, headers, body) {
  const novo = await registrarEventoBruto(body, headers, String(questionId))
  if (!novo) return

  const { accessToken } = await carregarIntegracaoQualquerUsuario(admin, 'mercadolivre')
  const pergunta = await buscarPergunta(accessToken, questionId)
  if (pergunta.status !== 'UNANSWERED') return

  const { data: anuncio } = await admin
    .from('anuncios')
    .select('veiculo_id')
    .eq('listing_id', String(pergunta.item_id))
    .eq('plataforma', 'mercadolivre')
    .maybeSingle()

  const { data: lead, error } = await admin.from('leads').insert({
    provider: 'mercadolivre',
    plataforma_origem: 'mercadolivre',
    external_id: String(questionId),
    source: 'mercadolivre',
    status: 'novo',
    veiculo_id: anuncio?.veiculo_id || null,
    nome_encrypted: pergunta.from?.nickname ? encrypt(pergunta.from.nickname, CONTEXTO_PII_LEAD.nome) : null,
  }).select('id').single()
  if (error) throw error

  if (pergunta.text) {
    await admin.from('leads_atividades').insert({
      lead_id: lead.id, tipo: 'mensagem_recebida', canal: 'sistema', descricao: pergunta.text,
    })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Sem Bearer (o ML não manda um) — rate-limit por IP evita que o gap de
  // assinatura vire um jeito barato de esgotar nossa cota da API do ML.
  // x-real-ip (setado pela borda da Vercel, não vem do cliente) é preferido;
  // o PRIMEIRO segmento de x-forwarded-for é o que o cliente mandou, logo
  // forjável — usar o último segmento (o hop mais próximo do nosso servidor)
  // como fallback (achado do security-reviewer, 2026-08-31).
  const ip = req.headers['x-real-ip']
    || (req.headers['x-forwarded-for'] || '').split(',').pop().trim()
    || req.socket?.remoteAddress
    || 'desconhecido'
  if (!dentroDoLimitePorChave(`ml-webhook:${ip}`, LIMITE_POR_IP)) {
    return res.status(429).json({ error: 'Limite de requisições excedido' })
  }

  const body = req.body
  if (body?.topic !== 'questions' || !body?.resource) {
    return res.status(200).json({ ignorado: true }) // outros tópicos (orders, items…) — fora de escopo aqui
  }

  // resource não é assinado pelo ML — precisa bater EXATAMENTE com
  // /questions/<dígitos>, senão um "resource" forjado tipo "/x/../orders/1"
  // poderia fazer buscarPergunta() chamar outro endpoint da API do ML com
  // nosso access_token (achado do security-reviewer, 2026-08-31).
  const match = /^\/questions\/(\d+)$/.exec(body.resource)
  if (!match) return res.status(400).json({ error: `resource inválido, esperado /questions/<id>, recebi ${JSON.stringify(body.resource)}` })
  const questionId = match[1]

  // Ack imediato — ML espera 2XX rápido; processamento continua fire-and-forget.
  res.status(200).json({ success: true })
  processarPergunta(questionId, req.headers, body).catch(e =>
    console.log(JSON.stringify({ event: 'ml_webhook_error', questionId, error: String(e) })))
}
