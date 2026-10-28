/**
 * Adaptador OLX — parte CLIENT-SAFE (roda no browser). Só conhece o
 * client_id público (VITE_OLX_CLIENT_ID). NUNCA leia client_secret aqui —
 * a versão anterior deste arquivo lia VITE_OLX_CLIENT_SECRET, que o Vite
 * publica no bundle JS do browser (qualquer var VITE_* é exposta). Troca
 * de token e publicação exigem client_secret e vivem em
 * api/_plataformas/olx.js (server-only).
 */

const OLX_AUTH_URL  = 'https://auth.olx.com.br/oauth'
const OLX_CLIENT_ID = import.meta.env.VITE_OLX_CLIENT_ID

/**
 * Gera a URL de autorização OAuth OLX (scope autoupload).
 * @param {string} redirectUri
 * @returns {string}
 */
export function construirUrlAutenticacao(redirectUri) {
  if (!OLX_CLIENT_ID) {
    throw new Error(
      'VITE_OLX_CLIENT_ID não configurado. Adicione a variável no Vercel ' +
      '(Settings → Environment Variables) e faça um novo deploy.'
    )
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     OLX_CLIENT_ID,
    redirect_uri:  redirectUri,
    scope:         'autoupload',
    state:         `olx:${crypto.randomUUID()}`,
  })
  return `${OLX_AUTH_URL}?${params.toString()}`
}
