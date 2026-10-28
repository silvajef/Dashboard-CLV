-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 20260831190000 — Retomada de Anúncios (ML/OLX/Facebook) + CRM
-- ═══════════════════════════════════════════════════════════════════════════
-- Contexto: a feature de anúncios/OAuth foi removida em 2026-07-08 (migration
-- drop_anuncios_integracoes) por ser a maior fonte de dívida de segurança —
-- tokens em texto claro em `integracoes` e devolvidos ao browser. Esta
-- migration recria as duas tabelas já corrigidas conforme a skill
-- oauth-integrations:
--
--   * anuncios    — sem segredos, RLS por papel igual a `leads` (ver
--                   [[tenancy-model]]). UNIQUE(veiculo_id, plataforma) é a
--                   trava de idempotência E o que impede duplicar o mesmo
--                   carro na mesma plataforma.
--   * integracoes — guarda só tokens CIFRADOS (access_token_enc/
--                   refresh_token_enc via api/_crypto.js) e SEM NENHUMA
--                   policy pra `authenticated`: só o service-role (funções
--                   api/*.js) lê/escreve aqui. Diferente de toda outra
--                   tabela do schema — client nunca faz
--                   supabase.from('integracoes') direto.
--   * webhook_token_hash substitui o antigo webhook_token em texto claro —
--                   mesmo padrão de lookup por hash (não reversível) já
--                   usado em leads.telefone_hash (HMAC via hashParaLookup).
--
-- Idempotente: pode rodar do zero e re-rodar sem erro.

BEGIN;

-- ── 1. ANUNCIOS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.anuncios (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  veiculo_id          bigint NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  plataforma          text NOT NULL,
  listing_id          text,
  url                 text,
  status              text NOT NULL DEFAULT 'ativo',
  preco_anunciado     numeric(12,2),
  titulo              text,
  erro_sincronizacao  text,
  publicado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.anuncios DROP CONSTRAINT IF EXISTS anuncios_plataforma_check;
ALTER TABLE public.anuncios ADD CONSTRAINT anuncios_plataforma_check
  CHECK (plataforma IN ('mercadolivre','olx','facebook'));

ALTER TABLE public.anuncios DROP CONSTRAINT IF EXISTS anuncios_status_check;
ALTER TABLE public.anuncios ADD CONSTRAINT anuncios_status_check
  CHECK (status IN ('ativo','pausado','encerrado'));

-- Chave de idempotência (republicar = update) e trava anti-duplicidade:
-- o mesmo veículo não pode ter 2 anúncios ativos na mesma plataforma.
CREATE UNIQUE INDEX IF NOT EXISTS anuncios_veiculo_plataforma_key
  ON public.anuncios (veiculo_id, plataforma);

CREATE INDEX IF NOT EXISTS anuncios_veiculo_id_idx ON public.anuncios (veiculo_id);
CREATE INDEX IF NOT EXISTS anuncios_listing_lookup_idx ON public.anuncios (plataforma, listing_id);

ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anuncios_select" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_insert" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_update" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_delete" ON public.anuncios;

-- Mesmo padrão de leads/documentos: SELECT aberto ao autenticado, escrita
-- por papel. As funções api/anuncios-*.js usam service-role e bypassam
-- isso, mas a policy também permite ajuste manual por admin/operador.
CREATE POLICY "anuncios_select" ON public.anuncios
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "anuncios_insert" ON public.anuncios
  FOR INSERT TO authenticated WITH CHECK (public.meu_role() IN ('admin', 'operador'));
CREATE POLICY "anuncios_update" ON public.anuncios
  FOR UPDATE TO authenticated USING (public.meu_role() IN ('admin', 'operador'));
CREATE POLICY "anuncios_delete" ON public.anuncios
  FOR DELETE TO authenticated USING (public.meu_role() = 'admin');

-- ── 2. INTEGRACOES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integracoes (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plataforma            text NOT NULL,
  access_token_enc      text,
  refresh_token_enc     text,
  expires_at            timestamptz,
  webhook_token_hash    text,
  webhook_config_id     text,
  webhook_configurado   boolean NOT NULL DEFAULT false,
  feed_token_enc        text,
  verificado_em         timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integracoes DROP CONSTRAINT IF EXISTS integracoes_plataforma_check;
ALTER TABLE public.integracoes ADD CONSTRAINT integracoes_plataforma_check
  CHECK (plataforma IN ('mercadolivre','olx','facebook'));

CREATE UNIQUE INDEX IF NOT EXISTS integracoes_user_plataforma_key
  ON public.integracoes (user_id, plataforma);
CREATE INDEX IF NOT EXISTS integracoes_webhook_token_hash_idx
  ON public.integracoes (webhook_token_hash) WHERE webhook_token_hash IS NOT NULL;

ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;
-- Sem CREATE POLICY de propósito: nem authenticated nem anon leem/escrevem
-- aqui. Só o service-role (admin client de api/_supabaseAdmin.js) acessa.

-- ── 3. LEADS — habilita 'facebook' como plataforma_origem ───────────────
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_plataforma_origem_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_plataforma_origem_check
  CHECK (plataforma_origem IN
    ('mercadolivre','olx','icarros','mobiauto','napista','facebook','manual','whatsapp','indicacao'));

COMMIT;
