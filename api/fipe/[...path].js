// Vercel serverless proxy — injects X-Subscription-Token and forwards to fipe.parallelum.com.br/api/v2
export default async function handler(req, res) {
  // Strip /api/fipe prefix to get the downstream path
  const downstream = req.url.replace(/^\/api\/fipe\/?/, '')
  const url = `https://fipe.parallelum.com.br/api/v2/${downstream}`

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
