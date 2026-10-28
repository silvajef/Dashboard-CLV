/**
 * Chama uma função api/*.js autenticada com o Bearer token da sessão atual.
 * Compartilhado por api-leads.js e api-anuncios.js — evita duplicar a
 * mesma lógica de auth header em cada camada de dados que precisa de um
 * endpoint privilegiado (service-role) no servidor.
 */
import { supabase } from './supabase'

export async function chamarApiAutenticada(rota, body) {
  const { data: sessao } = await supabase.auth.getSession()
  const token = sessao?.session?.access_token
  const res = await fetch(`/api/${rota}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Falha em /api/${rota}: HTTP ${res.status}`)
  return json
}
