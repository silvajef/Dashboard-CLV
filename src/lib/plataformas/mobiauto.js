/**
 * Adaptador Mobiauto — stub aguardando credenciais de parceiro.
 * Para implementar: acesse https://mobiauto.com.br/anunciante,
 * obtenha token de parceiro e configure VITE_MOBIAUTO_API_TOKEN.
 */

const STUB = fn =>
  `Mobiauto.${fn}: integração pendente. Configure VITE_MOBIAUTO_API_TOKEN e implemente o adaptador.`

export const construirUrlAutenticacao = ()        => { throw new Error(STUB('construirUrlAutenticacao')) }
export const publicarAnuncio          = ()        => { throw new Error(STUB('publicarAnuncio'))          }
export const atualizarAnuncio         = ()        => { throw new Error(STUB('atualizarAnuncio'))         }
export const pausarAnuncio            = ()        => { throw new Error(STUB('pausarAnuncio'))            }
export const reativarAnuncio          = ()        => { throw new Error(STUB('reativarAnuncio'))          }
export const fecharAnuncio            = ()        => { throw new Error(STUB('fecharAnuncio'))            }
export const buscarLeads              = async () => []
