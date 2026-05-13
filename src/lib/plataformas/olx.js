/**
 * Adaptador OLX — OAuth Authorization Code Flow + Automotivos API
 * Docs: https://developers.olx.com.br
 *
 * Fluxo: usuário é redirecionado ao OLX → OLX devolve ?code=... na URL →
 * trocarCodigoPorToken troca o code por access_token + refresh_token.
 */

const OLX_AUTH_URL  = 'https://auth.olx.com.br/oauth/authorize'
const OLX_TOKEN_URL = 'https://auth.olx.com.br/oauth/token'
const OLX_API_BASE  = 'https://apps.olx.com.br/automotivos/v1'

const OLX_CLIENT_ID     = import.meta.env.VITE_OLX_CLIENT_ID
const OLX_CLIENT_SECRET = import.meta.env.VITE_OLX_CLIENT_SECRET

/* ── Auth ────────────────────────────────────────────────────────────── */

/**
 * Gera a URL de autenticação OAuth do OLX.
 * Redireciona de volta para redirectUri com ?code=... na query string.
 *
 * construirUrlAutenticacao('https://meusite.com/')
 * → 'https://auth.olx.com.br/oauth/authorize?response_type=code&...'
 *
 * @param {string} redirectUri
 * @returns {string}
 */
export function construirUrlAutenticacao(redirectUri) {
  if (!OLX_CLIENT_ID) {
    throw new Error(
      'VITE_OLX_CLIENT_ID não configurado. ' +
      'Adicione a variável no Vercel (Settings → Environment Variables) e faça um novo deploy.'
    )
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     OLX_CLIENT_ID,
    redirect_uri:  redirectUri,
    scope:         'automotivos',
    state:         crypto.randomUUID(),
  })
  return `${OLX_AUTH_URL}?${params.toString()}`
}

/**
 * Troca o authorization code por access_token + refresh_token.
 *
 * @param {string} code       - valor de ?code= na URL de retorno
 * @param {string} redirectUri - mesma URI usada em construirUrlAutenticacao
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number }>}
 */
export async function trocarCodigoPorToken(code, redirectUri) {
  if (!OLX_CLIENT_SECRET) {
    throw new Error('VITE_OLX_CLIENT_SECRET não configurado.')
  }
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  redirectUri,
    client_id:     OLX_CLIENT_ID,
    client_secret: OLX_CLIENT_SECRET,
  })
  const res  = await fetch(OLX_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`OLX token error ${res.status}: ${json.error_description || JSON.stringify(json)}`)
  }
  return json
}

/**
 * Renova o access_token usando o refresh_token.
 *
 * @param {string} refreshToken
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number }>}
 */
export async function renovarToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
    client_id:     OLX_CLIENT_ID,
    client_secret: OLX_CLIENT_SECRET,
  })
  const res  = await fetch(OLX_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`OLX refresh token error ${res.status}: ${json.error_description || JSON.stringify(json)}`)
  }
  return json
}

/**
 * Extrai o code de retorno OAuth da query string da URL.
 *
 * extrairCodigoDaUrl('https://site.com/?code=abc123&state=xyz')
 * → 'abc123'
 *
 * @param {string} search - window.location.search
 * @returns {string | null}
 */
export function extrairCodigoDaUrl(search) {
  const params = new URLSearchParams(search)
  return params.get('code')
}

/* ── Helper interno ──────────────────────────────────────────────────── */

async function olxFetch(accessToken, path, options = {}) {
  const res  = await fetch(`${OLX_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`OLX API ${path} retornou ${res.status}: ${json.message || JSON.stringify(json)}`)
  }
  return json
}

/* ── API pública ─────────────────────────────────────────────────────── */

/**
 * Publica um veículo como anúncio na OLX.
 * @param {string} accessToken
 * @param {Object} veiculo - registro da tabela veiculos
 * @param {number} preco
 * @returns {Promise<import('./types.js').ResultadoPublicacao>}
 */
export async function publicarAnuncio(accessToken, veiculo, preco) {
  const titulo = [veiculo.marca_nome, veiculo.modelo_nome || veiculo.modelo, veiculo.ano_modelo]
    .filter(Boolean).join(' ').trim()

  const body = {
    subject:     titulo,
    body:        veiculo.obs || `${titulo} — ${veiculo.km || 0} km`,
    price:       preco,
    category:    { id: '2020' }, // Carros, Vans e Utilitários
    params: {
      mileage:         veiculo.km         || 0,
      fuel:            veiculo.combustivel || 'Diesel',
      car_year:        veiculo.ano_modelo  || '',
      gearbox:         veiculo.cambio      || '',
      car_color:       veiculo.cor         || '',
    },
  }

  const res = await olxFetch(accessToken, '/ad', { method: 'POST', body: JSON.stringify(body) })
  return { listing_id: res.ad_id || res.id, url: res.url || '' }
}

/**
 * Atualiza preço e/ou título de um anúncio existente na OLX.
 * @param {string} accessToken
 * @param {string} listingId
 * @param {{ preco?: number, titulo?: string }} dados
 */
export async function atualizarAnuncio(accessToken, listingId, dados) {
  const body = {}
  if (dados.preco  != null) body.price   = dados.preco
  if (dados.titulo != null) body.subject = dados.titulo
  return olxFetch(accessToken, `/ad/${listingId}`, { method: 'PATCH', body: JSON.stringify(body) })
}

/**
 * Pausa um anúncio ativo na OLX.
 * @param {string} accessToken
 * @param {string} listingId
 */
export function pausarAnuncio(accessToken, listingId) {
  return olxFetch(accessToken, `/ad/${listingId}/pause`, { method: 'POST' })
}

/**
 * Reativa um anúncio pausado na OLX.
 * @param {string} accessToken
 * @param {string} listingId
 */
export function reativarAnuncio(accessToken, listingId) {
  return olxFetch(accessToken, `/ad/${listingId}/activate`, { method: 'POST' })
}

/**
 * Encerra (fecha) um anúncio na OLX.
 * @param {string} accessToken
 * @param {string} listingId
 */
export function fecharAnuncio(accessToken, listingId) {
  return olxFetch(accessToken, `/ad/${listingId}`, { method: 'DELETE' })
}

/**
 * Busca leads (mensagens) de um anúncio na OLX.
 * @param {string} accessToken
 * @param {string} listingId
 * @returns {Promise<import('./types.js').LeadExterno[]>}
 */
export async function buscarLeads(accessToken, listingId) {
  const data = await olxFetch(accessToken, `/ad/${listingId}/replies`)
  return (data.replies || []).map(r => ({
    nome:              r.sender_name  || 'Usuário OLX',
    email:             r.sender_email || '',
    telefone:          r.sender_phone || '',
    listing_id:        listingId,
    plataforma_origem: 'olx',
    mensagem:          r.body || '',
  }))
}
