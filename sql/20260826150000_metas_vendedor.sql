-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 20260826150000 — Meta de vendas individual por vendedor
-- ═══════════════════════════════════════════════════════════════════════════
-- Contexto: `metas` é singleton (uma meta pra loja inteira — vendas_mes,
-- margem_min, dias_max_estoque, custo_max_pct). A aba Comissões (Painel do
-- Vendedor) só mostra "META DO MÊS" a partir desse valor único, igual pra
-- todo mundo. metas_vendedor guarda só o que varia por pessoa (a cota
-- mensal de vendas) — os outros campos de `metas` continuam por loja, não
-- fazem sentido por vendedor.
--
-- RLS espelha o padrão já usado (leads, whatsapp_threads, etc): SELECT
-- aberto a autenticado, escrita só admin — só o admin define meta alheia.
--
-- Idempotente: pode rodar do zero e re-rodar sem erro.

BEGIN;

CREATE TABLE IF NOT EXISTS public.metas_vendedor (
  vendedor_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendas_mes  int NOT NULL DEFAULT 3,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metas_vendedor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metas_vendedor_select" ON public.metas_vendedor;
DROP POLICY IF EXISTS "metas_vendedor_insert" ON public.metas_vendedor;
DROP POLICY IF EXISTS "metas_vendedor_update" ON public.metas_vendedor;
DROP POLICY IF EXISTS "metas_vendedor_delete" ON public.metas_vendedor;

CREATE POLICY "metas_vendedor_select" ON public.metas_vendedor
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "metas_vendedor_insert" ON public.metas_vendedor
  FOR INSERT TO authenticated WITH CHECK (public.meu_role() = 'admin');
CREATE POLICY "metas_vendedor_update" ON public.metas_vendedor
  FOR UPDATE TO authenticated USING (public.meu_role() = 'admin');
CREATE POLICY "metas_vendedor_delete" ON public.metas_vendedor
  FOR DELETE TO authenticated USING (public.meu_role() = 'admin');

COMMIT;
