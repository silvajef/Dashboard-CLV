// Vercel serverless proxy — injects X-Subscription-Token and forwards to fipe.parallelum.com.br/api/v2
// Uses req.query.path (catch-all segments array) for reliable path extraction.
export default async function handler(req, res) {
  // Vercel catch-all: req.query.path is an array of segments, e.g. ['cars','brands','1','models']
  const segments = req.query.path
  const downstream = Array.isArray(segments) ? segments.join('/') : (segments || '')

  if (!downstream) {
    res.status(400).json({ error: 'No FIPE path provided' })
    return
  }

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
