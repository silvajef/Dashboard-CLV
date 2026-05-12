/**
 * Adaptador iCarros — stub aguardando credenciais de parceiro.
 * Para implementar: solicite acesso à API em https://www.icarros.com.br/parceiros
 * e configure VITE_ICARROS_API_KEY.
 */

const STUB = fn =>
  `iCarros.${fn}: integração pendente. Configure VITE_ICARROS_API_KEY e implemente o adaptador.`

export const construirUrlAutenticacao = ()        => { throw new Error(STUB('construirUrlAutenticacao')) }
export const publicarAnuncio          = ()        => { throw new Error(STUB('publicarAnuncio'))          }
export const atualizarAnuncio         = ()        => { throw new Error(STUB('atualizarAnuncio'))         }
export const pausarAnuncio            = ()        => { throw new Error(STUB('pausarAnuncio'))            }
export const reativarAnuncio          = ()        => { throw new Error(STUB('reativarAnuncio'))          }
export const fecharAnuncio            = ()        => { throw new Error(STUB('fecharAnuncio'))            }
export const buscarLeads              = async () => []
