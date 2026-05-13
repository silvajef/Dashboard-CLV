/**
 * Adaptador OLX — OAuth Authorization Code + Autoupload API v1
 * Docs: https://developers.olx.com.br/anuncio/api/oauth.html
 *       https://developers.olx.com.br/anuncio/api/import.html
 *
 * Fluxo: usuário autoriza em /oauth → OLX devolve ?code= → trocamos por access_token.
 * Todas as operações de anúncio vão para um único endpoint PUT com access_token no body.
 */

const OLX_AUTH_URL  = 'https://auth.olx.com.br/oauth'
const OLX_TOKEN_URL = 'https://auth.olx.com.br/oauth/token'
// Chamadas à API OLX passam pelo proxy /api/olx-import para evitar CORS
const OLX_IMPORT_URL = '/api/olx-import'

const OLX_CLIENT_ID     = import.meta.env.VITE_OLX_CLIENT_ID
const OLX_CLIENT_SECRET = import.meta.env.VITE_OLX_CLIENT_SECRET

/* ── Auth ────────────────────────────────────────────────────────────── */

/**
 * Gera a URL de autorização OAuth OLX.
 * Redireciona de volta para redirectUri com ?code=... na query string.
 *
 * construirUrlAutenticacao('https://meusite.com/')
 * → 'https://auth.olx.com.br/oauth?response_type=code&...'
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
    scope:         'autoupload',
    state:         crypto.randomUUID(),
  })
  return `${OLX_AUTH_URL}?${params.toString()}`
}

/**
 * Troca o authorization code por access_token.
 * OLX não retorna expires_in — token considerado válido por 24h por padrão.
 *
 * @param {string} code
 * @param {string} redirectUri
 * @returns {Promise<{ access_token: string }>}
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

/* ── Helper interno ──────────────────────────────────────────────────── */

/**
 * Envia uma lista de operações para o endpoint único da OLX Autoupload API.
 * access_token vai no body JSON (não no header).
 *
 * @param {string} accessToken
 * @param {Object[]} adList
 */
async function olxImport(accessToken, adList) {
  // Proxy /api/olx-import aceita POST e repassa como PUT para a OLX (evita CORS)
  const res  = await fetch(OLX_IMPORT_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ access_token: accessToken, ad_list: adList }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`OLX API retornou ${res.status}: ${JSON.stringify(json)}`)
  }
  // Código 0 = validado; -4 = erro de validação; -6 = sem plano profissional
  if (json.code === -4) {
    throw new Error(`OLX rejeitou o anúncio: ${JSON.stringify(json.error_list || json)}`)
  }
  if (json.code === -6) {
    throw new Error('OLX: conta sem plano profissional ativo.')
  }
  return json
}

/* ── API pública ─────────────────────────────────────────────────────── */

/**
 * Publica um veículo como anúncio na OLX via Autoupload API.
 * O campo `id` é o identificador interno do veículo (usado como chave idempotente).
 *
 * @param {string} accessToken
 * @param {Object} veiculo - registro da tabela veiculos
 * @param {import('./types.js').DadosPublicacao} dados
 * @returns {Promise<import('./types.js').ResultadoPublicacao>}
 */
export async function publicarAnuncio(accessToken, veiculo, dados) {
  const titulo = [veiculo.marca_nome, veiculo.modelo_nome || veiculo.modelo, veiculo.ano_modelo]
    .filter(Boolean).join(' ').trim()

  const ad = {
    id:        String(veiculo.id),
    operation: 'insert',
    category:  2020, // Carros, vans e utilitários
    Subject:   titulo,
    Body:      veiculo.obs || `${titulo} — ${veiculo.km || 0} km`,
    Phone:     (veiculo.telefone || '').replace(/\D/g, '') || '00000000000',
    type:      's', // sale
    price:     Math.round(dados.preco),
    zipcode:   (veiculo.cep || '').replace(/\D/g, '') || '',
    images:    dados.fotos || [],
    params: {
      vehicle_brand: veiculo.marca_nome  || '',
      vehicle_model: veiculo.modelo_nome || veiculo.modelo || '',
      car_year:      String(veiculo.ano_modelo || ''),
      mileage:       String(veiculo.km || 0),
      fuel:          veiculo.combustivel || '',
      gearbox:       veiculo.cambio      || '',
    },
  }

  await olxImport(accessToken, [ad])
  // OLX não retorna URL ou ID externo no insert — usamos o id interno como listing_id
  return { listing_id: String(veiculo.id), url: '' }
}

/**
 * Atualiza um anúncio existente (reinsere com mesmos dados + novos valores).
 * @param {string} accessToken
 * @param {string} listingId   - id interno do veículo (usado no insert original)
 * @param {{ preco?: number, titulo?: string }} dados
 */
export async function atualizarAnuncio(accessToken, listingId, dados) {
  const ad = { id: String(listingId), operation: 'insert' }
  if (dados.preco  != null) ad.price   = Math.round(dados.preco)
  if (dados.titulo != null) ad.Subject = dados.titulo
  return olxImport(accessToken, [ad])
}

/**
 * Pausa um anúncio — OLX Autoupload não tem endpoint de pausa;
 * remove o anúncio (delete) como equivalente.
 * @param {string} accessToken
 * @param {string} listingId
 */
export function pausarAnuncio(accessToken, listingId) {
  return olxImport(accessToken, [{ id: String(listingId), operation: 'delete' }])
}

/**
 * Reativa um anúncio pausado — OLX não tem reativação; faz um novo insert.
 * Requer os dados originais do veículo. Retorna sem ação se chamado sem veiculo.
 */
export function reativarAnuncio(_accessToken, _listingId) {
  // Sem dados do veículo aqui, reativação deve ser feita via publicarAnuncio
  return Promise.resolve()
}

/**
 * Encerra (deleta) um anúncio na OLX.
 * @param {string} accessToken
 * @param {string} listingId
 */
export function fecharAnuncio(accessToken, listingId) {
  return olxImport(accessToken, [{ id: String(listingId), operation: 'delete' }])
}

/**
 * OLX Autoupload não expõe endpoint de leads/mensagens.
 * @returns {Promise<import('./types.js').LeadExterno[]>}
 */
export async function buscarLeads(_accessToken, _listingId) {
  return []
}
