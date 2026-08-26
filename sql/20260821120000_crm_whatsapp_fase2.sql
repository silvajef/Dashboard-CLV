-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 20260821120000 — CRM/WhatsApp Fase 2: estado do bot de triagem
-- ═══════════════════════════════════════════════════════════════════════════
-- Contexto: docs/CRM_SPEC_CLV_Dashboard.md — Fase 2. whatsapp_threads (criada
-- na Fase 1, schema-only) ganha as colunas de estado da conversa com o bot
-- de qualificação (pergunta atual, respostas capturadas, tentativas
-- inválidas). Não é uma tabela nova — é 1:1 com (lead_id, numero_whatsapp),
-- já tem RLS por papel desde a Fase 1; o histórico de mensagens continua
-- vivendo em leads_atividades (canal='whatsapp'), que não muda aqui.
--
-- raw_webhook_events ganha external_id (o wamid do Meta) + índice único pra
-- idempotência — mesmo padrão do webhook OLX removido (ON CONFLICT DO
-- NOTHING): uma entrega repetida do Meta é ignorada, não reprocessada.
--
-- leads.telefone_hash ganha índice único (parcial, ignora NULL) — sem isso,
-- duas mensagens quase simultâneas do mesmo número (comum no WhatsApp) or
-- um reenvio da Meta durante uma janela de corrida podiam criar dois leads
-- pro mesmo telefone; o webhook passa a usar INSERT ... ON CONFLICT DO
-- NOTHING + re-SELECT em vez de check-then-insert.
--
-- Idempotente: pode rodar do zero e re-rodar sem erro.

BEGIN;

-- ── 1. WHATSAPP_THREADS — estado do bot de qualificação ────────────────────
ALTER TABLE public.whatsapp_threads
  ADD COLUMN IF NOT EXISTS bot_estado                  text NOT NULL DEFAULT 'coletando',
  ADD COLUMN IF NOT EXISTS bot_pergunta_atual           smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bot_respostas                jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS bot_tentativas_invalidas     smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultima_mensagem_recebida_em  timestamptz;

ALTER TABLE public.whatsapp_threads DROP CONSTRAINT IF EXISTS whatsapp_threads_bot_estado_check;
ALTER TABLE public.whatsapp_threads ADD CONSTRAINT whatsapp_threads_bot_estado_check
  CHECK (bot_estado IN ('coletando', 'aguardando_humano', 'concluido'));

-- ── 2. RAW_WEBHOOK_EVENTS — idempotência por (provider, external_id) ───────
ALTER TABLE public.raw_webhook_events
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS raw_webhook_events_provider_external_key
  ON public.raw_webhook_events (provider, external_id)
  WHERE external_id IS NOT NULL;

-- ── 3. LEADS — telefone_hash único (parcial), fecha corrida de duplicidade ─
CREATE UNIQUE INDEX IF NOT EXISTS leads_telefone_hash_key
  ON public.leads (telefone_hash)
  WHERE telefone_hash IS NOT NULL;

-- O índice não-único antigo (leads_telefone_hash_idx, da migration de PII)
-- fica redundante com o único acima; removê-lo evita manter dois índices
-- fazendo a mesma coisa.
DROP INDEX IF EXISTS public.leads_telefone_hash_idx;

COMMIT;
