/**
 * Adaptador Mercado Livre — OAuth Authorization Code Flow + Classificados API v1
 * Docs: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
 *
 * Fluxo: usuário autoriza → ML devolve ?code= na URL →
 * trocarCodigoPorToken troca por access_token + refresh_token.
 */

const ML_BASE      = 'https://api.mercadolivre.com'
const ML_AUTH_URL  = 'https://auth.mercadolivre.com.br/authorization'
const ML_TOKEN_URL = 'https://api.mercadolivre.com/oauth/token'

const ML_CLIENT_ID     = import.meta.env.VITE_ML_CLIENT_ID
const ML_CLIENT_SECRET = import.meta.env.VITE_ML_CLIENT_SECRET

// Categoria padrão: Veículos > Caminhões e Utilitários.
const ML_CATEGORIA = import.meta.env.VITE_ML_CATEGORIA || 'MLB271599'

/* ── Auth ────────────────────────────────────────────────────────────── */

/**
 * Gera a URL de autorização OAuth do ML (Authorization Code Flow).
 * O state inclui prefixo "ml:" para identificar a plataforma no callback.
 *
 * construirUrlAutenticacao('https://meusite.com/')
 * → 'https://auth.mercadolivre.com.br/authorization?response_type=code&...'
 *
 * @param {string} redirectUri
 * @returns {string}
 */
export function construirUrlAutenticacao(redirectUri) {
  if (!ML_CLIENT_ID) {
    throw new Error(
      'VITE_ML_CLIENT_ID não configurado. ' +
      'Adicione a variável no Vercel (Settings → Environment Variables) e faça um novo deploy.'
    )
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     ML_CLIENT_ID,
    redirect_uri:  redirectUri,
    state:         `ml:${crypto.randomUUID()}`,
  })
  return `${ML_AUTH_URL}?${params.toString()}`
}

/**
 * Troca o authorization code por access_token + refresh_token.
 *
 * @param {string} code
 * @param {string} redirectUri
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number, user_id: string }>}
 */
export async function trocarCodigoPorToken(code, redirectUri) {
  if (!ML_CLIENT_SECRET) {
    throw new Error('VITE_ML_CLIENT_SECRET não configurado.')
  }
  const credentials = btoa(`${ML_CLIENT_ID}:${ML_CLIENT_SECRET}`)
  const body = new URLSearchParams({
    grant_type:   'authorization_code',
    code,
    redirect_uri: redirectUri,
  })
  const res  = await fetch(ML_TOKEN_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
      'Accept':        'application/json',
    },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`ML token error ${res.status}: ${json.message || JSON.stringify(json)}`)
  }
  return json
}

/* ── Helpers internos ─────────────────────────────────────────────────── */

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
  if (!res.ok) {
    throw new Error(`ML API ${path} retornou ${res.status}: ${json.message || JSON.stringify(json)}`)
  }
  return json
}

function montarAtributosVeiculo(veiculo) {
  return [
    { id: 'VEHICLE_YEAR',             value_name: String(veiculo.ano_modelo || '') },
    { id: 'KILOMETERS',               value_name: String(veiculo.km || 0)          },
    { id: 'FUEL_TYPE',                value_name: veiculo.combustivel || 'Diesel'  },
    { id: 'COLOR',                    value_name: veiculo.cor || ''                },
    { id: 'VEHICLE_PLATE_LAST_DIGIT', value_name: (veiculo.placa || '').slice(-1)  },
  ]
}

/* ── API pública ─────────────────────────────────────────────────────── */

/**
 * Busca o perfil do usuário autenticado no ML.
 * @param {string} accessToken
 */
export function buscarPerfilUsuario(accessToken) {
  return mlFetch(accessToken, '/users/me')
}

/**
 * Publica um veículo como anúncio classificado no ML.
 * @param {string} accessToken
 * @param {Object} veiculo
 * @param {number} preco
 * @returns {Promise<import('./types.js').ResultadoPublicacao>}
 */
export async function publicarAnuncio(accessToken, veiculo, preco) {
  const titulo = [veiculo.marca_nome, veiculo.modelo_nome || veiculo.modelo, veiculo.ano_modelo]
    .filter(Boolean).join(' ').trim()

  const body = {
    title:              titulo,
    category_id:        ML_CATEGORIA,
    price:              preco,
    currency_id:        'BRL',
    available_quantity: 1,
    buying_mode:        'classified',
    listing_type_id:    'gold_special',
    condition:          'used',
    description:        { plain_text: veiculo.obs || `${titulo} — ${veiculo.km || 0} km` },
    attributes:         montarAtributosVeiculo(veiculo),
  }

  const res = await mlFetch(accessToken, '/items', { method: 'POST', body: JSON.stringify(body) })
  return { listing_id: res.id, url: res.permalink }
}

/**
 * Atualiza preço e/ou título de um anúncio existente no ML.
 * @param {string} accessToken
 * @param {string} listingId
 * @param {{ preco?: number, titulo?: string }} dados
 */
export function atualizarAnuncio(accessToken, listingId, dados) {
  const body = {}
  if (dados.preco  != null) body.price = dados.preco
  if (dados.titulo != null) body.title = dados.titulo
  return mlFetch(accessToken, `/items/${listingId}`, { method: 'PUT', body: JSON.stringify(body) })
}

/**
 * Pausa um anúncio ativo no ML.
 * @param {string} accessToken
 * @param {string} listingId
 */
export function pausarAnuncio(accessToken, listingId) {
  return mlFetch(accessToken, `/items/${listingId}`, {
    method: 'PUT', body: JSON.stringify({ status: 'paused' }),
  })
}

/**
 * Reativa um anúncio pausado no ML.
 * @param {string} accessToken
 * @param {string} listingId
 */
export function reativarAnuncio(accessToken, listingId) {
  return mlFetch(accessToken, `/items/${listingId}`, {
    method: 'PUT', body: JSON.stringify({ status: 'active' }),
  })
}

/**
 * Encerra (fecha) um anúncio no ML.
 * @param {string} accessToken
 * @param {string} listingId
 */
export function fecharAnuncio(accessToken, listingId) {
  return mlFetch(accessToken, `/items/${listingId}`, {
    method: 'PUT', body: JSON.stringify({ status: 'closed' }),
  })
}

/**
 * Busca perguntas não respondidas de um anúncio e as converte em leads.
 * @param {string} accessToken
 * @param {string} listingId
 * @returns {Promise<import('./types.js').LeadExterno[]>}
 */
export async function buscarLeads(accessToken, listingId) {
  const data = await mlFetch(
    accessToken,
    `/questions/search?item=${listingId}&status=UNANSWERED`,
  )
  return (data.questions || []).map(q => ({
    nome:              q.from?.nickname || 'Usuário ML',
    email:             q.from?.email   || '',
    telefone:          '',
    listing_id:        listingId,
    plataforma_origem: 'mercadolivre',
    mensagem:          q.text || '',
  }))
}
