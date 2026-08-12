# Aprendizados de engenharia do Zennith → Dashboard-CLV

> Documento de referência técnica. Origem: **Zennith** (app financeira B2C, Next.js 15 App
> Router + Supabase RLS, mercado BR/LGPD, em produção). Destino: **Dashboard-CLV / fleetcontrol**
> (revenda de veículos: Vite + React 18 SPA + funções serverless Vercel + Supabase direto no cliente).
>
> Os padrões abaixo já foram validados em produção no Zennith. Aqui eles estão **reenquadrados**
> para a stack do Dashboard-CLV — que é diferente o bastante para que copiar 1:1 seja errado.
> Cada seção referencia a skill correspondente em `.claude/skills/`.

---

## 0. A diferença de stack que muda tudo

| | Zennith | Dashboard-CLV |
|---|---|---|
| Framework | Next.js 15 App Router (SSR) | Vite + React 18 SPA (client-only) |
| Mutação de dados | Server Actions (`app/actions/*`) | Cliente → Supabase **direto** + funções `api/*` |
| Client Supabase | `@supabase/ssr` (cookies, server) | `@supabase/supabase-js` com **anon key no browser** |
| Camada server | Server Actions + Route Handlers | Funções serverless Vercel (`api/*.js`, service-role) |
| Linguagem | TypeScript | **JS/JSX puro** (sem TS) |

**Duas consequências que governam todo o resto:**

1. **RLS é a ÚNICA fronteira de segurança para o cliente.** Como o browser fala com o Supabase
   usando a `anon key` (`src/lib/supabase.js`), qualquer `SELECT`/`INSERT`/`UPDATE`/`DELETE` do
   usuário passa direto pelo Postgres. Uma tabela em `public` **sem RLS habilitado = leitura e
   escrita liberadas para qualquer visitante anônimo**. No Zennith isso já era crítico; aqui é
   ainda mais, porque não há uma camada de Server Action no meio. → skill **`rls-hardening`**.

2. **As funções `api/*` são o equivalente das Server Actions.** Elas usam
   `SUPABASE_SERVICE_ROLE_KEY`, que **bypassa RLS**. Portanto cada função `api/*` precisa do mesmo
   "guard" que toda Server Action do Zennith tinha: autenticação + rate-limit + validação de input
   + **nunca confiar em `user_id` vindo do corpo/query**. → skill **`api-guard`**.

### Lição de processo (achado real no Zennith)

`docs/architecture.md` do Zennith afirmava que o webhook do WhatsApp validava assinatura
HMAC-SHA256. O handler real **não validava nada** — só o webhook da Pluggy validava. **Controle
documentado ≠ controle implementado.** Regra a carregar: audite segurança lendo o *código*, não a
doc. (Foi assim que o `security-reviewer` deste projeto deve operar.)

---

## 1. Segurança multi-tenant (RLS-first) → skill `rls-hardening`

### Política base

Toda tabela com dados de usuário isola por `user_id`:

```sql
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_veiculos" ON public.veiculos
  AS PERMISSIVE FOR ALL
  USING (auth.uid() = user_id);
```

### Split SELECT vs ALL (linhas compartilhadas/default)

Quando existem linhas "de sistema" visíveis a todos (ex.: catálogo, categorias default),
use `user_id IS NULL` e **separe** a policy de leitura da de escrita:

```sql
-- Todos leem defaults (user_id IS NULL) + as próprias
CREATE POLICY "read_own_and_default" ON public.categorias
  AS PERMISSIVE FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

-- Mas só escreve nas próprias
CREATE POLICY "write_own" ON public.categorias
  AS PERMISSIVE FOR ALL
  USING (auth.uid() = user_id);
```

### Funções privilegiadas: `SECURITY DEFINER` + `search_path` + `REVOKE`

Triggers e RPCs que rodam com privilégio elevado são superfície de ataque. Padrão do Zennith
(migration `20260612000001_multi_tenant_hardening.sql`):

```sql
CREATE OR REPLACE FUNCTION public.minha_funcao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp   -- evita hijack de search_path
AS $$ ... $$;

-- Cron/trigger-only: ninguém chama direto pela API
REVOKE ALL     ON FUNCTION public.minha_funcao() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.minha_funcao() FROM anon, authenticated;
```

RPCs que *o usuário* chama (ex.: `delete_own_data`) permanecem `EXECUTE` para `authenticated`,
mas **fazem o scoping internamente** por `auth.uid()` — nunca aceitam um id de alvo do cliente.

### Tabelas acessadas só por service-role (webhooks)

Se uma tabela só é escrita por função serverless (service-role), habilite RLS **sem policy de
cliente** — o service-role bypassa RLS, o cliente fica trancado:

```sql
ALTER TABLE public.raw_webhook_events ENABLE ROW LEVEL SECURITY;
-- sem CREATE POLICY: anon/authenticated não leem nada; service-role continua acessando
```

### Gate de deploy (checklist obrigatório)

1. Supabase MCP `get_advisors(type: security)` → **sem ERROR**, sem `rls_disabled_in_public`,
   sem `*_security_definer_function_executable` novo.
2. Script de teste de isolamento (ver skill) → **exit 0**.
3. Ao criar tabela nova com `user_id`: RLS on + policy `auth.uid()=user_id` + uma asserção de
   leitura/escrita cruzada no teste de isolamento.
4. Ative **leaked-password protection** no Supabase Auth (HaveIBeenPwned).

### Antipadrão de migration a corrigir aqui

Hoje o Dashboard-CLV tem migrations soltas (`SUPABASE_MIGRATION_v3.x.sql`) sem ordenação
determinística. Migre para **nome com timestamp ordenável** (`YYYYMMDDHHMMSS_descricao.sql`) e
**idempotência** (`IF NOT EXISTS`, `DROP ... IF EXISTS` antes de recriar índices). Ver skill
`nova-migracao` (existente) + `rls-hardening`.

---

## 2. Guard de funções serverless → skill `api-guard`

O Zennith centralizava **auth + rate-limit + client** em um único helper `guardAction`
(`lib/action-guard.ts`) usado por *toda* Server Action:

```ts
// Zennith — padrão original (TS)
export async function guardAction(limiter) {
  const decision = await limiter.protect(await arcjetRequest())
  if (decision.isDenied()) return { ok: false, error: '...' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autorizado.' }
  return { ok: true, user, supabase }
}
```

Reenquadrado para `api/*.js` do Dashboard-CLV (JS, serverless, service-role):

```js
// api/_guard.js — auth + validação para funções serverless
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,   // bypassa RLS — server-only
)

/**
 * Guarda padrão de função serverless autenticada.
 * @returns {{ ok: true, userId: string, admin }|{ ok: false, status: number, error: string }}
 */
export async function guard(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, error: 'Token ausente' }

  // Valida o JWT do usuário (rejeita tokens revogados/expirados)
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return { ok: false, status: 401, error: 'Token inválido' }

  // userId vem SEMPRE do token verificado — nunca de req.body.user_id
  return { ok: true, userId: user.id, admin }
}
```

Regras que o Zennith provou valerem a pena:

- **`user_id` nunca vem do cliente.** Vem do token/sessão validada. (No Zennith todo insert usava
  `user_id: user.id` do `getUser()`, jamais do payload.)
- **Validação explícita de input** antes de tocar no banco. O Zennith usava Zod; aqui, sem TS, um
  validador manual pequeno com mensagens que incluem o valor/shape esperado (convenção do
  `CLAUDE.md` do projeto) resolve.
- **Retorno de erro estruturado** (`{ error }` + status), nunca lançar stack pro cliente.
- **Rate-limit** na entrada. O Zennith usava Arcjet; aqui basta um limitador por `userId`/IP.
- **Lição Arcjet ByteString:** ao repassar headers de request para bibliotecas que constroem
  `Headers` do Web API, só encaminhe `x-forwarded-for` + `user-agent`. Headers de infra da Vercel
  (`x-vercel-ip-city`) podem conter Unicode e estouram `ByteString`.

---

## 3. PII / LGPD → skill `pii-lgpd`

**Risco atual:** `api/olx-webhook.js` grava `nome`, `telefone`, `email` de leads em **texto claro**
na tabela `leads`. PII de terceiros sob LGPD.

Padrão do Zennith (`lib/encrypt.ts`):

- **Cifra em repouso com AES-256-GCM.** Formato de armazenamento: `base64(iv[12] || ciphertext || authTag[16])`.
  Chave de 32 bytes em `ENCRYPTION_KEY` (hex de 64 chars), **nunca** no cliente.

```js
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
const ALGO = 'aes-256-gcm'

/** Cifra PII. Formato: base64(iv[12] || ct || tag[16]). */
export function encrypt(plaintext) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')   // 32 bytes
  const iv  = randomBytes(12)
  const c   = createCipheriv(ALGO, key, iv)
  const body = Buffer.concat([c.update(plaintext, 'utf8'), c.final()])
  return Buffer.concat([iv, body, c.getAuthTag()]).toString('base64')
}
```

- **Lookup determinístico por hash.** Não dá pra indexar/buscar campo cifrado com IV aleatório.
  Guarde uma coluna `*_hash = SHA-256(valor normalizado)` para buscar sem expor o valor em índice
  ou log. (No Zennith: `phone_hash` = SHA-256 do E.164; o número real fica em `phone_encrypted`.)

```js
export function hashParaLookup(valorNormalizado) {
  return createHash('sha256').update(valorNormalizado, 'utf8').digest('hex')
}
```

- **Máscaras de exibição.** Ex.: `•••.•••.XXX-XX` (CPF, 5 últimos dígitos), `+55 (••) •••••-XXXX`
  (telefone, 4 últimos). O componente nunca recebe o valor completo se não precisar.

- **Direito ao esquecimento (LGPD):** RPC `SECURITY DEFINER` que apaga os dados **do próprio**
  `auth.uid()` — nunca de um id arbitrário. Testar isolamento cross-tenant.

---

## 4. Webhooks seguros → skill `secure-webhooks`

O `api/olx-webhook.js` **já acerta** vários pontos (codificá-los como padrão): ack rápido dentro do
timeout do provider, persistência de raw-event, idempotência por `external_id` com
`resolution=ignore-duplicates`, `sanitizeHeaders` para nunca logar tokens, logging JSON estruturado.

O que **falta** e o Zennith ensina (webhook da Pluggy, `app/api/webhooks/open-finance/route.ts`):

- **Verificação de assinatura HMAC-SHA256 com comparação timing-safe**, para providers que assinam
  o corpo (ex.: Mercado Livre). Nunca use `===` para comparar assinaturas:

```js
import { createHmac } from 'crypto'

/** Valida assinatura HMAC-SHA256 do corpo cru. Comparação em tempo constante. */
export function assinaturaValida(rawBody, signature, secret) {
  if (!secret || !signature) return false
  const esperado = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
  if (esperado.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}
```

- **Verifique sobre o corpo CRU** (string), antes de qualquer `JSON.parse`. Reserializar muda bytes
  e quebra o HMAC.
- **Ack primeiro, processa depois.** O provider exige 2XX rápido (OLX: 5s; Meta: 3s). No Zennith,
  o Next.js usava `after()`; em função serverless Vercel, responda 200 e dispare o processamento
  pesado como fire-and-forget (`processar(...).catch(log)`) — ou empurre para uma fila. Retornar
  200 antes de terminar evita reentregas duplicadas do provider.
- **Idempotência é obrigatória** porque providers reenviam. Chave estável (`external_id`; se
  ausente, hash de campos estáveis do payload, como o `gerarIdempotencyKey` já faz) + índice único
  no banco. (Lição de dedup do Zennith: bancos reusam identificadores entre parcelas — a identidade
  real de duplicata pode precisar de **chave composta** `(user_id, external_id, data, valor)`, não
  só o id.)
- **Nunca logar segredos** (`Authorization`, `x-api-key`, `cookie`) — `sanitizeHeaders`.

---

## 5. Integrações externas / OAuth → skill `oauth-integrations`

`api/ml-token.js` troca o `authorization_code` do ML por tokens server-side (bom: `client_secret`
fora do browser). **Antipadrão a corrigir:** hoje ele **devolve `access_token`/`refresh_token` ao
browser**. Tokens de longa duração não devem transitar/persistir no cliente.

Padrão a adotar:

- **Tokens vivem só no servidor**, cifrados em repouso (reuse `pii-lgpd`/`encrypt`), numa tabela
  `integracoes` protegida por RLS/service-role. O cliente nunca vê `access_token`/`refresh_token`.
- **Refresh proativo:** renove antes de `expires_in` expirar; guarde `expires_at`. Chamadas de saída
  passam por um helper que garante token válido.
- **Adaptador por plataforma:** manter o padrão `src/lib/plataformas/*` (ML real, stubs OLX/iCarros)
  com uma interface fina e única por plataforma — troca de provider não vaza para o resto do app
  (convenção "wrap third-party libs behind a thin interface" do `CLAUDE.md`).
- **Idempotência no publish de saída** (autoupload de anúncios): repetir a publicação não pode
  duplicar o anúncio — use o `listing_id`/`adId` como chave.

---

## 6. Catálogo de bugs & fixes do Zennith (antipadrões a evitar)

Extraídos do histórico de commits — cada um custou um ciclo de debug:

- **NULL em trigger de saldo** (`fix(trigger): corrige NULL payment_method`): triggers
  `SECURITY DEFINER` que assumem colunas não-nulas quebram em UPDATE parcial. Sempre trate NULL e
  use `COALESCE(NEW, OLD)` no retorno.
- **Colisão de índice único no dedup** (`fix(import): commitImport pula FITID repetido no lote`):
  ao inserir lote com possível duplicata interna, deduplique **dentro do arquivo** antes do insert,
  senão o índice único aborta o lote inteiro.
- **Identidade de duplicata composta**: um id externo sozinho não é único (parcelas reusam FITID).
  Índice `(user_id, external_id, date, amount) WHERE external_id IS NOT NULL`.
- **Modal quebrado sob CSS transform** (`fix(import): render modal via portal`): `position: fixed`
  dentro de um ancestral com `transform` fica preso ao ancestral. Renderize modais/overlays via
  portal na raiz. (Relevante ao design system inline com `s.overlay`/`s.modal` deste projeto.)
- **Drawer/edit fora da viewport ao rolar** (`fix(ui): keep edit drawer pinned to viewport`):
  ancore overlays à viewport, não ao fluxo do documento.
- **PWA/instalação iOS** (`e52a674`): iOS trata manifest/service-worker diferente; testar install
  no device real, não só no desktop.
- **Coluna/grant faltando em dev local** (`fix(db): add missing tutorial_completed_at column and
  table grants`): migrations que rodam em prod mas não em dev local geram drift. Mantenha migrations
  idempotentes e aplicáveis do zero.
- **Race condition em webhook de billing** (`fix(billing): correct webhook handler period
  advancement`): webhooks concorrentes/reentregues avançavam período em dobro. Idempotência + lock
  por chave de evento.

---

## 7. Guidelines Karpathy aplicadas a este material

- **Simplicidade primeiro:** o conjunto de skills é focado (5), não especulativo. Não há skill para
  features que o Dashboard-CLV não tem (agente WhatsApp, motor de faturas do Zennith).
- **Mudanças cirúrgicas:** ao aplicar qualquer skill, tocar só no necessário; casar o estilo
  existente (inline styles + tokens `C`/`s`, JS puro, funções 4–20 linhas).
- **Critérios verificáveis:** cada skill declara um teste objetivo (advisors sem ERROR, 401 sem
  token, round-trip de cifra, sem duplicata em replay). "Funciona" = o check passa.
- **Explicitar suposições:** a maior aqui é que o cliente usa anon key direto → RLS é a fronteira.
  Se isso mudar (ex.: mover mutações para `api/*`), reavaliar `rls-hardening` vs `api-guard`.

---

## Índice de skills relacionadas

| Skill | Arquivo | Cobre |
|---|---|---|
| `rls-hardening` | `.claude/skills/rls-hardening/SKILL.md` | RLS em toda tabela, REVOKE, advisors, teste de isolamento |
| `api-guard` | `.claude/skills/api-guard/SKILL.md` | Auth + rate-limit + validação nas funções `api/*` |
| `pii-lgpd` | `.claude/skills/pii-lgpd/SKILL.md` | Cifra AES-256-GCM, hash de lookup, máscaras, esquecimento |
| `secure-webhooks` | `.claude/skills/secure-webhooks/SKILL.md` | HMAC timing-safe, ack rápido, idempotência, raw-event |
| `oauth-integrations` | `.claude/skills/oauth-integrations/SKILL.md` | Tokens server-only, refresh, adaptador por plataforma |
| `nova-migracao` (existente) | `.claude/skills/nova-migracao/SKILL.md` | Scaffold de migration + checklist RLS |
