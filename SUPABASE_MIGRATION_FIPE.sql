-- Dashboard CLV v3.1 — Migração: adicionar campos FIPE na tabela veiculos
-- Execute no SQL Editor do Supabase APENAS se já tiver o schema v3.0 instalado

alter table veiculos
  add column if not exists valor_fipe    numeric(12,2) default 0,
  add column if not exists codigo_fipe   text;

-- Atualiza a view de timestamp
comment on column veiculos.valor_fipe  is 'Valor de referência Tabela FIPE (Parallelum API)';
comment on column veiculos.codigo_fipe is 'Código FIPE do veículo (ex: 004278-1)';
