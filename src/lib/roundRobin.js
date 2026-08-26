/**
 * Round-robin de atribuição de leads — puro, sem I/O.
 * Compartilhado entre o client (src/lib/api-leads.js) e o webhook do
 * WhatsApp (api/whatsapp-webhook.js), que não pode importar api-leads.js
 * porque esse módulo puxa o cliente Supabase do browser (import.meta.env).
 */

/**
 * Escolhe o vendedor com menos leads ativos (não ganho/perdido) — round-robin
 * por carga, sem precisar de estado/ponteiro persistido.
 */
export function proximoResponsavel(vendedores, leadsAtuais) {
  if (!vendedores?.length) return null
  const carga = Object.fromEntries(vendedores.map(v => [v.id, 0]))
  leadsAtuais
    .filter(l => !['ganho', 'perdido'].includes(l.status) && carga[l.responsavel_id] !== undefined)
    .forEach(l => { carga[l.responsavel_id] += 1 })
  return vendedores.reduce((menor, v) => carga[v.id] < carga[menor.id] ? v : menor, vendedores[0]).id
}
