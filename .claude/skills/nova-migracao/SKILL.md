---
name: nova-migracao
description: Cria um novo arquivo de migração SQL para o Supabase com nome versionado e checklist de segurança
disable-model-invocation: false
---

Crie uma nova migração SQL para o Supabase seguindo o padrão do projeto.

O argumento {args} deve ser a versão (ex: "v3.10") ou uma descrição curta (ex: "add_tabela_relatorios").

## Passos

1. Determine o nome do arquivo:
   - Se {args} começa com "v", use: `SUPABASE_MIGRATION_{args}.sql`
   - Caso contrário, use: `SUPABASE_MIGRATION_{args}.sql`
   - Crie o arquivo na **raiz do projeto** (não em `src/`)

2. Inclua no início do arquivo:
   ```sql
   -- Migração: {args}
   -- Data: {data_atual}
   -- Descrição: (preencha aqui)
   ```

3. Após escrever o SQL, aplique o checklist de segurança:
   - [ ] Toda nova tabela em schema `public` tem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - [ ] Políticas RLS criadas para `anon` e `authenticated` conforme necessário
   - [ ] Funções `security definer` estão em schema privado (não `public`)
   - [ ] Views em schema exposto usam `WITH (security_invoker = true)` (Postgres 15+)
   - [ ] GRANTs explícitos concedidos apenas aos roles necessários

4. Mostre o conteúdo completo do arquivo criado e o checklist preenchido.
