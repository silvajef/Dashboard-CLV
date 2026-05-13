/**
 * Vercel Serverless Function — proxy para OLX Autoupload API.
 * Roda server-side para evitar CORS.
 *
 * POST /api/olx-import
 * Body: { access_token, ad_list }
 * Response: resposta direta da OLX
 */

const OLX_IMPORT_URL = 'https://apps.olx.com.br/autoupload/import'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { access_token, ad_list } = req.body || {}
  if (!access_token || !ad_list) {
    return res.status(400).json({ error: 'access_token e ad_list são obrigatórios' })
  }

  const olxRes = await fetch(OLX_IMPORT_URL, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ access_token, ad_list }),
  })

  const json = await olxRes.json().catch(() => ({}))

  if (!olxRes.ok) {
    return res.status(olxRes.status).json({
      error: json.message || json.error || `OLX API error ${olxRes.status}`,
    })
  }

  return res.status(200).json(json)
}
