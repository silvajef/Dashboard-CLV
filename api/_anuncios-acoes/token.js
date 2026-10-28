/**
 * Troca o authorization code (ML/OLX) por tokens — SERVER-SIDE, e devolve
 * ao browser só o status da conexão, NUNCA os tokens. Corrige o antipadrão
 * do antigo api/ml-token.js (que devolvia access_token/refresh_token ao
 * cliente) — ver skill oauth-integrations.
 *
 * POST /api/anuncios-token
 * Body: { code, redirect_uri, plataforma: 'mercadolivre'|'olx' }
 * Response: { conectado: true, expires_at } — sem tokens.
 */
import { guard, exigirPapel } from '../_guard.js'
import { encrypt } from '../_crypto.js'
import { contextoIntegracao } from '../_anuncios-contexto.js'
import { resolverAdaptador } from '../_anuncios.js'

const PLATAFORMAS_OAUTH = ['mercadolivre', 'olx']

/** @returns {{ valor: object }|{ erro: string }} */
function validar(body) {
  if (!body || typeof body !== 'object') return { erro: `body inválido: esperado objeto, recebi ${typeof body}` }
  const { code, redirect_uri, plataforma } = body
  if (!code || typeof code !== 'string') return { erro: `campo "code" obrigatório (string), recebi ${JSON.stringify(code)}` }
  if (!redirect_uri || typeof redirect_uri !== 'string') return { erro: `campo "redirect_uri" obrigatório (string), recebi ${JSON.stringify(redirect_uri)}` }
  if (!PLATAFORMAS_OAUTH.includes(plataforma)) return { erro: `campo "plataforma" deve ser um de ${PLATAFORMAS_OAUTH.join('|')}, recebi ${JSON.stringify(plataforma)}` }
  return { valor: { code, redirect_uri, plataforma } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const g = await guard(req)
  if (!g.ok) return res.status(g.status).json({ error: g.error })
  const { userId, admin } = g
  if (!(await exigirPapel(admin, userId, ['admin', 'operador']))) {
    return res.status(403).json({ error: 'Ação restrita a admin/operador' })
  }

  const parsed = validar(req.body)
  if ('erro' in parsed) return res.status(400).json({ error: parsed.erro })
  const { code, redirect_uri, plataforma } = parsed.valor

  res.setHeader('Cache-Control', 'no-store')

  try {
    const adaptador = resolverAdaptador(plataforma)
    const tokens     = await adaptador.trocarCodigoPorToken(code, redirect_uri)
    const expiresAt  = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // OLX não retorna expires_in — 24h assumido

    const payload = {
      user_id:          userId,
      plataforma,
      access_token_enc: encrypt(tokens.access_token, contextoIntegracao(plataforma, 'access_token')),
      expires_at:       expiresAt,
      updated_at:       new Date().toISOString(),
    }
    if (tokens.refresh_token) {
      payload.refresh_token_enc = encrypt(tokens.refresh_token, contextoIntegracao(plataforma, 'refresh_token'))
    }

    const { error } = await admin.from('integracoes').upsert(payload, { onConflict: 'user_id,plataforma' })
    if (error) throw error

    return res.status(200).json({ conectado: true, expires_at: expiresAt })
  } catch (e) {
    return res.status(502).json({ error: `Falha ao conectar ${plataforma}: ${e.message}` })
  }
}
