-- ═══════════════════════════════════════════════════════════════════
--  FleetControl v3 — Schema Supabase (PostgreSQL)
--  Execute este script no SQL Editor do seu projeto Supabase
-- ═══════════════════════════════════════════════════════════════════

-- ── Extensões ──────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enum types ─────────────────────────────────────────────────────
do $$ begin
  create type status_veiculo as enum ('pendente','manutencao','pronto','vendido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_servico as enum ('pendente','andamento','concluido','cancelado');
exception when duplicate_object then null; end $$;

-- ── Tabela: prestadores ────────────────────────────────────────────
create table if not exists prestadores (
  id          bigserial primary key,
  nome        text        not null,
  tipo        text        not null default 'Mecânica',
  telefone    text,
  email       text,
  cnpj        text,
  endereco    text,
  avaliacao   smallint    not null default 5 check (avaliacao between 1 and 5),
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Tabela: veiculos ───────────────────────────────────────────────
create table if not exists veiculos (
  id              bigserial primary key,
  placa           text        not null,
  modelo          text        not null,
  tipo            text        not null default 'Van',
  ano             smallint,
  km              integer     not null default 0,
  cor             text,
  chassi          text,
  combustivel     text        not null default 'Diesel',
  status          status_veiculo not null default 'pendente',
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

-- ── Tabela: servicos ───────────────────────────────────────────────
create table if not exists servicos (
  id            bigserial primary key,
  veiculo_id    bigint      not null references veiculos(id) on delete cascade,
  prestador_id  bigint      references prestadores(id) on delete set null,
  tipo          text        not null,
  descricao     text        not null,
  data          date        not null default current_date,
  status        status_servico not null default 'pendente',
  custo_pecas   numeric(10,2) not null default 0,
  custo_mao     numeric(10,2) not null default 0,
  outros        numeric(10,2) not null default 0,
  garantia      text,
  obs           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Tabela: metas ─────────────────────────────────────────────────
create table if not exists metas (
  id                  integer primary key default 1 check (id = 1), -- single-row
  vendas_mes          smallint    not null default 3,
  margem_min          numeric(5,2) not null default 8,
  dias_max_estoque    smallint    not null default 90,
  custo_max_pct       numeric(5,2) not null default 5,
  updated_at          timestamptz not null default now()
);

-- Insert default metas row
insert into metas (id) values (1) on conflict do nothing;

-- ── Índices de performance ─────────────────────────────────────────
create index if not exists idx_veiculos_status       on veiculos(status);
create index if not exists idx_veiculos_placa        on veiculos(placa);
create index if not exists idx_veiculos_data_venda   on veiculos(data_venda) where data_venda is not null;
create index if not exists idx_servicos_veiculo_id   on servicos(veiculo_id);
create index if not exists idx_servicos_prestador_id on servicos(prestador_id);
create index if not exists idx_servicos_data         on servicos(data);

-- ── Trigger: updated_at automático ────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create or replace trigger trg_veiculos_updated_at
  before update on veiculos for each row execute function set_updated_at();

create or replace trigger trg_servicos_updated_at
  before update on servicos for each row execute function set_updated_at();

create or replace trigger trg_prestadores_updated_at
  before update on prestadores for each row execute function set_updated_at();

-- ── Row Level Security (RLS) ───────────────────────────────────────
-- OPÇÃO A: Acesso público (loja interna, sem autenticação por usuário)
-- Descomente se quiser acesso livre com a anon key:

alter table veiculos    enable row level security;
alter table servicos    enable row level security;
alter table prestadores enable row level security;
alter table metas       enable row level security;

create policy "public_all_veiculos"    on veiculos    for all using (true) with check (true);
create policy "public_all_servicos"    on servicos    for all using (true) with check (true);
create policy "public_all_prestadores" on prestadores for all using (true) with check (true);
create policy "public_all_metas"       on metas       for all using (true) with check (true);

-- ── Dados de exemplo (opcional) ────────────────────────────────────
-- Descomente para popular o banco com dados iniciais:

/*
insert into prestadores (nome, tipo, telefone, email, cnpj, endereco, avaliacao) values
  ('Auto Mecânica Silva',  'Mecânica',          '(11) 99234-5678', 'silva@automec.com.br',    '12.345.678/0001-90', 'Rua das Oficinas, 123 - SP', 5),
  ('ElétricAuto',          'Elétrica',           '(11) 98765-4321', 'contato@eletricauto.com', '98.765.432/0001-10', 'Av. Paulista, 456 - SP',     4),
  ('PneuCenter',           'Pneus',              '(11) 97654-3210', 'pneucenter@gmail.com',    '11.223.344/0001-55', 'Rod. Anhanguera, km 12 - SP', 4),
  ('Detailing Pro',        'Limpeza/Detailing',  '(11) 96543-2109', 'detailing@pro.com.br',    '55.443.322/0001-77', 'Rua da Limpeza, 88 - SP',    5);

insert into veiculos (placa, modelo, tipo, ano, km, cor, chassi, combustivel, status, valor_estoque, data_entrada, obs) values
  ('ABC-1234', 'Mercedes Sprinter', 'Van',          2022, 48200, 'Branco', '9BM38407XM1234567', 'Diesel', 'pronto',     189000, current_date - 82,  ''),
  ('DEF-5678', 'Ford Transit',      'Van',          2021, 62000, 'Prata',  '9FBSS2JM4LBB12345', 'Diesel', 'manutencao', 155000, current_date - 45,  ''),
  ('GHI-9012', 'VW Amarok',         'Pick-up',      2023, 22000, 'Preto',  '9BWZZZ2HZ1T000001', 'Diesel', 'pendente',   320000, current_date - 18,  'Aguardando revisão de entrada'),
  ('JKL-3456', 'Iveco Daily',       'Caminhão Leve',2020, 98500, 'Branco', 'ZCFC35A000B123456', 'Diesel', 'manutencao', 248000, current_date - 97,  'Problema no motor identificado');
*/
