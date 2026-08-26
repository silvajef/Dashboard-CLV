/**
 * Envia uma resposta humana pelo WhatsApp do lead. Usado pelo Dashboard
 * quando o bot já entregou a conversa pro vendedor — nunca depende do app
 * de celular do vendedor, garantindo histórico completo em leads_atividades.
 */
import { guard } from './_guard.js'
import { admin } from './_supabaseAdmin.js'
import { enviarMensagem } from './_whatsapp-provider.js'

const LIMITE_TEXTO = 4096
const JANELA_24H_MS = 24 * 60 * 60 * 1000

/** @returns {{ valor: { leadId: number|string, texto: string } }|{ erro: string }} */
function validar(body) {
  if (!body || typeof body !== 'object') return { erro: `body inválido: esperado objeto, recebi ${typeof body}` }
  const { leadId, texto } = body
  if (leadId === undefined || leadId === null) return { erro: `campo "leadId" obrigatório, recebi ${JSON.stringify(leadId)}` }
  if (typeof texto !== 'string' || !texto.trim()) return { erro: `campo "texto" obrigatório (string não vazia), recebi ${JSON.stringify(texto)}` }
  if (texto.length > LIMITE_TEXTO) return { erro: `campo "texto" excede ${LIMITE_TEXTO} chars, recebi ${texto.length}` }
  return { valor: { leadId, texto: texto.trim() } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const g = await guard(req)
  if (!g.ok) return res.status(g.status).json({ error: g.error })

  const parsed = validar(req.body)
  if ('erro' in parsed) return res.status(400).json({ error: parsed.erro })
  const { leadId, texto } = parsed.valor

  res.setHeader('Cache-Control', 'no-store')

  const { data: thread, error: erroThread } = await admin
    .from('whatsapp_threads')
    .select('id, numero_whatsapp, ultima_mensagem_recebida_em')
    .eq('lead_id', leadId)
    .maybeSingle()
  if (erroThread || !thread) {
    return res.status(404).json({ error: 'Nenhuma conversa de WhatsApp encontrada pra esse lead' })
  }

  const ultimaRecebida = thread.ultima_mensagem_recebida_em ? new Date(thread.ultima_mensagem_recebida_em).getTime() : 0
  if (Date.now() - ultimaRecebida > JANELA_24H_MS) {
    return res.status(400).json({ error: 'Fora da janela de 24h da Meta — precisa de um template aprovado pra reabrir a conversa (ainda não implementado)' })
  }

  try {
    await enviarMensagem(thread.numero_whatsapp, texto)
  } catch {
    return res.status(502).json({ error: 'Falha ao enviar mensagem no WhatsApp' })
  }

  await admin.from('leads_atividades').insert({
    lead_id: leadId, canal: 'whatsapp', tipo: 'mensagem_enviada', usuario_id: g.userId, descricao: texto,
  })
  await admin.from('whatsapp_threads').update({ ultima_mensagem_em: new Date().toISOString() }).eq('id', thread.id)

  return res.status(200).json({ success: true })
}
