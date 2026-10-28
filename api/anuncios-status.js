/**
 * Status de conexão por plataforma — nunca devolve access_token/
 * refresh_token, só o suficiente pra UI (Configuracoes.jsx) mostrar
 * conectado/expirado. Exceção: o feed_token do Facebook é devolvido em
 * claro de propósito — não é um segredo de conta como o OAuth do ML/OLX,
 * é um token de leitura pública do catálogo que o usuário precisa colar
 * no Meta Commerce Manager (ver api/anuncios-facebook-feed.js).
 *
 * POST /api/anuncios-status
 * Response: { mercadolivre: {...}, olx: {...}, facebook: {...} }
 */
import { guard } from './_guard.js'
import { decrypt } from './_crypto.js'
import { contextoIntegracao } from './_anuncios-contexto.js'

const PLATAFORMAS = ['mercadolivre', 'olx', 'facebook']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const g = await guard(req)
  if (!g.ok) return res.status(g.status).json({ error: g.error })
  const { userId, admin } = g

  res.setHeader('Cache-Control', 'no-store')

  const { data: rows, error } = await admin
    .from('integracoes')
    .select('plataforma, expires_at, feed_token_enc, verificado_em, webhook_configurado')
    .eq('user_id', userId)
  if (error) return res.status(500).json({ error: 'Falha ao carregar status' })

  const porPlataforma = Object.fromEntries(rows.map(r => [r.plataforma, r]))
  const status = {}

  for (const plataforma of PLATAFORMAS) {
    const row = porPlataforma[plataforma]
    if (!row) { status[plataforma] = { conectado: false }; continue }

    if (plataforma === 'facebook') {
      status[plataforma] = { conectado: !!row.feed_token_enc, verificado: !!row.verificado_em, feed_url: null }
      if (row.feed_token_enc && process.env.APP_PUBLIC_URL) {
        try {
          const token = decrypt(row.feed_token_enc, contextoIntegracao('facebook', 'feed_token'))
          status[plataforma].feed_url = `${process.env.APP_PUBLIC_URL}/api/anuncios-facebook-feed?token=${token}`
        } catch {
          // blob corrompido ou ENCRYPTION_KEY rotacionada — degrada pra null em vez de 500 na rota inteira
        }
      }
      continue
    }

    const expirado = row.expires_at ? new Date(row.expires_at) < new Date() : false
    status[plataforma] = { conectado: true, expirado, expires_at: row.expires_at, webhook_configurado: row.webhook_configurado }
  }

  return res.status(200).json(status)
}
