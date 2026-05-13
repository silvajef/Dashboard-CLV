/**
 * Vercel Serverless Function — registra webhook de leads no OLX Autoservice.
 * Necessário porque o browser não pode chamar apps.olx.com.br diretamente (CORS).
 *
 * POST /api/olx-leads-config
 * Body: { access_token, webhook_url, config_id }
 * Repassa para: POST https://apps.olx.com.br/autoservice/v1/lead
 */

const OLX_AUTOSERVICE = 'https://apps.olx.com.br/autoservice/v1'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { access_token, webhook_url, config_id } = req.body || {}

  if (!access_token || !webhook_url || !config_id) {
    return res.status(400).json({ error: 'access_token, webhook_url e config_id são obrigatórios' })
  }

  // Extrai o token da webhook_url para enviar ao OLX como campo token
  let webhookToken = ''
  try {
    webhookToken = new URL(webhook_url).searchParams.get('token') || ''
  } catch {
    return res.status(400).json({ error: 'webhook_url inválida' })
  }

  try {
    const olxRes = await fetch(`${OLX_AUTOSERVICE}/lead`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id:    config_id,
        url:   webhook_url,
        token: webhookToken,
      }),
    })

    const json = await olxRes.json().catch(() => ({}))

    if (!olxRes.ok) {
      return res.status(olxRes.status).json({
        error: json.message || json.error || `OLX autoservice error ${olxRes.status}`,
      })
    }
    return res.status(200).json(json)
  } catch (e) {
    return res.status(500).json({ error: `Erro interno: ${e.message}` })
  }
}
