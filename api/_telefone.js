/**
 * Normaliza telefone para E.164-ish (+55DDDNNNNNNNNN) antes de cifrar/hashear.
 * Compartilhado entre api/leads-pii-cifrar.js e api/whatsapp-webhook.js — se
 * os dois normalizarem diferente, o dedupe por telefone_hash quebra em
 * silêncio (o mesmo número vira dois leads distintos dependendo da origem).
 *
 * Detecta código de país pelo TAMANHO, não só pelo prefixo "55" — um número
 * sem código de país cujo DDD também é 55 (região noroeste do RS) tem 10-11
 * dígitos; só considera "já tem código de país" a partir de 12 dígitos.
 * Testar `startsWith('55')` sozinho confundia DDD 55 com o código do Brasil.
 */
export function normalizarTelefone(telefone) {
  const digitos = String(telefone).replace(/\D/g, '')
  const temCodigoPais = digitos.length >= 12 && digitos.startsWith('55')
  return temCodigoPais ? `+${digitos}` : `+55${digitos}`
}
