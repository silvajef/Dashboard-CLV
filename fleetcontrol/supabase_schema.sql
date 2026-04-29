-- ═══════════════════════════════════════════════════════════════
--  FleetControl v3 — Schema Supabase
--  Execute no SQL Editor do Supabase (Project > SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- ── Extensões ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enum tipos ───────────────────────────────────────────────────
create type status_veiculo as enum
  ('pendente', 'manutencao', 'pronto', 'vendido');

create type status_servico as enum
  ('pendente', 'andamento', 'concluido', 'cancelado');

-- ════════════════════════════════════════════════════════════════
--  PRESTADORES
-- ════════════════════════════════════════════════════════════════
create table prestadores (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  tipo        text not null,
  telefone    text,
  email       text,
  cnpj        text,
  endereco    text,
  avaliacao   smallint default 5 check (avaliacao between 1 and 5),
  ativo       boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════
--  VEÍCULOS
-- ════════════════════════════════════════════════════════════════
create table veiculos (
  id              uuid primary key default uuid_generate_v4(),
  placa           text not null unique,
  modelo          text not null,
  tipo            text not null,
  ano             smallint,
  km              integer default 0,
  cor             text,
  chassi          text,
  combustivel     text,
  status          status_veiculo not null default 'pendente',
  valor_estoque   numeric(12,2) default 0,
  valor_venda     numeric(12,2),
  data_entrada    date default current_date,
  data_venda      date,
  comprador_nome  text,
  comprador_doc   text,
  obs             text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_veiculos_status on veiculos(status);
create index idx_veiculos_data_entrada on veiculos(data_entrada);

-- ════════════════════════════════════════════════════════════════
--  SERVIÇOS
-- ════════════════════════════════════════════════════════════════
create table servicos (
  id              uuid primary key default uuid_generate_v4(),
  veiculo_id      uuid not null references veiculos(id) on delete cascade,
  prestador_id    uuid references prestadores(id) on delete set null,
  tipo            text not null,
  descricao       text,
  data_servico    date default current_date,
  custo_pecas     numeric(10,2) default 0,
  custo_mao_obra  numeric(10,2) default 0,
  outros_custos   numeric(10,2) default 0,
  custo_total     numeric(10,2) generated always as
                    (custo_pecas + custo_mao_obra + outros_custos) stored,
  status          status_servico not null default 'pendente',
  garantia        text,
  obs             text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_servicos_veiculo on servicos(veiculo_id);
create index idx_servicos_prestador on servicos(prestador_id);
create index idx_servicos_data on servicos(data_servico);
create index idx_servicos_status on servicos(status);

-- ════════════════════════════════════════════════════════════════
--  METAS
-- ════════════════════════════════════════════════════════════════
create table metas (
  id                  uuid primary key default uuid_generate_v4(),
  vendas_mes          integer default 3,
  margem_min_pct      numeric(5,2) default 8,
  dias_max_estoque    integer default 90,
  custo_max_pct       numeric(5,2) default 5,
  updated_at          timestamptz default now()
);

-- Garante apenas 1 registro de metas
insert into metas (vendas_mes, margem_min_pct, dias_max_estoque, custo_max_pct)
values (3, 8, 90, 5);

-- ════════════════════════════════════════════════════════════════
--  FUNÇÃO: atualiza updated_at automaticamente
-- ════════════════════════════════════════════════════════════════
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_prestadores_updated
  before update on prestadores
  for each row execute function set_updated_at();

create trigger trg_veiculos_updated
  before update on veiculos
  for each row execute function set_updated_at();

create trigger trg_servicos_updated
  before update on servicos
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
--  Por ora: acesso público autenticado.
--  Quando adicionar auth de usuários, refine as policies.
-- ════════════════════════════════════════════════════════════════
alter table prestadores enable row level security;
alter table veiculos     enable row level security;
alter table servicos     enable row level security;
alter table metas        enable row level security;

-- Policy: permite tudo para usuários autenticados
create policy "auth_all" on prestadores for all using (auth.role() = 'authenticated');
create policy "auth_all" on veiculos     for all using (auth.role() = 'authenticated');
create policy "auth_all" on servicos     for all using (auth.role() = 'authenticated');
create policy "auth_all" on metas        for all using (auth.role() = 'authenticated');

-- ════════════════════════════════════════════════════════════════
--  VIEW: resumo_veiculos (útil para KPIs)
-- ════════════════════════════════════════════════════════════════
create or replace view resumo_veiculos as
select
  v.id,
  v.placa,
  v.modelo,
  v.tipo,
  v.ano,
  v.km,
  v.status,
  v.valor_estoque,
  v.valor_venda,
  v.data_entrada,
  v.data_venda,
  current_date - v.data_entrada           as dias_estoque,
  coalesce(sum(s.custo_total), 0)         as custo_manutencao,
  coalesce(count(s.id), 0)               as qtd_servicos,
  v.valor_estoque
    + coalesce(sum(s.custo_total), 0)    as custo_total_veiculo,
  case
    when v.valor_venda is not null and v.valor_venda > 0
    then v.valor_venda
         - v.valor_estoque
         - coalesce(sum(s.custo_total), 0)
    else null
  end                                     as lucro_veiculo,
  case
    when v.valor_venda > 0
    then round(
      (v.valor_venda - v.valor_estoque - coalesce(sum(s.custo_total),0))
      / v.valor_venda * 100, 2)
    else null
  end                                     as margem_pct
from veiculos v
left join servicos s on s.veiculo_id = v.id
group by v.id;
