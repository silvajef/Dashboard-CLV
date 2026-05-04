-- ============================================================
--  Dashboard CLV — Migration v3.7
--  Pós-Venda: clientes + vendas_relacao + garantia 90 dias
--  Execute no Supabase SQL Editor ANTES do deploy v3.7
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  1. Tabela clientes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome            text NOT NULL,
  tipo            text NOT NULL DEFAULT 'PF' CHECK (tipo IN ('PF', 'PJ')),
  cpf_cnpj        text,
  telefone        text,
  email           text,
  endereco        text,
  observacoes     text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

-- Índice único para evitar duplicatas por documento
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_doc
  ON clientes (cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != '';

-- Índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);

-- ────────────────────────────────────────────────────────────
--  2. Tabela vendas_relacao
--     Conecta veiculo ↔ cliente e gerencia garantia
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendas_relacao (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  veiculo_id      bigint NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  cliente_id      bigint NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  data_venda      date NOT NULL,
  valor_venda     numeric(12, 2) NOT NULL DEFAULT 0,
  garantia_dias   integer NOT NULL DEFAULT 90,
  garantia_inicio date NOT NULL,
  garantia_fim    date GENERATED ALWAYS AS (garantia_inicio + (garantia_dias || ' days')::interval) STORED,
  observacoes     text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

-- Um veículo só pode ter uma relação de venda ativa
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendas_relacao_veiculo
  ON vendas_relacao (veiculo_id);

CREATE INDEX IF NOT EXISTS idx_vendas_relacao_cliente
  ON vendas_relacao (cliente_id);

CREATE INDEX IF NOT EXISTS idx_vendas_relacao_garantia_fim
  ON vendas_relacao (garantia_fim);

-- ────────────────────────────────────────────────────────────
--  3. Trigger de atualização do timestamp
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.atualizar_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_atualizado ON clientes;
CREATE TRIGGER trg_clientes_atualizado
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_vendas_relacao_atualizado ON vendas_relacao;
CREATE TRIGGER trg_vendas_relacao_atualizado
  BEFORE UPDATE ON vendas_relacao
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

-- ────────────────────────────────────────────────────────────
--  4. Habilitar RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE clientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_relacao  ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
--  5. Policies — CLIENTES
--     SELECT: todos autenticados
--     INSERT/UPDATE: admin e operador
--     DELETE: somente admin
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clientes_select" ON clientes;
DROP POLICY IF EXISTS "clientes_insert" ON clientes;
DROP POLICY IF EXISTS "clientes_update" ON clientes;
DROP POLICY IF EXISTS "clientes_delete" ON clientes;

CREATE POLICY "clientes_select" ON clientes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "clientes_insert" ON clientes
  FOR INSERT WITH CHECK (public.meu_role() IN ('admin', 'operador'));

CREATE POLICY "clientes_update" ON clientes
  FOR UPDATE USING (public.meu_role() IN ('admin', 'operador'));

CREATE POLICY "clientes_delete" ON clientes
  FOR DELETE USING (public.meu_role() = 'admin');

-- ────────────────────────────────────────────────────────────
--  6. Policies — VENDAS_RELACAO
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "vendas_relacao_select" ON vendas_relacao;
DROP POLICY IF EXISTS "vendas_relacao_insert" ON vendas_relacao;
DROP POLICY IF EXISTS "vendas_relacao_update" ON vendas_relacao;
DROP POLICY IF EXISTS "vendas_relacao_delete" ON vendas_relacao;

CREATE POLICY "vendas_relacao_select" ON vendas_relacao
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "vendas_relacao_insert" ON vendas_relacao
  FOR INSERT WITH CHECK (public.meu_role() IN ('admin', 'operador'));

CREATE POLICY "vendas_relacao_update" ON vendas_relacao
  FOR UPDATE USING (public.meu_role() IN ('admin', 'operador'));

CREATE POLICY "vendas_relacao_delete" ON vendas_relacao
  FOR DELETE USING (public.meu_role() = 'admin');

-- ────────────────────────────────────────────────────────────
--  7. MIGRAÇÃO DE DADOS — vendas existentes
--     Extrai compradores da tabela veiculos e popula
--     clientes + vendas_relacao automaticamente
-- ────────────────────────────────────────────────────────────

-- 7.1 Cria clientes únicos a partir de veículos vendidos
--     Deduplica por cpf_cnpj quando disponível, senão por nome
INSERT INTO clientes (nome, tipo, cpf_cnpj, criado_em)
SELECT
  TRIM(MAX(comprador_nome)) AS nome,
  CASE
    WHEN LENGTH(REGEXP_REPLACE(MAX(comprador_doc), '[^0-9]', '', 'g')) = 14 THEN 'PJ'
    ELSE 'PF'
  END AS tipo,
  CASE
    WHEN MAX(comprador_doc) IS NOT NULL AND TRIM(MAX(comprador_doc)) != ''
    THEN TRIM(MAX(comprador_doc))
    ELSE NULL
  END AS cpf_cnpj,
  MIN(COALESCE(data_venda::timestamptz, created_at)) AS criado_em
FROM veiculos
WHERE status = 'vendido'
  AND comprador_nome IS NOT NULL
  AND TRIM(comprador_nome) != ''
GROUP BY
  -- Agrupa por documento (se houver) ou por nome
  CASE
    WHEN comprador_doc IS NOT NULL AND TRIM(comprador_doc) != ''
    THEN TRIM(comprador_doc)
    ELSE TRIM(comprador_nome)
  END
ON CONFLICT (cpf_cnpj) DO NOTHING;

-- 7.2 Cria as relações de venda vinculando veículo ↔ cliente
INSERT INTO vendas_relacao (
  veiculo_id, cliente_id, data_venda, valor_venda,
  garantia_dias, garantia_inicio
)
SELECT
  v.id AS veiculo_id,
  c.id AS cliente_id,
  COALESCE(v.data_venda, CURRENT_DATE) AS data_venda,
  COALESCE(v.valor_venda, 0) AS valor_venda,
  90 AS garantia_dias,
  COALESCE(v.data_venda, CURRENT_DATE) AS garantia_inicio
FROM veiculos v
INNER JOIN clientes c
  ON (
    -- Match por documento se ambos têm
    (v.comprador_doc IS NOT NULL AND TRIM(v.comprador_doc) != ''
     AND c.cpf_cnpj = TRIM(v.comprador_doc))
    OR
    -- Senão, match por nome (apenas se cliente não tem cpf_cnpj registrado)
    (
      (v.comprador_doc IS NULL OR TRIM(v.comprador_doc) = '')
      AND c.cpf_cnpj IS NULL
      AND TRIM(c.nome) = TRIM(v.comprador_nome)
    )
  )
WHERE v.status = 'vendido'
  AND v.comprador_nome IS NOT NULL
  AND TRIM(v.comprador_nome) != ''
ON CONFLICT (veiculo_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
--  VERIFICAÇÃO (rode após o INSERT para conferir)
-- ────────────────────────────────────────────────────────────
-- SELECT
--   (SELECT COUNT(*) FROM veiculos WHERE status = 'vendido' AND comprador_nome IS NOT NULL) AS veiculos_vendidos,
--   (SELECT COUNT(*) FROM clientes) AS clientes_cadastrados,
--   (SELECT COUNT(*) FROM vendas_relacao) AS vendas_migradas;

-- SELECT
--   c.nome,
--   c.cpf_cnpj,
--   COUNT(vr.id) AS total_compras,
--   SUM(vr.valor_venda) AS valor_total
-- FROM clientes c
-- LEFT JOIN vendas_relacao vr ON vr.cliente_id = c.id
-- GROUP BY c.id, c.nome, c.cpf_cnpj
-- ORDER BY total_compras DESC;
