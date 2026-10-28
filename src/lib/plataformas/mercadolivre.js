/**
 * Adaptador Mercado Livre — parte CLIENT-SAFE (roda no browser). Só conhece
 * o client_id público (VITE_ML_CLIENT_ID). Troca de token, refresh e
 * publicação exigem client_secret e vivem em api/_plataformas/mercadolivre.js
 * (server-only) — nunca junte os dois neste arquivo.
 */

const ML_AUTH_URL  = 'https://auth.mercadolivre.com.br/authorization'
const ML_CLIENT_ID = import.meta.env.VITE_ML_CLIENT_ID

/**
 * Gera a URL de autorização OAuth do ML (Authorization Code Flow).
 * O state carrega o prefixo "ml:" pra identificar a plataforma no callback.
 * @param {string} redirectUri
 * @returns {string}
 */
export function construirUrlAutenticacao(redirectUri) {
  if (!ML_CLIENT_ID) {
    throw new Error(
      'VITE_ML_CLIENT_ID não configurado. Adicione a variável no Vercel ' +
      '(Settings → Environment Variables) e faça um novo deploy.'
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
