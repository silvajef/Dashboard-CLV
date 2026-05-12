/**
 * Tipos e contratos compartilhados entre todos os adaptadores de plataforma.
 * Cada adaptador deve exportar as mesmas funções nomeadas — ver AdaptadorPlataforma abaixo.
 */

/** @typedef {'mercadolivre'|'olx'|'icarros'|'mobiauto'|'napista'} SlugPlataforma */
/** @typedef {'ativo'|'pausado'|'expirado'|'vendido'|'erro'|'rascunho'}  StatusAnuncio */
/** @typedef {'novo'|'contato'|'visita'|'proposta'|'ganho'|'perdido'}    StatusLead    */

/**
 * @typedef {Object} TokenOAuth
 * @property {string} access_token
 * @property {string} [refresh_token]
 * @property {number} expires_in  - segundos até expirar
 * @property {string} [user_id]   - ID do usuário na plataforma
 */

/**
 * @typedef {Object} ResultadoPublicacao
 * @property {string} listing_id - ID externo do anúncio na plataforma
 * @property {string} url        - URL pública do anúncio
 */

/**
 * @typedef {Object} LeadExterno
 * @property {string} nome
 * @property {string} [telefone]
 * @property {string} [email]
 * @property {string} listing_id
 * @property {SlugPlataforma} plataforma_origem
 * @property {string} mensagem
 */

/**
 * Contrato que todos os adaptadores de plataforma implementam.
 * Stubs lançam Error descritivo até a integração ser configurada.
 *
 * @typedef {Object} AdaptadorPlataforma
 * @property {(redirectUri: string) => string}                                           construirUrlAutenticacao
 * @property {(token: string, veiculo: Object, preco: number) => Promise<ResultadoPublicacao>} publicarAnuncio
 * @property {(token: string, listingId: string, dados: Object) => Promise<void>}        atualizarAnuncio
 * @property {(token: string, listingId: string) => Promise<void>}                       pausarAnuncio
 * @property {(token: string, listingId: string) => Promise<void>}                       reativarAnuncio
 * @property {(token: string, listingId: string) => Promise<void>}                       fecharAnuncio
 * @property {(token: string, listingId: string) => Promise<LeadExterno[]>}              buscarLeads
 */

export const STATUS_ANUNCIO_CFG = {
  ativo:    { label: 'Ativo',    color: '#22d3a0' },
  pausado:  { label: 'Pausado',  color: '#f59e0b' },
  expirado: { label: 'Expirado', color: '#f4485e' },
  vendido:  { label: 'Vendido',  color: '#636b85' },
  erro:     { label: 'Erro',     color: '#f4485e' },
  rascunho: { label: 'Rascunho', color: '#4f8ef7' },
}

export const STATUS_LEAD_CFG = {
  novo:     { label: 'Novo Lead',   color: '#4f8ef7' },
  contato:  { label: 'Em Contato',  color: '#f59e0b' },
  visita:   { label: 'Visita',      color: '#a78bfa' },
  proposta: { label: 'Proposta',    color: '#fb923c' },
  ganho:    { label: 'Ganho',       color: '#22d3a0' },
  perdido:  { label: 'Perdido',     color: '#636b85' },
}

export const TIPOS_ATIVIDADE = [
  { value: 'mensagem', label: 'Mensagem'  },
  { value: 'ligacao',  label: 'Ligação'   },
  { value: 'visita',   label: 'Visita'    },
  { value: 'proposta', label: 'Proposta'  },
  { value: 'nota',     label: 'Nota'      },
]
