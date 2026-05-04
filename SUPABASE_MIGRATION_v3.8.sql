-- ============================================================
--  Dashboard CLV — Migration v3.8
--  - Renomeia valor_estoque → valor_compra
--  - Adiciona valor_anuncio, vendedor_nome, comissao_pct
--  - Nova tabela custos_fixos (IPVA, licenciamento, etc.)
--  Execute no Supabase SQL Editor ANTES do deploy v3.8
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  1. Renomeia valor_estoque → valor_compra
-- ────────────────────────────────────────────────────────────
ALTER TABLE veiculos RENAME COLUMN valor_estoque TO valor_compra;

-- ────────────────────────────────────────────────────────────
--  2. Novas colunas em veiculos
-- ────────────────────────────────────────────────────────────
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS valor_anuncio  numeric(12,2);
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS vendedor_nome  text;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS comissao_pct   numeric(5,2) DEFAULT 0;

-- ────────────────────────────────────────────────────────────
--  3. Tabela custos_fixos
--     Campos fixos: IPVA, licenciamento, transferência, multas
--     Campo livre:  outros_desc + outros_valor
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custos_fixos (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  veiculo_id    bigint NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  ipva          numeric(12,2) NOT NULL DEFAULT 0,
  licenciamento numeric(12,2) NOT NULL DEFAULT 0,
  transferencia numeric(12,2) NOT NULL DEFAULT 0,
  multas        numeric(12,2) NOT NULL DEFAULT 0,
  outros_desc   text,
  outros_valor  numeric(12,2) NOT NULL DEFAULT 0,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Um veículo tem no máximo um registro de custos_fixos
CREATE UNIQUE INDEX IF NOT EXISTS idx_custos_fixos_veiculo
  ON custos_fixos (veiculo_id);

-- ────────────────────────────────────────────────────────────
--  4. Trigger de timestamp para custos_fixos
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_custos_fixos_atualizado ON custos_fixos;
CREATE TRIGGER trg_custos_fixos_atualizado
  BEFORE UPDATE ON custos_fixos
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

-- ────────────────────────────────────────────────────────────
--  5. RLS em custos_fixos
-- ────────────────────────────────────────────────────────────
ALTER TABLE custos_fixos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custos_fixos_select" ON custos_fixos;
DROP POLICY IF EXISTS "custos_fixos_insert" ON custos_fixos;
DROP POLICY IF EXISTS "custos_fixos_update" ON custos_fixos;
DROP POLICY IF EXISTS "custos_fixos_delete" ON custos_fixos;

CREATE POLICY "custos_fixos_select" ON custos_fixos
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "custos_fixos_insert" ON custos_fixos
  FOR INSERT WITH CHECK (public.meu_role() IN ('admin', 'operador'));
CREATE POLICY "custos_fixos_update" ON custos_fixos
  FOR UPDATE USING (public.meu_role() IN ('admin', 'operador'));
CREATE POLICY "custos_fixos_delete" ON custos_fixos
  FOR DELETE USING (public.meu_role() = 'admin');

-- ────────────────────────────────────────────────────────────
--  6. Atualiza vendas_relacao para usar valor_compra
--     (a coluna foi renomeada, a view/query precisa ser atualizada)
-- ────────────────────────────────────────────────────────────
-- Nenhuma ação necessária — vendas_relacao não referencia valor_estoque

-- ────────────────────────────────────────────────────────────
--  VERIFICAÇÃO
-- ────────────────────────────────────────────────────────────
SELECT
  column_name, data_type
FROM information_schema.columns
WHERE table_name = 'veiculos'
  AND column_name IN ('valor_compra','valor_anuncio','vendedor_nome','comissao_pct')
ORDER BY column_name;
