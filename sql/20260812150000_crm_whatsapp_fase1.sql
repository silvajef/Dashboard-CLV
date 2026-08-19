-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 20260812150000 — CRM/WhatsApp Fase 1: campos de leads, canal de
-- atividade, tabela whatsapp_threads
-- ═══════════════════════════════════════════════════════════════════════════
-- Contexto: docs/CRM_SPEC_CLV_Dashboard.md — Fase 1 do módulo de CRM. Estende
-- leads/leads_atividades (que já existem e já têm RLS por papel desde
-- 20260708120000_rls_crm_role_policies.sql) e cria whatsapp_threads como
-- única tabela nova, pronta para o webhook da Fase 2 (provedor ainda não
-- escolhido — schema não depende dessa escolha).
--
-- Cifragem de PII (nome/telefone/email) é migration separada — ver
-- 20260812160000_leads_pii_encryption.sql.
--
-- Idempotente: pode rodar do zero e re-rodar sem erro.

BEGIN;

-- ── 1. LEADS — novos campos de negócio ──────────────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS motivo_perda           text,
  ADD COLUMN IF NOT EXISTS valor_estimado         numeric(12,2),
  ADD COLUMN IF NOT EXISTS veiculo_desejado_texto text;

-- status: adiciona 'qualificado' e 'negociacao' ao funil existente
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('novo','contato','qualificado','visita','proposta','negociacao','ganho','perdido'));

-- plataforma_origem: adiciona 'whatsapp' e 'indicacao' aos slugs de marketplace
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_plataforma_origem_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_plataforma_origem_check
  CHECK (plataforma_origem IN ('mercadolivre','olx','icarros','mobiauto','napista','manual','whatsapp','indicacao'));

-- ── 2. LEADS_ATIVIDADES — canal da interação + tipos de mensagem ───────────
ALTER TABLE public.leads_atividades
  ADD COLUMN IF NOT EXISTS canal text;

ALTER TABLE public.leads_atividades DROP CONSTRAINT IF EXISTS leads_atividades_canal_check;
ALTER TABLE public.leads_atividades ADD CONSTRAINT leads_atividades_canal_check
  CHECK (canal IS NULL OR canal IN ('whatsapp','ligacao','presencial','email','sistema'));

ALTER TABLE public.leads_atividades DROP CONSTRAINT IF EXISTS leads_atividades_tipo_check;
ALTER TABLE public.leads_atividades ADD CONSTRAINT leads_atividades_tipo_check
  CHECK (tipo IN ('mensagem','mensagem_recebida','mensagem_enviada','ligacao','visita','proposta','nota','status','agendamento'));

-- ── 3. WHATSAPP_THREADS — nova, mesmo padrão bigint identity do resto do schema
CREATE TABLE IF NOT EXISTS public.whatsapp_threads (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id            bigint NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  numero_whatsapp    text NOT NULL,
  thread_provider_id text,
  ultima_mensagem_em timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_threads_numero_key ON public.whatsapp_threads (numero_whatsapp);
CREATE INDEX IF NOT EXISTS whatsapp_threads_lead_id_idx ON public.whatsapp_threads (lead_id);

ALTER TABLE public.whatsapp_threads ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de leads/leads_atividades: SELECT aberto ao autenticado,
-- escrita por papel (admin/operador/vendedor), DELETE só admin.
DROP POLICY IF EXISTS "whatsapp_threads_select" ON public.whatsapp_threads;
DROP POLICY IF EXISTS "whatsapp_threads_insert" ON public.whatsapp_threads;
DROP POLICY IF EXISTS "whatsapp_threads_update" ON public.whatsapp_threads;
DROP POLICY IF EXISTS "whatsapp_threads_delete" ON public.whatsapp_threads;

CREATE POLICY "whatsapp_threads_select" ON public.whatsapp_threads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "whatsapp_threads_insert" ON public.whatsapp_threads
  FOR INSERT TO authenticated
  WITH CHECK (public.meu_role() IN ('admin', 'operador', 'vendedor'));
CREATE POLICY "whatsapp_threads_update" ON public.whatsapp_threads
  FOR UPDATE TO authenticated
  USING (public.meu_role() IN ('admin', 'operador', 'vendedor'));
CREATE POLICY "whatsapp_threads_delete" ON public.whatsapp_threads
  FOR DELETE TO authenticated
  USING (public.meu_role() = 'admin');

COMMIT;
