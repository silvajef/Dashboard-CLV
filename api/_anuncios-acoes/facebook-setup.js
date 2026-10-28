/**
 * Gera o token do feed de catálogo do Facebook e marca a verificação de
 * revendedor como concluída. Diferente de ML/OLX: não é OAuth — o
 * feed_token é gerado por nós (não pela Meta) e serve só pra autenticar
 * quem lê api/anuncios-facebook-feed.js. Cifrado em repouso mesmo assim
 * (é reversível de propósito — a UI mostra a URL completa de novo em
 * api/anuncios-status.js, não é um segredo de conta como o OAuth do ML/OLX).
 *
 * POST /api/anuncios-facebook-setup
 * Body: { acao: 'gerar_token' | 'confirmar_verificacao' }
 */
import { guard, exigirPapel } from '../_guard.js'
import { encrypt } from '../_crypto.js'
import { contextoIntegracao } from '../_anuncios-contexto.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const g = await guard(req)
  if (!g.ok) return res.status(g.status).json({ error: g.error })
  const { userId, admin } = g
  if (!(await exigirPapel(admin, userId, ['admin', 'operador']))) {
    return res.status(403).json({ error: 'Ação restrita a admin/operador' })
  }

  const acao = req.body?.acao
  if (acao !== 'gerar_token' && acao !== 'confirmar_verificacao') {
    return res.status(400).json({ error: `campo "acao" deve ser "gerar_token" ou "confirmar_verificacao", recebi ${JSON.stringify(acao)}` })
  }

  try {
    if (acao === 'gerar_token') {
      const feedToken = crypto.randomUUID()
      const { error } = await admin.from('integracoes').upsert({
        user_id: userId, plataforma: 'facebook',
        feed_token_enc: encrypt(feedToken, contextoIntegracao('facebook', 'feed_token')),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,plataforma' })
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    const { error } = await admin.from('integracoes')
      .update({ verificado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', userId).eq('plataforma', 'facebook')
    if (error) throw error
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: `Falha ao configurar Facebook: ${e.message}` })
  }
}
