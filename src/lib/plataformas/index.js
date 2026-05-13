/**
 * Registry de plataformas de anúncio.
 * Adicionar uma nova plataforma: importe o adaptador e inclua em PLATAFORMAS.
 */
import * as mercadolivre from './mercadolivre.js'
import * as olx          from './olx.js'
import * as icarros      from './icarros.js'
import * as mobiauto     from './mobiauto.js'
import * as napista      from './napista.js'

/**
 * @typedef {Object} ConfigPlataforma
 * @property {import('./types.js').SlugPlataforma} slug
 * @property {string}  nome
 * @property {string}  emoji
 * @property {string}  cor          - cor primária da marca (hex)
 * @property {boolean} implementado - false = stub, bloqueia ações na UI
 * @property {import('./types.js').AdaptadorPlataforma} adaptador
 */

/** @type {ConfigPlataforma[]} */
export const PLATAFORMAS = [
  { slug: 'mercadolivre', nome: 'Mercado Livre', emoji: '🛒', cor: '#ffe600', implementado: true,  adaptador: mercadolivre },
  { slug: 'olx',          nome: 'OLX',           emoji: '🔶', cor: '#f28500', implementado: true,  adaptador: olx          },
  { slug: 'icarros',      nome: 'iCarros',        emoji: '🚗', cor: '#e63027', implementado: false, adaptador: icarros      },
  { slug: 'mobiauto',     nome: 'Mobiauto',       emoji: '🏎', cor: '#0066cc', implementado: false, adaptador: mobiauto     },
  { slug: 'napista',      nome: 'Na Pista',       emoji: '🏁', cor: '#00b140', implementado: false, adaptador: napista      },
]

/**
 * Retorna a configuração de uma plataforma pelo slug.
 * Lança se o slug for inválido.
 *
 * getPlatforma('mercadolivre') → { slug, nome, emoji, cor, implementado, adaptador }
 *
 * @param {string} slug
 * @returns {ConfigPlataforma}
 */
export function getPlatforma(slug) {
  const p = PLATAFORMAS.find(x => x.slug === slug)
  if (!p) {
    throw new Error(
      `Plataforma desconhecida: "${slug}". Esperado: ${PLATAFORMAS.map(x => x.slug).join(', ')}`
    )
  }
  return p
}
