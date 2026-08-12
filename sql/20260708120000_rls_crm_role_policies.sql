-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 20260708120000 — RLS por papel no CRM + documentos + hardening de funções
-- ═══════════════════════════════════════════════════════════════════════════
-- Contexto: Dashboard-CLV é ferramenta interna de UMA loja com controle por
-- papel (admin/operador/vendedor), NÃO multi-tenant por user_id. Todas as
-- tabelas de dados já seguem o padrão "SELECT p/ autenticado; escrita por papel"
-- (ver SUPABASE_MIGRATION_v3.6/3.7/3.8/3.9). Três lacunas confirmadas via
-- advisors no banco real:
--   1. leads/anuncios/leads_atividades com `USING(true) WITH CHECK(true)` (WARN
--      rls_policy_always_true) — deixam vendedor (read-only na frota) escrever
--      qualquer lead/anúncio.
--   2. public.documentos com RLS DESABILITADO (ERROR rls_disabled_in_public) —
--      aberto a leitura/escrita anônima. É metadado de anexo por veículo → segue
--      o padrão da frota (vendedor read-only).
--   3. Funções sem search_path fixo (WARN function_search_path_mutable) e
--      handle_new_user (trigger-only) executável via RPC por anon/authenticated.
--
-- Alinhamento acordado (2026-07-08):
--   leads, leads_atividades → escrita: admin + operador + vendedor (CRM da equipe)
--   anuncios, documentos    → escrita: admin + operador (vendedor read-only)
--   DELETE de lead          → somente admin
-- SELECT permanece para todos os autenticados.
--
-- Usa ALTER FUNCTION (não CREATE OR REPLACE) para o search_path, evitando
-- clobber de corpos alterados direto no banco (drift observado em meu_role).
-- Idempotente: pode rodar do zero e re-rodar sem erro.

BEGIN;

-- ── 1. Funções: search_path fixo (advisor function_search_path_mutable) ────
ALTER FUNCTION public.handle_new_user()      SET search_path = public, pg_temp;
ALTER FUNCTION public.atualizar_timestamp()  SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_pv_ts()             SET search_path = public, pg_temp;
ALTER FUNCTION public.calcular_garantia_fim() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at()       SET search_path = public, pg_temp;

-- handle_new_user() é trigger em auth.users → ninguém chama pela API REST.
REVOKE ALL     ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
-- meu_role() é intencionalmente executável (as policies por papel a chamam);
-- revelar apenas o próprio role é seguro. WARN aceito.

-- ── 2. LEADS — SELECT: autenticado; escrita: admin+operador+vendedor ───────
DROP POLICY IF EXISTS "leads_auth"   ON public.leads;
DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;

CREATE POLICY "leads_select" ON public.leads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads_insert" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.meu_role() IN ('admin', 'operador', 'vendedor'));
CREATE POLICY "leads_update" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.meu_role() IN ('admin', 'operador', 'vendedor'));
CREATE POLICY "leads_delete" ON public.leads
  FOR DELETE TO authenticated
  USING (public.meu_role() = 'admin');

-- ── 3. LEADS_ATIVIDADES — histórico; insere quem trabalha o funil ──────────
DROP POLICY IF EXISTS "atividades_auth"   ON public.leads_atividades;
DROP POLICY IF EXISTS "atividades_select" ON public.leads_atividades;
DROP POLICY IF EXISTS "atividades_insert" ON public.leads_atividades;
DROP POLICY IF EXISTS "atividades_delete" ON public.leads_atividades;

CREATE POLICY "atividades_select" ON public.leads_atividades
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "atividades_insert" ON public.leads_atividades
  FOR INSERT TO authenticated
  WITH CHECK (public.meu_role() IN ('admin', 'operador', 'vendedor'));
CREATE POLICY "atividades_delete" ON public.leads_atividades
  FOR DELETE TO authenticated
  USING (public.meu_role() = 'admin');

-- ── 4. ANUNCIOS — vendedor read-only (igual à frota) ───────────────────────
DROP POLICY IF EXISTS "anuncios_auth"   ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_select" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_insert" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_update" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_delete" ON public.anuncios;

CREATE POLICY "anuncios_select" ON public.anuncios
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "anuncios_insert" ON public.anuncios
  FOR INSERT TO authenticated
  WITH CHECK (public.meu_role() IN ('admin', 'operador'));
CREATE POLICY "anuncios_update" ON public.anuncios
  FOR UPDATE TO authenticated
  USING (public.meu_role() IN ('admin', 'operador'));
CREATE POLICY "anuncios_delete" ON public.anuncios
  FOR DELETE TO authenticated
  USING (public.meu_role() = 'admin');

-- ── 5. DOCUMENTOS — fecha RLS desabilitado; anexos seguem a frota ──────────
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_select" ON public.documentos;
DROP POLICY IF EXISTS "documentos_insert" ON public.documentos;
DROP POLICY IF EXISTS "documentos_update" ON public.documentos;
DROP POLICY IF EXISTS "documentos_delete" ON public.documentos;

CREATE POLICY "documentos_select" ON public.documentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "documentos_insert" ON public.documentos
  FOR INSERT TO authenticated
  WITH CHECK (public.meu_role() IN ('admin', 'operador'));
CREATE POLICY "documentos_update" ON public.documentos
  FOR UPDATE TO authenticated
  USING (public.meu_role() IN ('admin', 'operador'));
CREATE POLICY "documentos_delete" ON public.documentos
  FOR DELETE TO authenticated
  USING (public.meu_role() = 'admin');

COMMIT;
