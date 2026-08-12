---
name: api-guard
description: Padrão de guarda (auth + rate-limit + validação) para funções serverless Vercel em api/*. Use ao criar ou revisar qualquer função em api/ que leia/escreva dados ou chame APIs externas com privilégio.
---

Toda função serverless em `api/*.js` usa `SUPABASE_SERVICE_ROLE_KEY`, que **bypassa RLS**. Portanto
ela é o equivalente de uma Server Action e precisa do mesmo guard que o Zennith aplicava em toda
mutação: **autenticação + rate-limit + validação de input + `user_id` sempre do token, nunca do
cliente**. Contexto em [`docs/aprendizados-zennith.md`](../../../docs/aprendizados-zennith.md) §2.

## Quando aplicar

- Nova função em `api/` que lê/escreve dados do usuário ou chama API externa com privilégio.
- Revisão de função existente (`api/ml-api.js`, `api/olx-import.js`, etc.).
- Exceção: webhooks de provider (autenticados por assinatura/token do provider) → use `secure-webhooks`.

## Passos

1. **Crie/reuse o guard compartilhado** `api/_guard.js`:
   ```js
   import { createClient } from '@supabase/supabase-js'

   const admin = createClient(
     process.env.VITE_SUPABASE_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY,   // server-only, bypassa RLS
   )

   /**
    * Autentica a requisição pelo Bearer token do Supabase.
    * @returns {{ ok: true, userId: string, admin }|{ ok: false, status: number, error: string }}
    */
   export async function guard(req) {
     const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
     if (!token) return { ok: false, status: 401, error: 'Token ausente' }
     const { data: { user }, error } = await admin.auth.getUser(token)
     if (error || !user) return { ok: false, status: 401, error: 'Token inválido' }
     return { ok: true, userId: user.id, admin }
   }
   ```

2. **Use no handler; derive `user_id` só do guard:**
   ```js
   import { guard } from './_guard.js'

   export default async function handler(req, res) {
     if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

     const g = await guard(req)
     if (!g.ok) return res.status(g.status).json({ error: g.error })
     const { userId, admin } = g

     const dados = validar(req.body)          // passo 3
     if (dados.erro) return res.status(400).json({ error: dados.erro })

     // user_id vem de userId (token), NUNCA de req.body.user_id
     const { error } = await admin.from('<tabela>').insert({ ...dados.valor, user_id: userId })
     if (error) return res.status(500).json({ error: 'Falha ao gravar' })
     return res.status(200).json({ success: true })
   }
   ```

3. **Validação explícita de input** (sem TS — validador manual pequeno; mensagem inclui o valor e o
   shape esperado, conforme `CLAUDE.md`):
   ```js
   /** @returns {{ valor: object }|{ erro: string }} */
   function validar(body) {
     if (!body || typeof body !== 'object') return { erro: `body inválido: esperado objeto, recebi ${typeof body}` }
     if (!body.nome || typeof body.nome !== 'string') return { erro: `campo "nome" obrigatório (string), recebi ${JSON.stringify(body.nome)}` }
     return { valor: { nome: body.nome.trim() } }
   }
   ```

4. **Rate-limit** por `userId`/IP na entrada (janela deslizante). Ao integrar biblioteca que
   constrói `Headers` do Web API, encaminhe **só** `x-forwarded-for` + `user-agent` — headers de
   infra da Vercel podem conter Unicode e estouram `ByteString` (lição Arcjet do Zennith).

## Regras invioláveis

- `user_id` **nunca** vem de `req.body`/`req.query` — só do token verificado.
- Nunca vaze stack/erro interno ao cliente; retorne `{ error }` + status.
- Service-role só no servidor; jamais exponha `SUPABASE_SERVICE_ROLE_KEY` ao browser.

## Verificação

- Chamada sem `Authorization` → **401**.
- `req.body.user_id` forjado → **ignorado** (linha gravada com o id do token).
- Rajada acima do limite → **429**.
- Input malformado → **400** com mensagem citando o campo e o valor recebido.
