/**
 * Gestão de usuários — só admin. Substitui o signUp/update que Usuarios.jsx
 * fazia direto do browser: criar conta exige service-role (o cadastro
 * público deve ficar desligado no Supabase, ver migration 20261026120000) e
 * desativar precisa banir no Auth — as policies de SELECT são USING(true),
 * então só marcar profiles.ativo=false deixava o token seguir lendo dados.
 *
 * POST /api/usuarios
 * Body: { acao: 'criar', email, senha, nome, role }
 *     | { acao: 'definir_ativo', id, ativo }
 */
import { guard, exigirPapel } from './_guard.js'

const PAPEIS = ['admin', 'operador', 'vendedor']
const SENHA_MIN = 6 // mesmo mínimo padrão do Supabase Auth e do form
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// O Auth não tem ban permanente, só duração — ~100 anos.
const BAN_PERMANENTE = '876000h'

function validarCriacao(body) {
  const { email, senha, nome, role } = body
  if (typeof email !== 'string' || !email.includes('@')) return { erro: `"email" deve ser um e-mail, recebi ${JSON.stringify(email)}` }
  if (typeof senha !== 'string' || senha.length < SENHA_MIN) return { erro: `"senha" deve ter ao menos ${SENHA_MIN} caracteres, recebi ${typeof senha === 'string' ? senha.length : typeof senha}` }
  if (typeof nome !== 'string' || !nome.trim()) return { erro: `"nome" deve ser texto não vazio, recebi ${JSON.stringify(nome)}` }
  if (!PAPEIS.includes(role)) return { erro: `"role" deve ser ${PAPEIS.join('|')}, recebi ${JSON.stringify(role)}` }
  return { valor: { email: email.trim().toLowerCase(), senha, nome: nome.trim(), role } }
}

function validarAtivacao(body, userId) {
  const { id, ativo } = body
  if (typeof id !== 'string' || !UUID_RE.test(id)) return { erro: `"id" deve ser UUID, recebi ${JSON.stringify(id)}` }
  if (typeof ativo !== 'boolean') return { erro: `"ativo" deve ser boolean, recebi ${JSON.stringify(ativo)}` }
  // Evita a loja ficar sem admin por engano — outro admin faz isso.
  if (id === userId) return { erro: 'admin não pode alterar o próprio status' }
  return { valor: { id, ativo } }
}

/** Cria no Auth e promove o profile (handle_new_user o cria inativo, como vendedor). */
async function criarUsuario(admin, { email, senha, nome, role }) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true, user_metadata: { nome },
  })
  if (error) throw new Error(`Falha ao criar ${email} no Auth: ${error.message}`)
  const { error: erroPerfil } = await admin.from('profiles')
    .update({ nome, role, ativo: true }).eq('id', data.user.id)
  if (erroPerfil) throw new Error(`Usuário ${data.user.id} criado, mas profile não ativado: ${erroPerfil.message}`)
  return { id: data.user.id }
}

/** Bane/desbane no Auth primeiro: se o profile falhar depois, o acesso já está cortado. */
async function definirAtivo(admin, { id, ativo }) {
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: ativo ? 'none' : BAN_PERMANENTE })
  if (error) throw new Error(`Falha ao ${ativo ? 'desbanir' : 'banir'} ${id} no Auth: ${error.message}`)
  const { error: erroPerfil } = await admin.from('profiles').update({ ativo }).eq('id', id)
  if (erroPerfil) throw new Error(`Auth atualizado, mas profiles.ativo de ${id} não: ${erroPerfil.message}`)
  return { id, ativo }
}

const ACOES = {
  criar:         { validar: validarCriacao,  executar: criarUsuario },
  definir_ativo: { validar: validarAtivacao, executar: definirAtivo },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const g = await guard(req)
  if (!g.ok) return res.status(g.status).json({ error: g.error })
  const { userId, admin } = g
  if (!(await exigirPapel(admin, userId, ['admin']))) return res.status(403).json({ error: 'Ação restrita a admin' })

  const acao = ACOES[req.body?.acao]
  if (!acao) return res.status(400).json({ error: `"acao" deve ser ${Object.keys(ACOES).join('|')}, recebi ${JSON.stringify(req.body?.acao)}` })
  const parsed = acao.validar(req.body, userId)
  if ('erro' in parsed) return res.status(400).json({ error: parsed.erro })

  try {
    return res.status(200).json(await acao.executar(admin, parsed.valor))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
