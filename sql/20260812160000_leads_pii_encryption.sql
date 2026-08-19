-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 20260812160000 — Cifragem de PII em leads (nome/telefone/email)
-- ═══════════════════════════════════════════════════════════════════════════
-- Contexto: docs/CRM_SPEC_CLV_Dashboard.md §2.4 + skill pii-lgpd. leads.nome/
-- telefone/email estão em texto claro desde a criação da tabela. A partir
-- desta migration, api-leads.js passa a gravar apenas as colunas *_encrypted
-- (AES-256-GCM via api/_crypto.js, chamado através de api/leads-pii-cifrar.js)
-- e a decifrar sob demanda na leitura (api/leads-pii-revelar.js).
--
-- As colunas de texto claro (nome/telefone/email) são MANTIDAS nesta
-- migration — linhas antigas continuam legíveis por elas até rodar um
-- backfill (fora do SQL, precisa da chave ENCRYPTION_KEY) e uma migration de
-- limpeza subsequente que as remova. Não há DROP COLUMN aqui.
--
-- nome perde o NOT NULL porque o valor passa a viver em nome_encrypted;
-- goes-forward inserts não escrevem mais texto claro em nome.
--
-- Idempotente: pode rodar do zero e re-rodar sem erro.

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS nome_encrypted     text,
  ADD COLUMN IF NOT EXISTS telefone_encrypted text,
  ADD COLUMN IF NOT EXISTS telefone_hash      text,
  ADD COLUMN IF NOT EXISTS email_encrypted    text;

ALTER TABLE public.leads ALTER COLUMN nome DROP NOT NULL;

CREATE INDEX IF NOT EXISTS leads_telefone_hash_idx ON public.leads (telefone_hash);

COMMIT;
