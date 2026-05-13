/**
 * Vercel Serverless Function — troca o authorization code do ML por access_token.
 * Roda server-side para evitar CORS e manter o client_secret fora do browser.
 *
 * POST /api/ml-token
 * Body: { code, redirect_uri }
 * Response: { access_token, refresh_token, expires_in, ... }
 */

// domínio global da API ML (mercadolibre.com, não mercadolivre.com)
const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token'
const ML_CLIENT_ID     = process.env.VITE_ML_CLIENT_ID
const ML_CLIENT_SECRET = process.env.VITE_ML_CLIENT_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, redirect_uri } = req.body || {}
  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'code e redirect_uri são obrigatórios' })
  }

  if (!ML_CLIENT_ID || !ML_CLIENT_SECRET) {
    return res.status(500).json({
      error: `Variáveis não configuradas no servidor: ${!ML_CLIENT_ID ? 'VITE_ML_CLIENT_ID ' : ''}${!ML_CLIENT_SECRET ? 'VITE_ML_CLIENT_SECRET' : ''}`.trim(),
    })
  }

  try {
    // ML usa client_id e client_secret como parâmetros no body (não Basic Auth)
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      code,
      redirect_uri,
    })

    const mlRes = await fetch(ML_TOKEN_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept':       'application/json',
      },
      body,
    })

    const json = await mlRes.json().catch(() => ({}))

    if (!mlRes.ok) {
      return res.status(mlRes.status).json({
        error: json.message || json.error || `ML retornou ${mlRes.status}`,
        detail: json,
      })
    }

    return res.status(200).json(json)
  } catch (e) {
    return res.status(500).json({ error: `Erro interno: ${e.message}` })
  }
}
