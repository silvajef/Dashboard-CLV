/**
 * Registra o webhook de leads no OLX Autoservice e persiste o hash do
 * token gerado em `integracoes` (nunca o token em claro — ver
 * webhook_token_hash, validado no lookup de api/olx-webhook.js). Diferente
 * da versão anterior: o access_token do OLX nunca vem do body do cliente —
 * é resolvido aqui via carregarTokenValido (mesmo guard de qualquer outra
 * ação privilegiada de anúncios).
 *
 * POST /api/anuncios-olx-configurar-leads
 */
import { guard, exigirPapel } from '../_guard.js'
import { hashParaLookup } from '../_crypto.js'
import { carregarTokenValido } from '../_anuncios.js'

const OLX_AUTOSERVICE = 'https://apps.olx.com.br/autoservice/v1'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const g = await guard(req)
  if (!g.ok) return res.status(g.status).json({ error: g.error })
  const { userId, admin } = g
  if (!(await exigirPapel(admin, userId, ['admin', 'operador']))) {
    return res.status(403).json({ error: 'Ação restrita a admin/operador' })
  }

  if (!process.env.APP_PUBLIC_URL) {
    return res.status(500).json({ error: 'APP_PUBLIC_URL não configurada no servidor (Vercel) — necessária para registrar o webhook na OLX com segurança.' })
  }

  try {
    const { accessToken } = await carregarTokenValido(admin, userId, 'olx')

    const webhookToken = crypto.randomUUID()
    // URL fixa por env var, NUNCA derivada de req.headers.host — um Host
    // forjado faria a OLX passar a mandar leads (nome/telefone/email) pra
    // um domínio arbitrário (achado do security-reviewer, 2026-08-31).
    const webhookUrl = `${process.env.APP_PUBLIC_URL}/api/olx-webhook`

    const olxRes = await fetch(`${OLX_AUTOSERVICE}/lead`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: webhookUrl, token: webhookToken }),
    })
    const json = await olxRes.json().catch(() => ({}))
    if (!olxRes.ok) {
      return res.status(502).json({ error: json.message || json.error || `OLX autoservice retornou ${olxRes.status}` })
    }

    const { error } = await admin.from('integracoes').update({
      webhook_token_hash:  hashParaLookup(webhookToken),
      webhook_config_id:   json.id || null,
      webhook_configurado: true,
      updated_at:          new Date().toISOString(),
    }).eq('user_id', userId).eq('plataforma', 'olx')
    if (error) throw error

    return res.status(200).json({ configurado: true })
  } catch (e) {
    return res.status(502).json({ error: `Falha ao configurar leads OLX: ${e.message}` })
  }
}
