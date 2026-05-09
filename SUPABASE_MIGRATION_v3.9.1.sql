-- ═══════════════════════════════════════════════════════════════════════════
-- FleetControl v3.9.1 — Adiciona status 'em_venda' ao CHECK CONSTRAINT
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Recria o CHECK CONSTRAINT incluindo 'em_venda' ────────────────────
ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS veiculos_status_check;

ALTER TABLE veiculos
  ADD CONSTRAINT veiculos_status_check
  CHECK (status IN ('pendente','manutencao','pronto','em_venda','vendido'));

-- ── 2. Corrige veículos com processo em_andamento mas status desatualizado ─
--    (inconsistência causada pelo bug: processo foi criado mas status não atualizou)
UPDATE veiculos v
SET status = 'em_venda'
FROM processos_venda p
WHERE p.veiculo_id = v.id
  AND p.status = 'em_andamento'
  AND v.status <> 'em_venda';

-- ── 3. Remove processos duplicados em_andamento para o mesmo veículo ───────
--    (mantém apenas o mais recente de cada veículo)
DELETE FROM processos_venda
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY veiculo_id, status ORDER BY criado_em DESC) AS rn
    FROM processos_venda
    WHERE status = 'em_andamento'
  ) ranked
  WHERE rn > 1
);

COMMIT;
