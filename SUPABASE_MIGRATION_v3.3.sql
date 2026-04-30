-- Dashboard CLV v3.3 — Corrige schema e adiciona campos FIPE
-- Execute no SQL Editor do Supabase

-- 1. Torna "modelo" opcional (agora vem da FIPE como modelo_nome)
alter table veiculos
  alter column modelo drop not null,
  alter column modelo set default '';

-- 2. Adiciona colunas FIPE (se ainda não existirem)
alter table veiculos
  add column if not exists marca_nome   text not null default '',
  add column if not exists modelo_nome  text not null default '',
  add column if not exists ano_modelo   text not null default '',
  add column if not exists valor_fipe   numeric(12,2) not null default 0,
  add column if not exists codigo_fipe  text not null default '';

-- 3. Copia dados existentes de "modelo" para "modelo_nome" (para não perder dados)
update veiculos set modelo_nome = modelo where modelo_nome = '' and modelo is not null;

-- 4. Índices úteis
create index if not exists idx_veiculos_marca_nome  on veiculos(marca_nome);
create index if not exists idx_veiculos_modelo_nome on veiculos(modelo_nome);
