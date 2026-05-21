// Vercel serverless proxy para FIPE API v2.
// Chamado como /api/fipe?p=cars/brands — query param evita problemas de catch-all routing.
export default async function handler(req, res) {
  const p = req.query.p
  if (!p) {
    res.status(400).json({ error: 'Missing path parameter p' })
    return
  }

  const url = `https://fipe.parallelum.com.br/api/v2/${p}`

  let upstream
  try {
    upstream = await fetch(url, {
      headers: {
        'X-Subscription-Token': process.env.FIPE_TOKEN || '',
        Accept: 'application/json',
      },
    })
  } catch (err) {
    res.status(502).json({ error: 'FIPE upstream unavailable', detail: err.message })
    return
  }

  const ct = upstream.headers.get('content-type') || ''
  if (!ct.includes('json')) {
    res.status(upstream.status).json({ error: 'Serviço FIPE indisponível.' })
    return
  }

  const body = await upstream.json()
  res.status(upstream.status).json(body)
}
