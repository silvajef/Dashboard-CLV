-- ============================================================
-- Migração: Integração de Leads OLX
-- Executar no Supabase → SQL Editor
-- ============================================================

-- 1. Tabela de eventos brutos do webhook (PersistenciaOLX.md)
--    Armazena o payload original antes de qualquer transformação.
CREATE TABLE IF NOT EXISTS raw_webhook_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    TEXT        NOT NULL,                         -- 'olx'
  payload     JSONB       NOT NULL,                         -- payload bruto
  headers     JSONB,                                        -- headers sanitizados
  status      TEXT        NOT NULL DEFAULT 'received',      -- received | processed | failed
  error_msg   TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS raw_webhook_events_provider_idx
  ON raw_webhook_events(provider, received_at DESC);

-- 2. Colunas adicionais na tabela leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS external_id  TEXT,              -- ID externo (externalId OLX)
  ADD COLUMN IF NOT EXISTS provider     TEXT,              -- 'olx'
  ADD COLUMN IF NOT EXISTS source       TEXT,              -- 'chat', 'email', etc.
  ADD COLUMN IF NOT EXISTS user_id      UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS raw_event_id UUID REFERENCES raw_webhook_events(id);

-- Idempotência: mesmo externalId+provider nunca cria duplicata (SegurancaOLX.md)
CREATE UNIQUE INDEX IF NOT EXISTS leads_external_provider_unique
  ON leads(external_id, provider)
  WHERE external_id IS NOT NULL;

-- 3. Colunas de webhook na tabela integracoes
ALTER TABLE integracoes
  ADD COLUMN IF NOT EXISTS webhook_token       TEXT,        -- token único por integração
  ADD COLUMN IF NOT EXISTS webhook_config_id   TEXT,        -- config_id enviado ao OLX
  ADD COLUMN IF NOT EXISTS webhook_configurado BOOLEAN DEFAULT false;

-- 4. RLS para raw_webhook_events (leitura apenas pelo dono via leads)
ALTER TABLE raw_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role (webhook) pode inserir/atualizar sem RLS
-- Usuários autenticados lêem apenas eventos linkados aos seus próprios leads
CREATE POLICY IF NOT EXISTS "usuarios leem seus raw events" ON raw_webhook_events
  FOR SELECT USING (
    id IN (
      SELECT raw_event_id FROM leads WHERE user_id = auth.uid()
    )
  );
