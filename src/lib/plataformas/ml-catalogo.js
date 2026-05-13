/**
 * Descoberta dinâmica de categoria e atributos do Mercado Livre.
 * Nunca usa hardcode de category_id ou atributos — conforme guidelines.
 *
 * Cache em localStorage com TTL de 24h para reduzir chamadas à API.
 */

const CACHE_TTL = 24 * 60 * 60 * 1000

function cacheGet(key) {
  try {
    const raw  = localStorage.getItem(`ml_cat_${key}`)
    if (!raw) return null
    const item = JSON.parse(raw)
    if (Date.now() - item.ts > CACHE_TTL) {
      localStorage.removeItem(`ml_cat_${key}`)
      return null
    }
    return item.data
  } catch {
    return null
  }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(`ml_cat_${key}`, JSON.stringify({ ts: Date.now(), data }))
  } catch {}
}

async function mlProxy(path, accessToken) {
  const res  = await fetch('/api/ml-api', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ path, access_token: accessToken }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `ML API error ${res.status}`)
  return json
}

/**
 * Descobre category_id e domain_id para um título de veículo via ML domain_discovery.
 *
 * descobrirCategoria('Toyota Corolla XEi 2020', token)
 * → { category_id: 'MLB1744', domain_id: 'CARS_AND_TRUCKS', ... }
 *
 * @param {string} titulo
 * @param {string} accessToken
 * @returns {Promise<{ category_id: string, domain_id: string } | null>}
 */
export async function descobrirCategoria(titulo, accessToken) {
  const key    = `cat_${titulo.toLowerCase().replace(/\s+/g, '_').slice(0, 60)}`
  const cached = cacheGet(key)
  if (cached) return cached

  const data      = await mlProxy(
    `/sites/MLB/domain_discovery/search?q=${encodeURIComponent(titulo)}`,
    accessToken,
  )
  const resultado = Array.isArray(data) ? data[0] : null
  if (resultado) cacheSet(key, resultado)
  return resultado
}

/**
 * Busca atributos relevantes de uma categoria ML.
 * Filtra para: required, catalog_required ou relevance=1.
 *
 * @param {string} categoryId
 * @param {string} accessToken
 * @returns {Promise<import('./types.js').AtributoML[]>}
 */
export async function buscarAtributos(categoryId, accessToken) {
  const key    = `attr_${categoryId}`
  const cached = cacheGet(key)
  if (cached) return cached

  const todos     = await mlProxy(`/categories/${categoryId}/attributes`, accessToken)
  const relevantes = (Array.isArray(todos) ? todos : []).filter(
    a => a.tags?.required || a.tags?.catalog_required || a.relevance === 1,
  )
  cacheSet(key, relevantes)
  return relevantes
}

/**
 * Pré-preenche atributos ML com dados do veículo.
 * Para atributos com allowed_values, tenta match case-insensitive;
 * sem match não preenche para forçar o usuário a selecionar um valor válido.
 *
 * @param {import('./types.js').AtributoML[]} atributos
 * @param {Object} veiculo
 * @returns {Object} { [attrId]: { value_id?: string, value_name: string } }
 */
export function preFillAtributos(atributos, veiculo) {
  const anoNum = parseInt(veiculo.ano_modelo) || ''
  const mapa   = {
    BRAND:        veiculo.marca_nome  || '',
    MODEL:        veiculo.modelo_nome || '',
    TRIM:         veiculo.modelo_nome || '',
    VEHICLE_YEAR: anoNum ? String(anoNum) : '',
    KILOMETERS:   veiculo.km    ? String(veiculo.km) : '',
    FUEL_TYPE:    veiculo.combustivel || '',
    COLOR:        veiculo.cor         || '',
  }

  const resultado = {}
  atributos.forEach(attr => {
    const texto = mapa[attr.id]
    if (!texto) return

    if (attr.allowed_values?.length > 0) {
      const match = attr.allowed_values.find(
        v => v.name.toLowerCase() === texto.toLowerCase(),
      )
      if (match) resultado[attr.id] = { value_id: match.id, value_name: match.name }
    } else {
      resultado[attr.id] = { value_name: String(texto) }
    }
  })

  return resultado
}
