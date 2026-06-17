-- Migração: v3.11 — renomear role 'visualizador' para 'vendedor'
-- Data: 2026-06-17
-- Descrição: O perfil 'visualizador' passa a se chamar 'vendedor'. Atualiza os
--            dados existentes, o DEFAULT da coluna e a CHECK constraint de role.
--            Comportamento de permissão é idêntico (read-only); muda só o nome
--            e, no front, o escopo de navegação (ver EstoqueVendedor.jsx).

-- 1. Remove a CHECK constraint antiga (definida inline em v3.6 → nome auto
--    'profiles_role_check'). IF EXISTS evita erro se já tiver sido removida.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Migra os dados existentes.
UPDATE public.profiles SET role = 'vendedor' WHERE role = 'visualizador';

-- 3. Novo DEFAULT.
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'vendedor';

-- 4. Nova CHECK constraint (sem 'visualizador').
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'operador', 'vendedor'));
