-- ═══════════════════════════════════════════════════════════════
--  FleetControl v3 — Schema Supabase
--  Execute este script no SQL Editor do seu projeto Supabase
-- ═══════════════════════════════════════════════════════════════

-- ── Tabela: prestadores ──────────────────────────────────────────
create table if not exists prestadores (
  id          bigint generated always as identity primary key,
  nome        text    not null,
  tipo        text    not null default 'Mecânica',
  telefone    text,
  email       text,
  cnpj        text,
  endereco    text,
  avaliacao   int     not null default 5 check (avaliacao between 1 and 5),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Tabela: veiculos ─────────────────────────────────────────────
create table if not exists veiculos (
  id              bigint generated always as identity primary key,
  placa           text    not null unique,
  modelo          text    not null,
  tipo            text    not null default 'Van',
  ano             int,
  km              int     not null default 0,
  cor             text,
  chassi          text,
  combustivel     text    not null default 'Diesel',
  status          text    not null default 'pendente'
                  check (status in ('pendente','manutencao','pronto','vendido')),
  valor_estoque   numeric(12,2) not null default 0,
  valor_venda     numeric(12,2),
  data_entrada    date,
  data_venda      date,
  comprador_nome  text,
  comprador_doc   text,
  obs             text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Tabela: servicos ─────────────────────────────────────────────
create table if not exists servicos (
  id              bigint generated always as identity primary key,
  veiculo_id      bigint  not null references veiculos(id) on delete cascade,
  prestador_id    bigint  references prestadores(id) on delete set null,
  tipo            text    not null,
  descricao       text    not null,
  data_servico    date    not null default current_date,
  custo_pecas     numeric(12,2) not null default 0,
  custo_mao       numeric(12,2) not null default 0,
  outros          numeric(12,2) not null default 0,
  status          text    not null default 'pendente'
                  check (status in ('pendente','andamento','concluido','cancelado')),
  garantia        text,
  obs             text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Tabela: metas ────────────────────────────────────────────────
create table if not exists metas (
  id                  int primary key default 1,
  vendas_mes          int     not null default 3,
  margem_min          numeric not null default 8,
  dias_max_estoque    int     not null default 90,
  custo_max_pct       numeric not null default 5,
  updated_at          timestamptz not null default now()
);
insert into metas (id) values (1) on conflict (id) do nothing;

-- ── Triggers: updated_at automático ─────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace trigger trg_prestadores_upd before update on prestadores
  for each row execute function set_updated_at();
create or replace trigger trg_veiculos_upd    before update on veiculos
  for each row execute function set_updated_at();
create or replace trigger trg_servicos_upd    before update on servicos
  for each row execute function set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────
-- Por padrão, deixamos aberto para uso interno (loja).
-- Para multi-tenant ou usuários, habilite RLS e adicione políticas.
alter table prestadores enable row level security;
alter table veiculos     enable row level security;
alter table servicos     enable row level security;
alter table metas        enable row level security;

-- Política: acesso total via anon key (ajuste conforme necessidade)
create policy "anon_all_prestadores" on prestadores for all using (true) with check (true);
create policy "anon_all_veiculos"    on veiculos    for all using (true) with check (true);
create policy "anon_all_servicos"    on servicos    for all using (true) with check (true);
create policy "anon_all_metas"       on metas       for all using (true) with check (true);

-- ── Realtime ─────────────────────────────────────────────────────
alter publication supabase_realtime add table veiculos;
alter publication supabase_realtime add table servicos;
alter publication supabase_realtime add table prestadores;

-- ── Índices de performance ────────────────────────────────────────
create index if not exists idx_servicos_veiculo   on servicos(veiculo_id);
create index if not exists idx_servicos_prestador on servicos(prestador_id);
create index if not exists idx_veiculos_status    on veiculos(status);
create index if not exists idx_veiculos_placa     on veiculos(placa);
