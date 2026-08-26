/**
 * Adaptador da WhatsApp Cloud API (Meta) — server-only. enviarMensagem/
 * receberWebhook isolam o resto do código do formato exato do provedor;
 * trocar de provedor no futuro só toca este arquivo, não o fluxo do bot.
 * Ver docs/CRM_SPEC_CLV_Dashboard.md §3.
 */
import { createHash } from 'crypto'

const GRAPH_BASE = 'https://graph.facebook.com'

function versaoApi() {
  return process.env.META_API_VERSION || 'v21.0'
}

/**
 * Envia uma mensagem de texto livre. Só é aceita pela Meta dentro da janela
 * de 24h desde a última mensagem recebida do lead — fora dela é preciso um
 * template pré-aprovado (não implementado ainda, ver api/whatsapp-send.js).
 * @returns {Promise<{ providerId: string|null }>}
 */
export async function enviarMensagem(numero, texto) {
  const phoneId = process.env.META_PHONE_NUMBER_ID
  const token = process.env.META_ACCESS_TOKEN

  const res = await fetch(`${GRAPH_BASE}/${versaoApi()}/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: numero,
      type: 'text',
      text: { body: texto },
    }),
  })

  if (!res.ok) {
    const detalhe = await res.text().catch(() => '')
    throw new Error(`Falha ao enviar WhatsApp (HTTP ${res.status}): ${detalhe.slice(0, 200)}`)
  }

  const dados = await res.json()
  return { providerId: dados?.messages?.[0]?.id ?? null }
}

/**
 * Normaliza um payload do webhook do Meta (já parseado, com assinatura já
 * verificada em whatsapp-webhook.js) em mensagens de texto recebidas.
 * Um único POST pode trazer várias mensagens (entries/changes/messages) —
 * por isso retorna um array, não uma mensagem única.
 * Ignora: entregas que só carregam status de entrega/leitura (sem
 * `messages`), e mensagens que não são de texto (áudio, imagem, localização
 * etc.) — fora do escopo do bot de triagem, ficam sem resposta automática.
 * @returns {{ numero: string, nomePerfil: string|null, texto: string, timestamp: string, externalId: string }[]}
 */
export function receberWebhook(payload) {
  const mensagens = []
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const valor = change?.value
      const nomesPorNumero = Object.fromEntries(
        (valor?.contacts || []).map(c => [c.wa_id, c.profile?.name || null]),
      )
      for (const msg of valor?.messages || []) {
        if (msg.type !== 'text' || !msg.text?.body) continue
        const timestamp = msg.timestamp
          ? new Date(Number(msg.timestamp) * 1000).toISOString()
          : new Date().toISOString()
        mensagens.push({
          numero: msg.from,
          nomePerfil: nomesPorNumero[msg.from] || null,
          texto: msg.text.body,
          timestamp,
          // A Meta sempre envia `id` (o wamid) em messages[], mas se algum dia
          // vier ausente, cai pra uma chave estável derivada do conteúdo em
          // vez de perder a idempotência silenciosamente (mesmo padrão da
          // skill secure-webhooks: "hash de campos estáveis" como fallback).
          externalId: msg.id || createHash('sha256').update(`${msg.from}|${timestamp}|${msg.text.body}`).digest('hex'),
        })
      }
    }
  }
  return mensagens
}
