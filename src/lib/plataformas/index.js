/**
 * Metadados dos canais de origem de lead (exibição na aba Leads / funil) e
 * das plataformas de anúncio (aba Anúncios / Configurações).
 * `publicavel: true` = tem adaptador real de publicação (ver
 * src/hooks/useAnuncios.js + api/_plataformas/*.js); as demais só existem
 * como opção de `plataforma_origem` de lead (entrada manual/externa).
 * Ao adicionar um canal, inclua aqui { slug, nome, emoji, cor, publicavel }.
 */

/** @typedef {'mercadolivre'|'olx'|'facebook'|'icarros'|'mobiauto'|'napista'|'whatsapp'|'indicacao'} SlugPlataforma */

/**
 * @typedef {Object} CanalLead
 * @property {SlugPlataforma} slug
 * @property {string} nome
 * @property {string} emoji
 * @property {string} cor   - cor da marca (hex)
 * @property {boolean} publicavel - tem publicação de anúncio automatizada
 */

/** @type {CanalLead[]} */
export const PLATAFORMAS = [
  { slug: 'whatsapp',     nome: 'WhatsApp',      emoji: '💬', cor: '#25d366', publicavel: false },
  { slug: 'indicacao',    nome: 'Indicação',     emoji: '🤝', cor: '#a78bfa', publicavel: false },
  { slug: 'mercadolivre', nome: 'Mercado Livre', emoji: '🛒', cor: '#ffe600', publicavel: true  },
  { slug: 'olx',          nome: 'OLX',           emoji: '🔶', cor: '#f28500', publicavel: true  },
  { slug: 'facebook',     nome: 'Facebook',      emoji: '📘', cor: '#1877f2', publicavel: true  },
  { slug: 'icarros',      nome: 'iCarros',        emoji: '🚗', cor: '#e63027', publicavel: false },
  { slug: 'mobiauto',     nome: 'Mobiauto',       emoji: '🏎', cor: '#0066cc', publicavel: false },
  { slug: 'napista',      nome: 'Na Pista',       emoji: '🏁', cor: '#00b140', publicavel: false },
]

/** Só as plataformas com adaptador de publicação real. */
export const PLATAFORMAS_PUBLICAVEIS = PLATAFORMAS.filter(p => p.publicavel)

export function getPlataforma(slug) {
  return PLATAFORMAS.find(p => p.slug === slug) || null
}
