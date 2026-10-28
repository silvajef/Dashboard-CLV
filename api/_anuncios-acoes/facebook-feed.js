/**
 * Feed de catálogo automotivo pro Meta Commerce Manager consumir
 * periodicamente. Público (a Meta não manda Bearer token de usuário), mas
 * exige ?token= — validado contra feed_token_enc cifrado em `integracoes`.
 *
 * ⚠️ Os nomes/estrutura de campo XML abaixo são um MELHOR ESFORÇO baseado em
 * documentação pública genérica de feed automotivo — a Meta não publica um
 * XSD estável e a pesquisa feita durante o design desta feature não
 * conseguiu confirmar o formato exato aceito hoje pelo Commerce Manager
 * (ver docs/runbook-credenciais-anuncios.md). Antes de usar em produção,
 * baixe o template de feed automotivo direto do Commerce Manager
 * (Catálogo → Inventário automotivo → Configurações do feed → Baixar
 * modelo) e ajuste os nomes de campo aqui se divergirem.
 *
 * Sincroniza `anuncios` a cada leitura: veículos fora do status
 * pronto/em_venda saem do feed E têm o anúncio facebook marcado como
 * encerrado — não depende de ação manual (diferente de ML/OLX).
 *
 * GET /api/anuncios-facebook-feed?token=...
 */
import { timingSafeEqual } from 'crypto'
import { admin } from '../_supabaseAdmin.js'
import { decrypt } from '../_crypto.js'
import { contextoIntegracao } from '../_anuncios-contexto.js'

const STATUS_PUBLICAVEL = ['pronto', 'em_venda']

function tokenBate(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

async function tokenValido(tokenRecebido) {
  if (!tokenRecebido) return false
  const { data: rows } = await admin
    .from('integracoes')
    .select('feed_token_enc')
    .eq('plataforma', 'facebook')
    .not('feed_token_enc', 'is', null)
  for (const row of rows || []) {
    try {
      if (tokenBate(decrypt(row.feed_token_enc, contextoIntegracao('facebook', 'feed_token')), tokenRecebido)) return true
    } catch { /* blob de outro contexto/corrompido — ignora e testa o próximo */ }
  }
  return false
}

function escaparXml(valor) {
  return String(valor ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))
}

function itemXml(v) {
  const titulo = [v.marca_nome, v.modelo_nome || v.modelo, v.ano_modelo].filter(Boolean).join(' ').trim()
  const preco  = v.valor_anuncio || v.valor_fipe || 0
  return `  <vehicle>
    <vehicle_id>${escaparXml(v.id)}</vehicle_id>
    <title>${escaparXml(titulo)}</title>
    <description>${escaparXml(v.obs || titulo)}</description>
    <availability>available</availability>
    <condition>used</condition>
    <price>${Math.round(preco * 100)} BRL</price>
    <make>${escaparXml(v.marca_nome)}</make>
    <model>${escaparXml(v.modelo_nome || v.modelo)}</model>
    <year>${escaparXml(v.ano_modelo)}</year>
    <mileage>${escaparXml(v.km)} KM</mileage>
    <exterior_color>${escaparXml(v.cor)}</exterior_color>
    <fuel_type>${escaparXml(v.combustivel || '')}</fuel_type>
${(v.fotos || []).slice(0, 1).map(url => `    <image_link>${escaparXml(url)}</image_link>`).join('\n')}
  </vehicle>`
}

/** Marca 'encerrado' os anúncios facebook de veículos que saíram do feed. */
async function sincronizarAnuncios(veiculosNoFeed) {
  const idsNoFeed = veiculosNoFeed.map(v => v.id)

  await admin.from('anuncios')
    .update({ status: 'encerrado', atualizado_em: new Date().toISOString() })
    .eq('plataforma', 'facebook').eq('status', 'ativo')
    .not('veiculo_id', 'in', `(${idsNoFeed.join(',') || 0})`)

  for (const v of veiculosNoFeed) {
    const titulo = [v.marca_nome, v.modelo_nome || v.modelo, v.ano_modelo].filter(Boolean).join(' ').trim()
    await admin.from('anuncios').upsert({
      veiculo_id: v.id, plataforma: 'facebook', listing_id: String(v.id),
      status: 'ativo', preco_anunciado: v.valor_anuncio || v.valor_fipe || null, titulo,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'veiculo_id,plataforma' })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed')

  const ok = await tokenValido(req.query.token)
  if (!ok) return res.status(401).send('Token inválido')

  const { data: veiculos, error } = await admin
    .from('veiculos')
    .select('id, marca_nome, modelo_nome, modelo, ano_modelo, km, cor, combustivel, obs, valor_anuncio, valor_fipe, fotos, status')
    .in('status', STATUS_PUBLICAVEL)
  if (error) return res.status(500).send('Falha ao carregar estoque')

  sincronizarAnuncios(veiculos).catch(e => console.log(JSON.stringify({ event: 'facebook_feed_sync_error', error: String(e) })))

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<vehicles>\n${veiculos.map(itemXml).join('\n')}\n</vehicles>\n`
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=1800')
  return res.status(200).send(xml)
}
