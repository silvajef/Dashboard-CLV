/**
 * Adaptador Mercado Livre — SERVER-ONLY. Troca de token e chamadas à API
 * usam client_secret (process.env.ML_CLIENT_SECRET, sem prefixo VITE_) —
 * nunca importar este módulo de código que roda no browser (Vite bundlaria
 * o segredo). A parte client-safe (construirUrlAutenticacao, só client_id
 * público) vive em src/lib/plataformas/mercadolivre.js.
 *
 * Docs: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
 */

const ML_BASE       = 'https://api.mercadolibre.com'
const ML_TOKEN_URL  = `${ML_BASE}/oauth/token`
const ML_CLIENT_ID     = process.env.ML_CLIENT_ID
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET

function exigirCredenciais() {
  if (!ML_CLIENT_ID || !ML_CLIENT_SECRET) {
    throw new Error('ML_CLIENT_ID/ML_CLIENT_SECRET ausentes no ambiente do servidor (Vercel).')
  }
}

/**
 * Troca o authorization code por access_token + refresh_token.
 * @param {string} code
 * @param {string} redirectUri
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number }>}
 */
export async function trocarCodigoPorToken(code, redirectUri) {
  exigirCredenciais()
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     ML_CLIENT_ID,
    client_secret: ML_CLIENT_SECRET,
    code,
    redirect_uri:  redirectUri,
  })
  const res  = await fetch(ML_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`ML token error ${res.status}: ${json.message || json.error || JSON.stringify(json)}`)
  return json
}

/**
 * Troca o refresh_token por um novo access_token. Chamado pelo
 * tokenValido() de api/_anuncios.js quando faltar pouco pra expirar.
 * @param {string} refreshToken
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number }>}
 */
export async function renovarToken(refreshToken) {
  exigirCredenciais()
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     ML_CLIENT_ID,
    client_secret: ML_CLIENT_SECRET,
    refresh_token: refreshToken,
  })
  const res  = await fetch(ML_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`ML refresh error ${res.status}: ${json.message || json.error || JSON.stringify(json)}`)
  return json
}

async function mlFetch(accessToken, path, options = {}) {
  const res = await fetch(`${ML_BASE}${path}`, {
    ...options,
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`ML API ${path} retornou ${res.status}: ${json.message || JSON.stringify(json)}`)
  return json
}

/**
 * Publica um veículo como anúncio classificado no ML.
 * @param {string} accessToken
 * @param {Object} veiculo
 * @param {{ preco: number, fotos?: string[], listing_type_id?: string, category_id: string, atributos?: object[] }} dados
 * @returns {Promise<{ listing_id: string, url: string }>}
 */
export async function publicarAnuncio(accessToken, veiculo, dados) {
  const titulo = [veiculo.marca_nome, veiculo.modelo_nome || veiculo.modelo, veiculo.ano_modelo]
    .filter(Boolean).join(' ').trim()

  const body = {
    title:              titulo,
    category_id:        dados.category_id,
    price:              dados.preco,
    currency_id:        'BRL',
    available_quantity: 1,
    buying_mode:        'classified',
    listing_type_id:    dados.listing_type_id || 'gold_special',
    condition:          'used',
    description:        { plain_text: veiculo.obs || `${titulo} — ${veiculo.km || 0} km` },
    pictures:           (dados.fotos || []).map(url => ({ source: url })),
    attributes:         dados.atributos || [],
  }

  const res = await mlFetch(accessToken, '/items', { method: 'POST', body: JSON.stringify(body) })
  return { listing_id: res.id, url: res.permalink }
}

/** @param {string} accessToken @param {string} listingId @param {{ preco?: number, titulo?: string }} dados */
export function atualizarAnuncio(accessToken, listingId, dados) {
  const body = {}
  if (dados.preco  != null) body.price = dados.preco
  if (dados.titulo != null) body.title = dados.titulo
  return mlFetch(accessToken, `/items/${listingId}`, { method: 'PUT', body: JSON.stringify(body) })
}

export function pausarAnuncio(accessToken, listingId) {
  return mlFetch(accessToken, `/items/${listingId}`, { method: 'PUT', body: JSON.stringify({ status: 'paused' }) })
}

export function reativarAnuncio(accessToken, listingId) {
  return mlFetch(accessToken, `/items/${listingId}`, { method: 'PUT', body: JSON.stringify({ status: 'active' }) })
}

export function fecharAnuncio(accessToken, listingId) {
  return mlFetch(accessToken, `/items/${listingId}`, { method: 'PUT', body: JSON.stringify({ status: 'closed' }) })
}

/**
 * Busca uma pergunta específica do ML pelo id — usada pelo webhook de
 * notificação (api/_anuncios-acoes/ml-webhook.js) para buscar o conteúdo real
 * em vez de confiar no corpo da notificação (ML não assina o webhook).
 * @param {string} accessToken
 * @param {string|number} questionId
 */
export function buscarPergunta(accessToken, questionId) {
  return mlFetch(accessToken, `/questions/${questionId}`)
}
