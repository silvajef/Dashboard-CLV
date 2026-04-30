-- Dashboard CLV v3.2 — Migração: campos FIPE integrados
-- Execute no SQL Editor do Supabase

alter table veiculos
  add column if not exists marca_nome   text default '',
  add column if not exists modelo_nome  text default '',
  add column if not exists ano_modelo   text default '',
  add column if not exists valor_fipe   numeric(12,2) default 0,
  add column if not exists codigo_fipe  text default '';

-- Índice para buscas por marca/modelo
create index if not exists idx_veiculos_marca  on veiculos(marca_nome);
create index if not exists idx_veiculos_modelo on veiculos(modelo_nome);
