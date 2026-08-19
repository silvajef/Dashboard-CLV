/**
 * Metadados dos canais de origem de lead (exibição na aba Leads / funil).
 * NÃO há mais publicação de anúncio — a integração OAuth foi removida.
 * Ao adicionar um canal (ex.: WhatsApp), inclua aqui { slug, nome, emoji, cor }.
 */

/** @typedef {'mercadolivre'|'olx'|'icarros'|'mobiauto'|'napista'|'whatsapp'|'indicacao'} SlugPlataforma */

/**
 * @typedef {Object} CanalLead
 * @property {SlugPlataforma} slug
 * @property {string} nome
 * @property {string} emoji
 * @property {string} cor   - cor da marca (hex)
 */

/** @type {CanalLead[]} */
export const PLATAFORMAS = [
  { slug: 'whatsapp',     nome: 'WhatsApp',      emoji: '💬', cor: '#25d366' },
  { slug: 'indicacao',    nome: 'Indicação',     emoji: '🤝', cor: '#a78bfa' },
  { slug: 'mercadolivre', nome: 'Mercado Livre', emoji: '🛒', cor: '#ffe600' },
  { slug: 'olx',          nome: 'OLX',           emoji: '🔶', cor: '#f28500' },
  { slug: 'icarros',      nome: 'iCarros',        emoji: '🚗', cor: '#e63027' },
  { slug: 'mobiauto',     nome: 'Mobiauto',       emoji: '🏎', cor: '#0066cc' },
  { slug: 'napista',      nome: 'Na Pista',       emoji: '🏁', cor: '#00b140' },
]
