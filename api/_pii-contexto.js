/**
 * Contextos AAD (GCM) de leads.nome_encrypted/telefone_encrypted/
 * email_encrypted — precisam ser idênticos em toda cifragem/decifragem do
 * mesmo campo (api/_crypto.js), senão decrypt() falha por authTag inválido.
 * Compartilhado por leads-pii-cifrar.js, leads-pii-revelar.js e
 * whatsapp-webhook.js pra evitar exatamente esse tipo de drift.
 */
export const CONTEXTO_PII_LEAD = { nome: 'lead:nome', telefone: 'lead:telefone', email: 'lead:email' }
