/**
 * Adaptador OLX — stub aguardando credenciais de parceiro.
 * Para implementar: cadastre-se em https://developers.olx.com.br,
 * obtenha client_id/client_secret e configure VITE_OLX_CLIENT_ID.
 */

const STUB = fn =>
  `OLX.${fn}: integração pendente. Configure VITE_OLX_CLIENT_ID e implemente o OAuth OLX.`

export const construirUrlAutenticacao = ()              => { throw new Error(STUB('construirUrlAutenticacao')) }
export const publicarAnuncio          = ()              => { throw new Error(STUB('publicarAnuncio'))          }
export const atualizarAnuncio         = ()              => { throw new Error(STUB('atualizarAnuncio'))         }
export const pausarAnuncio            = ()              => { throw new Error(STUB('pausarAnuncio'))            }
export const reativarAnuncio          = ()              => { throw new Error(STUB('reativarAnuncio'))          }
export const fecharAnuncio            = ()              => { throw new Error(STUB('fecharAnuncio'))            }
export const buscarLeads              = async () => []
