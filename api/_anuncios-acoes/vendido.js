/**
 * Encerra automaticamente os anúncios ativos/pausados de um veículo quando
 * ele é marcado como vendido — chamado por src/lib/api.js logo após
 * concluirProcessoVenda()/registrarVenda() gravarem veiculos.status='vendido'.
 * Evita o problema de continuar recebendo lead de um carro já vendido em
 * outra plataforma.
 *
 * POST /api/anuncios-vendido
 * Body: { veiculo_id }
 * Response: { resultados: [{ plataforma, ok, erro? }] } — falha por
 * plataforma não bloqueia as demais, fica registrada em
 * anuncios.erro_sincronizacao pra revisão manual.
 */
import { guard, exigirPapel } from '../_guard.js'
import { encerrarAnunciosDoVeiculo } from '../_anuncios.js'

function validar(body) {
  if (!body || typeof body !== 'object') return { erro: `body inválido: esperado objeto, recebi ${typeof body}` }
  const { veiculo_id } = body
  if (!Number.isInteger(veiculo_id)) return { erro: `campo "veiculo_id" deve ser inteiro, recebi ${JSON.stringify(veiculo_id)}` }
  return { valor: { veiculo_id } }
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

  try {
    const resultados = await encerrarAnunciosDoVeiculo(admin, parsed.valor.veiculo_id)
    return res.status(200).json({ resultados })
  } catch (e) {
    return res.status(500).json({ error: `Falha ao encerrar anúncios: ${e.message}` })
  }
}
