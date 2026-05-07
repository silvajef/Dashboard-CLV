-- ═══════════════════════════════════════════════════════════════════════════
-- FleetControl v3.9 — Processo de Venda
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── processos_venda ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processos_venda (
  id              BIGSERIAL PRIMARY KEY,
  veiculo_id      BIGINT NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,

  -- Comprador
  comprador_nome     TEXT,
  comprador_doc      TEXT,          -- CPF ou CNPJ
  comprador_telefone TEXT,
  comprador_email    TEXT,
  comprador_endereco TEXT,

  -- Valores
  valor_venda   NUMERIC(12,2) DEFAULT 0,
  valor_entrada NUMERIC(12,2) DEFAULT 0,   -- entrada (financiado / troca)

  -- Forma de pagamento: avista | financiado | troca | troca_financiado
  forma_pagamento TEXT NOT NULL DEFAULT 'avista',

  -- Financiamento (quando forma_pagamento = financiado | troca_financiado)
  banco_financiamento TEXT,
  qtd_parcelas        INTEGER,
  valor_parcela       NUMERIC(12,2),

  -- Veículo recebido em troca
  troca_placa  TEXT,
  troca_marca  TEXT,
  troca_modelo TEXT,
  troca_ano    TEXT,
  troca_km     INTEGER,
  troca_cor    TEXT,
  troca_valor  NUMERIC(12,2) DEFAULT 0,

  -- Vendedor / comissão
  vendedor_nome TEXT,
  comissao_pct  NUMERIC(5,2) DEFAULT 0,

  -- Etapas: JSONB array de {tipo, label, icon, concluido, concluido_em, obs}
  etapas JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Status: em_andamento | concluido | cancelado
  status                  TEXT NOT NULL DEFAULT 'em_andamento',
  status_veiculo_anterior TEXT,          -- para restaurar ao cancelar

  obs TEXT,

  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pv_veiculo ON processos_venda(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_pv_status  ON processos_venda(status);

-- Auto-timestamp
CREATE OR REPLACE FUNCTION fn_pv_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_pv_ts ON processos_venda;
CREATE TRIGGER trg_pv_ts
  BEFORE UPDATE ON processos_venda
  FOR EACH ROW EXECUTE FUNCTION fn_pv_ts();

-- RLS
ALTER TABLE processos_venda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pv_select ON processos_venda;
DROP POLICY IF EXISTS pv_insert ON processos_venda;
DROP POLICY IF EXISTS pv_update ON processos_venda;
DROP POLICY IF EXISTS pv_delete ON processos_venda;

CREATE POLICY pv_select ON processos_venda
  FOR SELECT TO authenticated USING (true);

CREATE POLICY pv_insert ON processos_venda
  FOR INSERT TO authenticated
  WITH CHECK (meu_role() IN ('admin','operador'));

CREATE POLICY pv_update ON processos_venda
  FOR UPDATE TO authenticated
  USING (meu_role() IN ('admin','operador'));

CREATE POLICY pv_delete ON processos_venda
  FOR DELETE TO authenticated
  USING (meu_role() = 'admin');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE processos_venda;

COMMIT;
