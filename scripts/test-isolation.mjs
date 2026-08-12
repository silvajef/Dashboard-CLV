/**
 * Gate de segurança RLS — Dashboard-CLV (loja única, controle por papel).
 *
 * NÃO é teste multi-tenant (o app não isola por user_id — ver
 * sql/20260708120000_rls_crm_role_policies.sql). Verifica duas coisas:
 *   1. anon não lê NADA das tabelas com RLS (fronteira contra visitante).
 *   2. vendedor respeita os papéis: pode criar lead, NÃO pode criar anúncio
 *      nem apagar lead (só admin apaga).
 *
 * Rode APÓS aplicar a migration:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
 *   TEST_VENDEDOR_EMAIL=... TEST_VENDEDOR_SENHA=... \
 *   node scripts/test-isolation.mjs
 *
 * Sem TEST_VENDEDOR_*, roda só o passo 1 (anon). Sai 0 = passou, 1 = falhou.
 */
import { createClient } from '@supabase/supabase-js'

const URL      = process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!URL || !ANON_KEY) {
  console.error('Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no ambiente.')
  process.exit(1)
}

const TABELAS_RLS = ['leads', 'anuncios', 'leads_atividades', 'veiculos', 'clientes']
const falhas = []

function checar(condicao, mensagem) {
  if (condicao) { console.log(`  ok   — ${mensagem}`); return }
  console.error(`  FALHA — ${mensagem}`)
  falhas.push(mensagem)
}

/** anon (sem login) não pode ler nenhuma linha de tabela com RLS. */
async function anonNaoLeNada() {
  console.log('1. anon não lê nada das tabelas com RLS:')
  const anon = createClient(URL, ANON_KEY)
  for (const tabela of TABELAS_RLS) {
    const { data, error } = await anon.from(tabela).select('*').limit(1)
    const bloqueado = error != null || (Array.isArray(data) && data.length === 0)
    checar(bloqueado, `anon SELECT ${tabela} → bloqueado/vazio`)
  }
}

/** vendedor logado respeita os papéis do CRM. */
async function vendedorRespeitaPapeis(email, senha) {
  console.log('2. vendedor respeita os papéis:')
  const cli = createClient(URL, ANON_KEY)
  const { error: erroLogin } = await cli.auth.signInWithPassword({ email, password: senha })
  if (erroLogin) { checar(false, `login vendedor: ${erroLogin.message}`); return }

  const lead = { nome: 'Teste RLS', status: 'novo', plataforma_origem: 'manual' }
  const { data: criado, error: erroInsert } = await cli.from('leads').insert(lead).select().single()
  checar(erroInsert == null && criado?.id != null, 'vendedor CRIA lead (permitido)')

  const anuncio = { veiculo_id: 1, plataforma: 'olx', status: 'rascunho' }
  const { error: erroAnuncio } = await cli.from('anuncios').insert(anuncio).select().single()
  checar(erroAnuncio != null, 'vendedor NÃO cria anúncio (bloqueado)')

  if (criado?.id != null) {
    const { error: erroDelete } = await cli.from('leads').delete().eq('id', criado.id)
    checar(erroDelete != null, 'vendedor NÃO apaga lead (só admin)')
  }
}

async function main() {
  await anonNaoLeNada()

  const email = process.env.TEST_VENDEDOR_EMAIL
  const senha = process.env.TEST_VENDEDOR_SENHA
  if (email && senha) await vendedorRespeitaPapeis(email, senha)
  else console.log('2. (pulado — defina TEST_VENDEDOR_EMAIL/TEST_VENDEDOR_SENHA)')

  if (falhas.length > 0) {
    console.error(`\n${falhas.length} falha(s) — isolamento NÃO garantido.`)
    process.exit(1)
  }
  console.log('\nTodas as asserções passaram.')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
