---
name: nova-migracao
description: Aplica uma mudança de schema/RLS/função direto no Supabase via MCP (apply_migration), sem criar arquivo .sql, com inspeção prévia e checklist de segurança
disable-model-invocation: false
---

Aplique uma mudança de banco no Supabase seguindo o fluxo do projeto.

O argumento {args} é uma descrição curta em snake_case (ex.: `add_tabela_relatorios`).

**Não crie arquivo `.sql`.** O histórico vive no próprio Supabase
(`supabase_migrations.schema_migrations`, visível em Database → Migrations).
Arquivos soltos divergiam do banco real e geravam retrabalho; foram removidos em 28/10/2026.

Projeto: `kicsrbhzgfhullgacszb` (Dashboard CLV).

## Passos

1. **Inspecione o estado atual** antes de escrever qualquer SQL. Nunca confie em
   documentação nem no código para saber o schema:
   - tabelas e colunas: `list_tables` (verbose)
   - funções que serão recriadas: `SELECT pg_get_functiondef('public.<nome>()'::regprocedure)`
   - policies: `SELECT * FROM pg_policies WHERE tablename = '<tabela>'`
   - dados afetados: conte as linhas que um UPDATE/DELETE vai tocar

2. **Escreva o SQL idempotente** (`IF NOT EXISTS`, `CREATE OR REPLACE`,
   `DROP POLICY IF EXISTS`), sem `BEGIN/COMMIT` (o `apply_migration` já é transacional).

3. **Checklist de segurança** (ver também a skill `rls-hardening`):
   - [ ] Toda tabela nova em `public` tem `ENABLE ROW LEVEL SECURITY`
   - [ ] Policies por papel via `meu_role()`, sem `USING (true)` em escrita
   - [ ] Funções `SECURITY DEFINER` com `SET search_path = public, pg_temp` e
         `REVOKE EXECUTE ... FROM anon, authenticated` quando não forem RPC
   - [ ] Views expostas com `WITH (security_invoker = true)`
   - [ ] Nada que tire acesso de usuário existente sem conferir os dados antes

4. **Mostre o SQL ao usuário e aplique** com `apply_migration`
   (`name` = {args}). O usuário aprova na confirmação da ferramenta.

5. **Verifique**: `get_advisors` (security) e uma consulta que prove o efeito
   (ex.: a policy nova aparece em `pg_policies`).

6. **Registre no PR** que depende da mudança: nome da migration e, se o código
   precisar dela para funcionar, a ordem (aplicar antes do merge). O SQL completo
   pode ir na descrição do PR, dentro de `<details>`, nunca como arquivo no repo.
