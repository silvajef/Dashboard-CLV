---
name: rls-hardening
description: Blinda o isolamento multi-tenant no Supabase (RLS em toda tabela, REVOKE em funções privilegiadas, advisors e teste de isolamento). Use ao criar/alterar tabelas, políticas ou funções SQL, ou antes de um deploy.
---

Endureça o isolamento por `user_id` do Dashboard-CLV. **Premissa crítica:** o cliente fala com o
Supabase usando a `anon key` no browser (`src/lib/supabase.js`), então **RLS é a única fronteira de
segurança para leitura/escrita do usuário** — uma tabela em `public` sem RLS habilitado fica exposta
a qualquer visitante anônimo. Contexto completo em [`docs/aprendizados-zennith.md`](../../../docs/aprendizados-zennith.md) §1.

Complementa a skill `nova-migracao` (que faz o scaffold); aqui está a *disciplina* de segurança.

## Quando aplicar

- Criou/alterou tabela em `public`.
- Criou/alterou função SQL, trigger ou RPC.
- Vai fazer deploy (rode o gate abaixo antes).

## Passos

1. **Toda tabela com dados de usuário tem RLS + política base:**
   ```sql
   ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "users_own_<tabela>" ON public.<tabela>
     AS PERMISSIVE FOR ALL
     USING (auth.uid() = user_id);
   ```

2. **Linhas compartilhadas/default** (visíveis a todos): separe leitura de escrita.
   ```sql
   CREATE POLICY "read_own_and_default" ON public.<tabela>
     AS PERMISSIVE FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
   CREATE POLICY "write_own" ON public.<tabela>
     AS PERMISSIVE FOR ALL USING (auth.uid() = user_id);
   ```

3. **Tabelas só de service-role** (ex.: `raw_webhook_events`, logs de webhook): habilite RLS **sem
   política de cliente**. O service-role bypassa RLS; anon/authenticated ficam trancados.
   ```sql
   ALTER TABLE public.raw_webhook_events ENABLE ROW LEVEL SECURITY;
   -- sem CREATE POLICY: cliente não lê nada
   ```

4. **Funções privilegiadas** (`SECURITY DEFINER`): fixe `search_path` e revogue execução de quem
   não deve chamar direto.
   ```sql
   CREATE OR REPLACE FUNCTION public.<funcao>() ...
   SECURITY DEFINER
   SET search_path = public, pg_temp
   AS $$ ... $$;

   -- cron/trigger-only:
   REVOKE ALL     ON FUNCTION public.<funcao>() FROM PUBLIC;
   REVOKE EXECUTE ON FUNCTION public.<funcao>() FROM anon, authenticated;
   ```
   RPC chamada pelo usuário (ex.: `delete_own_data`) mantém `EXECUTE` para `authenticated`, mas faz
   o scoping **internamente por `auth.uid()`** — nunca aceita id de alvo do cliente.

5. **Migrations idempotentes e ordenáveis:** nome `YYYYMMDDHHMMSS_descricao.sql`, use `IF NOT EXISTS`
   / `DROP ... IF EXISTS` antes de recriar índices. Devem aplicar do zero sem erro.

## Verificação (gate de deploy — obrigatório)

1. Supabase MCP `get_advisors(type: security)` → **sem ERROR**, sem `rls_disabled_in_public`, sem
   `*_security_definer_function_executable` novo.
2. Teste de isolamento cross-tenant → **exit 0**. Se não existir, crie `scripts/test-isolation.mjs`:
   com dois usuários (A, B) + um client anon, afirme que **A não lê nem escreve linha de B** e que
   **anon não lê nada** de cada tabela com `user_id`. Ao adicionar tabela nova, adicione a asserção dela.
3. Ative **leaked-password protection** no Supabase Auth (HaveIBeenPwned).

Mostre o SQL final e o resultado dos advisors + teste de isolamento.
