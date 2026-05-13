/**
 * Vercel Serverless Function — proxy autenticado para ML API GET requests.
 * Necessário porque o browser bloqueia chamadas cross-origin com Bearer token.
 *
 * POST /api/ml-api
 * Body: { path, access_token }
 */

const ML_BASE = 'https://api.mercadolibre.com'

const PATHS_PERMITIDOS = ['/sites/', '/categories/', '/users/', '/items/']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { path, access_token } = req.body || {}
  if (!path || !access_token) {
    return res.status(400).json({ error: 'path e access_token são obrigatórios' })
  }

  if (!PATHS_PERMITIDOS.some(p => path.startsWith(p))) {
    return res.status(403).json({ error: `Path não permitido: ${path}` })
  }

  try {
    const mlRes = await fetch(`${ML_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept:        'application/json',
      },
    })
    const json = await mlRes.json().catch(() => ({}))
    if (!mlRes.ok) {
      return res.status(mlRes.status).json({
        error: json.message || json.error || `ML API error ${mlRes.status}`,
      })
    }
    return res.status(200).json(json)
  } catch (e) {
    return res.status(500).json({ error: `Erro interno: ${e.message}` })
  }
}
