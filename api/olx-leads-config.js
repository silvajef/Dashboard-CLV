/**
 * Vercel Serverless Function — registra webhook de leads no OLX Autoservice.
 * Necessário porque o browser não pode chamar apps.olx.com.br diretamente (CORS).
 *
 * Conforme docs OLX: POST /autoservice/v1/lead aceita apenas { url, token }.
 * O `id` da configuração é RETORNADO pela OLX na resposta (não enviado).
 *
 * POST /api/olx-leads-config
 * Body: { access_token, webhook_url, webhook_token }
 * Retorna: { id, url, token } — o id deve ser persistido para PUT/DELETE futuros
 */

const OLX_AUTOSERVICE = 'https://apps.olx.com.br/autoservice/v1'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { access_token, webhook_url, webhook_token } = req.body || {}

  if (!access_token || !webhook_url || !webhook_token) {
    return res.status(400).json({ error: 'access_token, webhook_url e webhook_token são obrigatórios' })
  }

  try {
    const olxRes = await fetch(`${OLX_AUTOSERVICE}/lead`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      // Conforme docs: payload tem apenas url e token.
      // token é enviado pela OLX no header Authorization ao chamar o webhook.
      body: JSON.stringify({
        url:   webhook_url,
        token: webhook_token,
      }),
    })

    const json = await olxRes.json().catch(() => ({}))

    if (!olxRes.ok) {
      return res.status(olxRes.status).json({
        error: json.message || json.error || `OLX autoservice error ${olxRes.status}`,
      })
    }
    // Retorna { id, url, token } — frontend persiste o id para operações futuras
    return res.status(200).json(json)
  } catch (e) {
    return res.status(500).json({ error: `Erro interno: ${e.message}` })
  }
}
