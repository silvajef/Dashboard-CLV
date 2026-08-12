-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 20260708140000 — remove a feature de anúncios/OAuth (código + tabelas)
-- ═══════════════════════════════════════════════════════════════════════════
-- Decisão (2026-07-08): a publicação de anúncios via OAuth (ML/OLX) foi a fonte da
-- maior parte da dívida de segurança (tokens no browser). Removida por completo.
-- Leads permanece (fonte migra para WhatsApp em fase futura). Mantidas as tabelas
-- leads, leads_atividades e raw_webhook_events (genérica, reutilizável).
--
-- Ordem: soltar a FK leads.anuncio_id → anuncios antes de dropar anuncios.
-- integracoes não tem FK de entrada. Idempotente.

BEGIN;

-- leads deixa de referenciar anuncios (mantém veiculo_id, raw_event_id)
ALTER TABLE public.leads DROP COLUMN IF EXISTS anuncio_id;

-- anuncios: também sai da publicação supabase_realtime ao ser dropada
DROP TABLE IF EXISTS public.anuncios;

-- integracoes: tokens OAuth cifrados/claros — não há mais integração
DROP TABLE IF EXISTS public.integracoes;

COMMIT;
