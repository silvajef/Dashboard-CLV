/**
 * Contexto AAD (GCM) para segredos de `integracoes` — precisa ser idêntico
 * em toda cifragem/decifragem do mesmo campo (api/_crypto.js), senão
 * decrypt() falha por authTag inválido. Amarra o blob cifrado à
 * (plataforma, campo) para que um token de uma plataforma não possa ser
 * decifrado no lugar de outra por engano. Mesmo padrão de
 * api/_pii-contexto.js para leads.
 */
export function contextoIntegracao(plataforma, campo) {
  return `integracao:${plataforma}:${campo}`
}
