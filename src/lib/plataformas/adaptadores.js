/**
 * Resolve o adaptador OAuth client-safe (construirUrlAutenticacao) por
 * plataforma. Usado só por src/hooks/useAnuncios.js#conectar(). Facebook
 * não tem OAuth por item — é feed de catálogo, ver
 * api/anuncios-facebook-setup.js — por isso não entra aqui.
 */
import * as mercadolivre from './mercadolivre'
import * as olx from './olx'

const ADAPTADORES_OAUTH = { mercadolivre, olx }

/** @param {string} plataforma @returns {{ construirUrlAutenticacao(redirectUri: string): string }} */
export function getAdaptadorOAuth(plataforma) {
  const adaptador = ADAPTADORES_OAUTH[plataforma]
  if (!adaptador) {
    throw new Error(`Plataforma "${plataforma}" não tem fluxo OAuth (esperado: ${Object.keys(ADAPTADORES_OAUTH).join(', ')}).`)
  }
  return adaptador
}
