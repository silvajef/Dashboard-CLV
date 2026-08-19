/**
 * Guard compartilhado para funções serverless privilegiadas em api/*.js.
 * Toda função que usa SUPABASE_SERVICE_ROLE_KEY (bypassa RLS) precisa
 * autenticar o Bearer token antes de qualquer leitura/escrita — ver skill
 * api-guard.
 */
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const JANELA_MS = 60_000
const LIMITE_POR_JANELA = 30
const MAX_USUARIOS_RASTREADOS = 500
const contagemPorUsuario = new Map()

/** Remove entradas de janela expirada — evita crescimento sem limite entre cold starts. */
function limparExpirados(agora) {
  for (const [uid, registro] of contagemPorUsuario) {
    if (agora - registro.inicio > JANELA_MS) contagemPorUsuario.delete(uid)
  }
}

/**
 * Rate-limit em memória por userId (best-effort — zera a cada cold start,
 * suficiente para o volume interno de uma loja única, não para API pública).
 * @returns {boolean} true se dentro do limite
 */
function dentroDoLimite(userId) {
  const agora = Date.now()
  if (contagemPorUsuario.size > MAX_USUARIOS_RASTREADOS) limparExpirados(agora)

  const registro = contagemPorUsuario.get(userId)
  if (!registro || agora - registro.inicio > JANELA_MS) {
    contagemPorUsuario.set(userId, { inicio: agora, total: 1 })
    return true
  }
  registro.total += 1
  return registro.total <= LIMITE_POR_JANELA
}

/**
 * Autentica a requisição pelo Bearer token do Supabase e aplica rate-limit.
 * @returns {Promise<{ ok: true, userId: string, admin }|{ ok: false, status: number, error: string }>}
 */
export async function guard(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, error: 'Token ausente' }

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return { ok: false, status: 401, error: 'Token inválido' }

  if (!dentroDoLimite(data.user.id)) {
    return { ok: false, status: 429, error: 'Limite de requisições excedido' }
  }

  return { ok: true, userId: data.user.id, admin }
}
