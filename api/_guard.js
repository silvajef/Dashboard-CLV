/**
 * Guard compartilhado para funções serverless privilegiadas em api/*.js.
 * Toda função que usa SUPABASE_SERVICE_ROLE_KEY (bypassa RLS) precisa
 * autenticar o Bearer token antes de qualquer leitura/escrita — ver skill
 * api-guard.
 */
import { admin } from './_supabaseAdmin.js'

const JANELA_MS = 60_000
const LIMITE_POR_JANELA = 30
const MAX_CHAVES_RASTREADAS = 500
const contagemPorChave = new Map()

/** Remove entradas de janela expirada — evita crescimento sem limite entre cold starts. */
function limparExpirados(agora) {
  for (const [chave, registro] of contagemPorChave) {
    if (agora - registro.inicio > JANELA_MS) contagemPorChave.delete(chave)
  }
}

/**
 * Rate-limit em memória por chave arbitrária (userId, IP…) — best-effort,
 * zera a cada cold start, suficiente para o volume interno de uma loja
 * única, não para API pública de alto tráfego. Compartilhado por guard()
 * (chave = userId) e por webhooks sem Bearer, que não têm userId pra usar
 * (ex.: api/_anuncios-acoes/ml-webhook.js, chave = IP).
 * @returns {boolean} true se dentro do limite
 */
export function dentroDoLimitePorChave(chave, limite = LIMITE_POR_JANELA) {
  const agora = Date.now()
  if (contagemPorChave.size > MAX_CHAVES_RASTREADAS) limparExpirados(agora)

  const registro = contagemPorChave.get(chave)
  if (!registro || agora - registro.inicio > JANELA_MS) {
    contagemPorChave.set(chave, { inicio: agora, total: 1 })
    return true
  }
  registro.total += 1
  return registro.total <= limite
}

/**
 * Token válido não basta: o JWT de um usuário recém-desativado segue válido
 * até expirar (até 1h) — sem esta checagem ele continuava usando os
 * endpoints service-role nesse intervalo.
 */
async function perfilAtivo(userId) {
  const { data, error } = await admin.from('profiles').select('ativo').eq('id', userId).maybeSingle()
  return !error && data?.ativo === true
}

/**
 * Autentica a requisição pelo Bearer token do Supabase, exige perfil ativo
 * e aplica rate-limit.
 * @returns {Promise<{ ok: true, userId: string, admin }|{ ok: false, status: number, error: string }>}
 */
export async function guard(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, error: 'Token ausente' }

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return { ok: false, status: 401, error: 'Token inválido' }
  if (!(await perfilAtivo(data.user.id))) return { ok: false, status: 403, error: 'Usuário inativo' }

  if (!dentroDoLimitePorChave(data.user.id)) {
    return { ok: false, status: 429, error: 'Limite de requisições excedido' }
  }

  return { ok: true, userId: data.user.id, admin }
}

/**
 * Checa se o usuário tem um dos papéis permitidos. `guard()` só autentica
 * (confirma quem é); endpoints que fazem mutação privilegiada (bypassam
 * RLS via service-role) precisam checar papel explicitamente também — RLS
 * de `anuncios`/`integracoes` restringe INSERT/UPDATE a admin/operador, mas
 * essas tabelas só são escritas via service-role, que ignora RLS. Sem essa
 * checagem, qualquer usuário autenticado (inclusive vendedor) conseguia
 * chamar os endpoints de anúncios direto, ignorando o que a RLS e a UI
 * (aba escondida) já bloqueavam.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {string[]} papeisPermitidos
 * @returns {Promise<boolean>}
 */
export async function exigirPapel(admin, userId, papeisPermitidos) {
  const { data, error } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error || !data) return false
  const role = data.role === 'visualizador' ? 'vendedor' : data.role
  return papeisPermitidos.includes(role)
}
