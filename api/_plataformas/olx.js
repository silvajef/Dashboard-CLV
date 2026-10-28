/**
 * Adaptador OLX — SERVER-ONLY. A versão antiga desta função rodava no
 * browser e lia OLX_CLIENT_SECRET via `import.meta.env.VITE_OLX_CLIENT_SECRET`
 * — isso PUBLICAVA o client_secret no bundle JS (Vite expõe toda var
 * VITE_* ao cliente). Corrigido aqui: client_secret só em
 * process.env.OLX_CLIENT_SECRET (sem prefixo VITE_), lido só neste arquivo
 * que só é importado por funções api/*.js. A parte client-safe
 * (construirUrlAutenticacao, só client_id público) vive em
 * src/lib/plataformas/olx.js.
 *
 * Docs: https://developers.olx.com.br/anuncio/api/oauth.html
 *       https://developers.olx.com.br/anuncio/api/import.html
 */

const OLX_TOKEN_URL  = 'https://auth.olx.com.br/oauth/token'
const OLX_IMPORT_URL = 'https://apps.olx.com.br/autoupload/import'
const OLX_CLIENT_ID     = process.env.OLX_CLIENT_ID
const OLX_CLIENT_SECRET = process.env.OLX_CLIENT_SECRET

/**
 * Troca o authorization code por access_token. OLX historicamente não
 * documenta refresh_token — cada reconexão gera um token novo. Validar
 * isso na sessão de credenciais (docs/runbook-credenciais-anuncios.md).
 * @param {string} code
 * @param {string} redirectUri
 * @returns {Promise<{ access_token: string }>}
 */
export async function trocarCodigoPorToken(code, redirectUri) {
  if (!OLX_CLIENT_ID || !OLX_CLIENT_SECRET) {
    throw new Error('OLX_CLIENT_ID/OLX_CLIENT_SECRET ausentes no ambiente do servidor (Vercel).')
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
  if (!res.ok) throw new Error(`OLX token error ${res.status}: ${json.error_description || JSON.stringify(json)}`)
  return json
}

/** @param {string} accessToken @param {Object[]} adList */
async function olxImport(accessToken, adList) {
  const res  = await fetch(OLX_IMPORT_URL, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ access_token: accessToken, ad_list: adList }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`OLX API retornou ${res.status}: ${JSON.stringify(json)}`)
  if (json.code === -4) throw new Error(`OLX rejeitou o anúncio: ${JSON.stringify(json.error_list || json)}`)
  if (json.code === -6) throw new Error('OLX: conta sem plano profissional ativo.')
  return json
}

/**
 * Publica um veículo na OLX via Autoupload API. `id` é o id interno do
 * veículo — usado como chave idempotente (republicar = operation:'insert'
 * de novo, a OLX substitui).
 * @param {string} accessToken
 * @param {Object} veiculo
 * @param {{ preco: number, fotos?: string[] }} dados
 * @returns {Promise<{ listing_id: string, url: string }>}
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
    // veiculo.telefone/veiculo.cep não existem no schema (não é campo do
    // carro, é da loja) — usa env var fixa. Configure LOJA_TELEFONE/
    // LOJA_CEP no Vercel antes de publicar de verdade (ver runbook).
    Phone:     (process.env.LOJA_TELEFONE || '').replace(/\D/g, '') || '00000000000',
    type:      's',
    price:     Math.round(dados.preco),
    zipcode:   (process.env.LOJA_CEP || '').replace(/\D/g, '') || '',
    images:    dados.fotos || [],
    params: {
      vehicle_brand: veiculo.marca_nome  || '',
      vehicle_model: veiculo.modelo_nome || veiculo.modelo || '',
      car_year:      String(veiculo.ano_modelo || ''),
      mileage:       String(veiculo.km || 0),
      fuel:          veiculo.combustivel || '',
    },
  }

  await olxImport(accessToken, [ad])
  return { listing_id: String(veiculo.id), url: '' }
}

/** @param {string} accessToken @param {string} listingId @param {{ preco?: number, titulo?: string }} dados */
export function atualizarAnuncio(accessToken, listingId, dados) {
  const ad = { id: String(listingId), operation: 'insert' }
  if (dados.preco  != null) ad.price   = Math.round(dados.preco)
  if (dados.titulo != null) ad.Subject = dados.titulo
  return olxImport(accessToken, [ad])
}

/** OLX Autoupload não tem endpoint de pausa — delete como equivalente. */
export function pausarAnuncio(accessToken, listingId) {
  return olxImport(accessToken, [{ id: String(listingId), operation: 'delete' }])
}

/** Sem dados do veículo aqui — reativação real precisa de publicarAnuncio(). */
export function reativarAnuncio() {
  throw new Error('OLX não suporta reativação direta — republique via publicarAnuncio().')
}

export function fecharAnuncio(accessToken, listingId) {
  return olxImport(accessToken, [{ id: String(listingId), operation: 'delete' }])
}
