/**
 * Publica (ou republica) um veículo numa plataforma. Idempotente: chamar
 * duas vezes para o mesmo (veiculo_id, plataforma) atualiza o anúncio
 * existente, nunca cria duplicata (ver api/_anuncios.js#upsertAnuncioIdempotente).
 *
 * POST /api/anuncios-publicar
 * Body: { veiculo_id, plataforma: 'mercadolivre'|'olx', dados: { preco, fotos?, category_id?, listing_type_id?, atributos? } }
 */
import { guard, exigirPapel } from '../_guard.js'
import { resolverAdaptador, carregarTokenValido, upsertAnuncioIdempotente } from '../_anuncios.js'

const STATUS_PUBLICAVEL = ['pronto', 'em_venda']

/** @returns {{ valor: object }|{ erro: string }} */
function validar(body) {
  if (!body || typeof body !== 'object') return { erro: `body inválido: esperado objeto, recebi ${typeof body}` }
  const { veiculo_id, plataforma, dados } = body
  if (!Number.isInteger(veiculo_id)) return { erro: `campo "veiculo_id" deve ser inteiro, recebi ${JSON.stringify(veiculo_id)}` }
  if (typeof plataforma !== 'string' || !plataforma) return { erro: `campo "plataforma" obrigatório (string), recebi ${JSON.stringify(plataforma)}` }
  if (!dados || typeof dados !== 'object' || typeof dados.preco !== 'number' || dados.preco <= 0) {
    return { erro: `campo "dados.preco" deve ser number > 0, recebi ${JSON.stringify(dados?.preco)}` }
  }
  return { valor: { veiculo_id, plataforma, dados } }
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
  const { veiculo_id, plataforma, dados } = parsed.valor

  const { data: veiculo, error: erroVeiculo } = await admin
    .from('veiculos')
    .select('id, placa, modelo, marca_nome, modelo_nome, ano_modelo, km, cor, combustivel, obs, status')
    .eq('id', veiculo_id)
    .maybeSingle()
  if (erroVeiculo) return res.status(500).json({ error: 'Falha ao carregar veículo' })
  if (!veiculo) return res.status(404).json({ error: `veículo ${veiculo_id} não encontrado` })
  if (!STATUS_PUBLICAVEL.includes(veiculo.status)) {
    return res.status(409).json({ error: `veículo com status "${veiculo.status}" não pode ser anunciado (esperado: ${STATUS_PUBLICAVEL.join('|')})` })
  }

  try {
    const adaptador = resolverAdaptador(plataforma)
    const { accessToken } = await carregarTokenValido(admin, userId, plataforma)
    const resultado = await adaptador.publicarAnuncio(accessToken, veiculo, dados)

    const titulo = [veiculo.marca_nome, veiculo.modelo_nome || veiculo.modelo, veiculo.ano_modelo]
      .filter(Boolean).join(' ').trim()

    const anuncio = await upsertAnuncioIdempotente(admin, {
      veiculo_id, plataforma,
      listing_id: resultado.listing_id, url: resultado.url,
      status: 'ativo', preco_anunciado: dados.preco, titulo,
      erro_sincronizacao: null,
    })
    return res.status(200).json(anuncio)
  } catch (e) {
    return res.status(502).json({ error: `Falha ao publicar em ${plataforma}: ${e.message}` })
  }
}
