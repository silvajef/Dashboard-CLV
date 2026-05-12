/**
 * Adaptador Mercado Livre — OAuth Implícito + Classificados API v1
 * Docs: https://developers.mercadolivre.com.br/pt_br/anuncie-no-mercado-livre
 *
 * Fluxo: o usuário é redirecionado ao ML → ML devolve access_token no hash da URL.
 * Não expõe client_secret (implicit flow, recomendado para SPAs).
 */

const ML_BASE      = 'https://api.mercadolivre.com'
const ML_AUTH_URL  = 'https://auth.mercadolivre.com.br/authorization'
const ML_CLIENT_ID = import.meta.env.VITE_ML_CLIENT_ID

// Categoria padrão: Veículos > Caminhões e Utilitários.
// Ajuste via VITE_ML_CATEGORIA se precisar de outra categoria.
const ML_CATEGORIA = import.meta.env.VITE_ML_CATEGORIA || 'MLB271599'

/* ── Auth ────────────────────────────────────────────────────────────── */

/**
 * Gera a URL de autenticação OAuth Implícito do ML.
 * Redireciona de volta para redirectUri com #access_token=... no hash.
 *
 * construirUrlAutenticacao(window.location.href)
 * → 'https://auth.mercadolivre.com.br/authorization?response_type=token&...'
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
    response_type: 'token',
    client_id:     ML_CLIENT_ID,
    redirect_uri:  redirectUri,
    state:         crypto.randomUUID(),
  })
  return `${ML_AUTH_URL}?${params.toString()}`
}

/**
 * Retorna a redirect URI que será enviada ao ML.
 * Deve estar cadastrada EXATAMENTE igual no painel do ML Developers.
 * @returns {string}
 */
export function getRedirectUri() {
  return `${window.location.origin}/`
}

/**
 * Extrai o token do hash da URL após o redirect OAuth.
 * Deve ser chamado na montagem da página se window.location.hash contiver access_token.
 *
 * extrairTokenDaUrl('#access_token=APP_USR-...&expires_in=21600&user_id=12345678')
 * → { access_token: 'APP_USR-...', expires_in: 21600, user_id: '12345678' }
 *
 * @param {string} hash - window.location.hash
 * @returns {{ access_token: string, expires_in: number, user_id: string } | null}
 */
export function extrairTokenDaUrl(hash) {
  if (!hash) return null
  const params      = new URLSearchParams(hash.replace(/^#/, ''))
  const access_token = params.get('access_token')
  if (!access_token) return null
  return {
    access_token,
    expires_in: parseInt(params.get('expires_in') || '21600', 10),
    user_id:    params.get('user_id') || '',
  }
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
 * @param {Object} veiculo - registro da tabela veiculos
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
