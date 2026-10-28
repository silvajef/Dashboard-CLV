-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 20261026120000 — usuário inativo perde acesso + fecha escalada de papel
-- ═══════════════════════════════════════════════════════════════════════════
-- Contexto (avaliação de 2026-10-26, código versionado — confira drift no banco):
--   1. meu_role() ignorava profiles.ativo → usuário "desativado" seguia
--      escrevendo em toda tabela cuja policy usa meu_role().
--   2. profiles_update_self (v3.6) não restringe colunas → qualquer usuário
--      fazia UPDATE profiles SET role='admin', ativo=true WHERE id = auth.uid().
--   3. handle_new_user() lia o role de raw_user_meta_data → um signUp público
--      com data:{role:'admin'} (anon key está no bundle) criava um admin.
--   4. raw_webhook_events tinha policy SELECT por leads.user_id (resquício da
--      OLX v1) → passa a ser tabela só de service-role.
--
-- Leitura de usuário inativo: as policies de SELECT usam USING(true), então
-- quem bloqueia leitura é o ban no Supabase Auth, aplicado por api/usuarios.js
-- ao desativar (o token vigente expira em até 1h e não renova).
--
-- ⚠️ meu_role() e handle_new_user() são recriadas com CREATE OR REPLACE. A
-- migration 20260708120000 registrou drift no corpo de meu_role no banco real.
-- Antes de aplicar, compare com:
--   SELECT pg_get_functiondef('public.meu_role()'::regprocedure);
--   SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure);
--
-- Pós-aplicação (manual, no painel do Supabase):
--   - Authentication → Sign In / Providers → desligar "Allow new users to sign up".
--   - Auditar admins existentes:
--       SELECT p.id, p.nome, p.criado_em, u.email FROM public.profiles p
--       JOIN auth.users u ON u.id = p.id WHERE p.role = 'admin' ORDER BY p.criado_em;
--
-- Idempotente: pode rodar do zero e re-rodar sem erro.

BEGIN;

-- ── 1. meu_role(): inativo = sem papel → toda policy de escrita nega ───────
CREATE OR REPLACE FUNCTION public.meu_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND ativo
$$;

-- ── 2. handle_new_user(): papel nunca vem do cliente ───────────────────────
-- Conta nasce vendedor e INATIVA. Quem ativa e define o papel é
-- api/usuarios.js (service-role, só admin).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    'vendedor',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL     ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- ── 3. role/ativo só mudam por admin ativo, e nunca na própria linha ───────
-- profiles_update_self continua valendo para o nome; este trigger barra o
-- resto. auth.uid() nulo = service-role ou SQL editor (manutenção legítima).
CREATE OR REPLACE FUNCTION public.proteger_papel_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role AND NEW.ativo IS NOT DISTINCT FROM OLD.ativo THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.id = auth.uid() THEN
    RAISE EXCEPTION 'profiles: usuário % não pode alterar o próprio role/ativo (role % -> %, ativo % -> %)',
      auth.uid(), OLD.role, NEW.role, OLD.ativo, NEW.ativo
      USING ERRCODE = '42501';
  END IF;
  IF public.meu_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'profiles: só admin ativo altera role/ativo; papel de quem tentou = %',
      COALESCE(public.meu_role(), 'nenhum/inativo')
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL     ON FUNCTION public.proteger_papel_profiles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.proteger_papel_profiles() FROM anon, authenticated;

DROP TRIGGER IF EXISTS profiles_proteger_papel ON public.profiles;
CREATE TRIGGER profiles_proteger_papel
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_papel_profiles();

-- ── 4. raw_webhook_events: só service-role ─────────────────────────────────
ALTER TABLE public.raw_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usuarios leem seus raw events" ON public.raw_webhook_events;

-- Redige payloads do WhatsApp gravados antes de api/whatsapp-webhook.js
-- passar a redigir (número, nome de perfil e texto ficavam em claro).
UPDATE public.raw_webhook_events
SET payload = jsonb_build_object(
  'externalId', payload->'externalId',
  'timestamp',  payload->'timestamp',
  'redigido',   true
)
WHERE provider = 'whatsapp' AND payload ? 'numero';

COMMIT;
