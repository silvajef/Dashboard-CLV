-- ============================================================
--  Dashboard CLV — Migration v3.6
--  Multi-usuário: admin | operador | visualizador
--
--  Permissões:
--    Admin       → tudo (SELECT INSERT UPDATE DELETE em tudo)
--    Operador    → SELECT + INSERT + UPDATE em veiculos/servicos/prestadores
--                  (sem DELETE em nada, sem alterar metas, sem gerenciar usuários)
--    Visualizador→ SELECT em tudo, nenhuma escrita
--
--  Execute no Supabase SQL Editor ANTES do deploy v3.6
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  1. Tabela profiles — vinculada ao auth.users
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome      text NOT NULL DEFAULT '',
  role      text NOT NULL DEFAULT 'visualizador'
              CHECK (role IN ('admin', 'operador', 'visualizador')),
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
--  2. Trigger: cria profile automaticamente ao criar usuário
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'visualizador')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
--  3. Função auxiliar: retorna role do usuário logado
--     SECURITY DEFINER evita recursão nas policies de profiles
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.meu_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ────────────────────────────────────────────────────────────
--  4. Habilitar RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE veiculos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
--  5. Limpar todas as policies existentes (seguro rodar sempre)
-- ────────────────────────────────────────────────────────────
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename
           FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
--  6. VEICULOS
--     SELECT  → todos autenticados
--     INSERT  → admin, operador
--     UPDATE  → admin, operador
--     DELETE  → somente admin
-- ────────────────────────────────────────────────────────────
CREATE POLICY "veiculos_select" ON veiculos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "veiculos_insert" ON veiculos
  FOR INSERT WITH CHECK (public.meu_role() IN ('admin', 'operador'));

CREATE POLICY "veiculos_update" ON veiculos
  FOR UPDATE USING (public.meu_role() IN ('admin', 'operador'));

CREATE POLICY "veiculos_delete" ON veiculos
  FOR DELETE USING (public.meu_role() = 'admin');

-- ────────────────────────────────────────────────────────────
--  7. SERVICOS — mesmas regras que veiculos
-- ────────────────────────────────────────────────────────────
CREATE POLICY "servicos_select" ON servicos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "servicos_insert" ON servicos
  FOR INSERT WITH CHECK (public.meu_role() IN ('admin', 'operador'));

CREATE POLICY "servicos_update" ON servicos
  FOR UPDATE USING (public.meu_role() IN ('admin', 'operador'));

CREATE POLICY "servicos_delete" ON servicos
  FOR DELETE USING (public.meu_role() = 'admin');

-- ────────────────────────────────────────────────────────────
--  8. PRESTADORES — mesmas regras que veiculos
-- ────────────────────────────────────────────────────────────
CREATE POLICY "prestadores_select" ON prestadores
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "prestadores_insert" ON prestadores
  FOR INSERT WITH CHECK (public.meu_role() IN ('admin', 'operador'));

CREATE POLICY "prestadores_update" ON prestadores
  FOR UPDATE USING (public.meu_role() IN ('admin', 'operador'));

CREATE POLICY "prestadores_delete" ON prestadores
  FOR DELETE USING (public.meu_role() = 'admin');

-- ────────────────────────────────────────────────────────────
--  9. METAS — somente admin lê e altera
--     (operador e visualizador enxergam as metas para KPIs,
--      mas só admin pode mudar os valores)
-- ────────────────────────────────────────────────────────────
CREATE POLICY "metas_select" ON metas
  FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: só admin (metas tem id fixo = 1, mas por segurança)
CREATE POLICY "metas_insert" ON metas
  FOR INSERT WITH CHECK (public.meu_role() = 'admin');

-- UPDATE: somente admin
CREATE POLICY "metas_update" ON metas
  FOR UPDATE USING (public.meu_role() = 'admin');

-- ────────────────────────────────────────────────────────────
--  10. PROFILES
--      SELECT  → todos autenticados (para exibir nome/role)
--      UPDATE  → cada um edita o próprio nome;
--                admin edita role/ativo de qualquer usuário
--      DELETE  → somente admin (desativa/remove usuários)
-- ────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (public.meu_role() = 'admin');

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (public.meu_role() = 'admin');

-- ────────────────────────────────────────────────────────────
--  APÓS RODAR ESTE SQL — Passos obrigatórios:
--
--  1. Supabase → Authentication → Users → Add User
--     (informe e-mail e senha do primeiro admin)
--
--  2. Copie o UUID gerado e execute:
--
--     UPDATE profiles
--     SET role = 'admin', nome = 'Nome do Admin'
--     WHERE id = 'UUID-DO-USUARIO-AQUI';
--
--  3. (Opcional) Para pular confirmação de e-mail em novos usuários:
--     Supabase → Auth → Providers → Email → desativar "Confirm email"
--
--  4. Faça git push → Vercel deploy automático
-- ────────────────────────────────────────────────────────────

-- Verificação opcional:
-- SELECT p.nome, p.role, p.ativo, u.email
-- FROM profiles p JOIN auth.users u ON u.id = p.id
-- ORDER BY p.criado_em;
