/**
 * Pausa/reativa/encerra um anúncio existente em ML/OLX. Unificado num só
 * endpoint (em vez de 3 quase-idênticos) porque as três ações compartilham
 * a mesma sequência: carregar anúncio → token válido → chamar adaptador →
 * atualizar status. Facebook não passa por aqui — é feed-driven, ver
 * api/anuncios-facebook-feed.js e api/_anuncios.js#encerrarAnunciosDoVeiculo.
 *
 * POST /api/anuncios-transicao
 * Body: { anuncio_id, acao: 'pausar'|'reativar'|'fechar' }
 */
import { guard, exigirPapel } from '../_guard.js'
import { resolverAdaptador, carregarTokenValido } from '../_anuncios.js'

const ACOES = {
  pausar:   { metodo: 'pausarAnuncio',   status: 'pausado'   },
  reativar: { metodo: 'reativarAnuncio', status: 'ativo'     },
  fechar:   { metodo: 'fecharAnuncio',   status: 'encerrado' },
}

/** @returns {{ valor: object }|{ erro: string }} */
function validar(body) {
  if (!body || typeof body !== 'object') return { erro: `body inválido: esperado objeto, recebi ${typeof body}` }
  const { anuncio_id, acao } = body
  if (!Number.isInteger(anuncio_id)) return { erro: `campo "anuncio_id" deve ser inteiro, recebi ${JSON.stringify(anuncio_id)}` }
  if (!ACOES[acao]) return { erro: `campo "acao" deve ser um de ${Object.keys(ACOES).join('|')}, recebi ${JSON.stringify(acao)}` }
  return { valor: { anuncio_id, acao } }
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
  const { anuncio_id, acao } = parsed.valor

  const { data: anuncio, error: erroAnuncio } = await admin
    .from('anuncios')
    .select('id, veiculo_id, plataforma, listing_id')
    .eq('id', anuncio_id)
    .maybeSingle()
  if (erroAnuncio) return res.status(500).json({ error: 'Falha ao carregar anúncio' })
  if (!anuncio) return res.status(404).json({ error: `anúncio ${anuncio_id} não encontrado` })
  if (anuncio.plataforma === 'facebook') {
    return res.status(409).json({ error: 'Facebook é sincronizado pelo feed automático — não há pausa/reativação manual por item.' })
  }

  const { metodo, status } = ACOES[acao]

  try {
    const adaptador = resolverAdaptador(anuncio.plataforma)
    const { accessToken } = await carregarTokenValido(admin, userId, anuncio.plataforma)
    await adaptador[metodo](accessToken, anuncio.listing_id)

    const { data: atualizado, error } = await admin
      .from('anuncios')
      .update({ status, erro_sincronizacao: null, atualizado_em: new Date().toISOString() })
      .eq('id', anuncio_id)
      .select()
      .single()
    if (error) throw error
    return res.status(200).json(atualizado)
  } catch (e) {
    await admin.from('anuncios').update({ erro_sincronizacao: String(e.message || e), atualizado_em: new Date().toISOString() }).eq('id', anuncio_id)
    return res.status(502).json({ error: `Falha ao ${acao} anúncio em ${anuncio.plataforma}: ${e.message}` })
  }
}
