/**
 * Vercel Serverless Function — troca o authorization code do ML por access_token.
 * Roda server-side para evitar CORS e manter o client_secret fora do browser.
 *
 * POST /api/ml-token
 * Body: { code, redirect_uri }
 * Response: { access_token, refresh_token, expires_in, ... }
 */

const ML_TOKEN_URL     = 'https://api.mercadolivre.com/oauth/token'
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
    return res.status(500).json({ error: 'VITE_ML_CLIENT_ID ou VITE_ML_CLIENT_SECRET não configurados no servidor' })
  }

  const credentials = Buffer.from(`${ML_CLIENT_ID}:${ML_CLIENT_SECRET}`).toString('base64')
  const body = new URLSearchParams({
    grant_type:   'authorization_code',
    code,
    redirect_uri,
  })

  const mlRes  = await fetch(ML_TOKEN_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
      'Accept':        'application/json',
    },
    body,
  })

  const json = await mlRes.json().catch(() => ({}))

  if (!mlRes.ok) {
    return res.status(mlRes.status).json({
      error: json.message || json.error || 'Erro ao obter token do ML',
    })
  }

  return res.status(200).json(json)
}
