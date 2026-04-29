/**
 * Dashboard CLV — FIPE Integration
 * API Parallelum v1 — https://parallelum.com.br/fipe/api/v1
 * Limite: 500 req/dia (sem token) | 1000/dia (com token gratuito)
 * Cache in-memory por sessão para economizar requisições
 */
const BASE = 'https://parallelum.com.br/fipe/api/v1'
const _cache = new Map()

async function get(path) {
  if (_cache.has(path)) return _cache.get(path)
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`FIPE ${res.status}`)
  const data = await res.json()
  _cache.set(path, data)
  return data
}

export function tipoFipe(tipo = '') {
  const t = tipo.toLowerCase()
  if (t.includes('caminhão') || t.includes('caminhao')) return 'caminhoes'
  return 'carros'  // vans, pick-ups, micro-ônibus → carros
}

export const getMarcas  = (tipo)                              => get(`/${tipoFipe(tipo)}/marcas`)
export const getModelos = async (tipo, marca)                 => { const d = await get(`/${tipoFipe(tipo)}/marcas/${marca}/modelos`); return d.modelos ?? d }
export const getAnos    = (tipo, marca, modelo)               => get(`/${tipoFipe(tipo)}/marcas/${marca}/modelos/${modelo}/anos`)
export const getPreco   = (tipo, marca, modelo, ano)          => get(`/${tipoFipe(tipo)}/marcas/${marca}/modelos/${modelo}/anos/${ano}`)

export async function getPrecoMaisProximo(tipo, marca, modelo, anoVeiculo) {
  const anos = await getAnos(tipo, marca, modelo)
  if (!anos?.length) return null
  const sorted = [...anos].sort((a, b) =>
    Math.abs(parseInt(a.nome) - anoVeiculo) - Math.abs(parseInt(b.nome) - anoVeiculo)
  )
  return getPreco(tipo, marca, modelo, sorted[0].codigo)
}
