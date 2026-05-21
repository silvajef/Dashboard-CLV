-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION v3.10 — Dados do Fornecedor (quem vendeu o veículo para a empresa)
-- Alimenta rastreabilidade bidirecional para o CRM futuro
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE veiculos
  ADD COLUMN IF NOT EXISTS fornecedor_nome      TEXT,
  ADD COLUMN IF NOT EXISTS fornecedor_doc       TEXT,
  ADD COLUMN IF NOT EXISTS fornecedor_telefone  TEXT,
  ADD COLUMN IF NOT EXISTS fornecedor_email     TEXT;

COMMENT ON COLUMN veiculos.fornecedor_nome     IS 'Nome de quem vendeu o veículo para a empresa (CRM compras)';
COMMENT ON COLUMN veiculos.fornecedor_doc      IS 'CPF ou CNPJ do fornecedor';
COMMENT ON COLUMN veiculos.fornecedor_telefone IS 'Telefone do fornecedor';
COMMENT ON COLUMN veiculos.fornecedor_email    IS 'E-mail do fornecedor';
