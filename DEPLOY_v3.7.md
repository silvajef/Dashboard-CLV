# Dashboard CLV — Guia de Deploy v3.7

## O que foi implementado

### 🛡 Pós-Venda (substitui aba Vendidos)

**Aba renomeada para "Pós-Venda"** com 3 sub-seções:

1. **Vendas** — Histórico de veículos vendidos, agora vinculado a clientes e com badge de garantia em cada card. KPIs financeiros mantidos (Total Vendas, Receita, Custo, Lucro)

2. **Clientes** — Cadastro consolidado de quem comprou. Busca por nome/CPF/e-mail. Mostra histórico de compras por cliente, total acumulado, identifica recorrentes

3. **Garantias** — Dashboard com status automático (ativa / vencendo / vencida). Filtros por status. Datas de fim calculadas automaticamente (90 dias CDC)

### 🧱 Arquitetura

**Lógica isolada em `src/lib/garantia.js`** — funções puras sem dependência de React/Supabase. Pode ser reutilizada em ferramentas futuras (notificações automáticas, relatórios, BI).

**Operação composta `registrarVenda`** — quando uma venda for registrada (no Modal existente), agora cria automaticamente: cliente (se novo), atualiza veículo, registra a garantia.

### 🔒 Banco de Dados

**Novas tabelas:**
- `clientes` — pessoa/empresa com cpf_cnpj único
- `vendas_relacao` — conecta veículo ↔ cliente com garantia calculada via coluna gerada (`garantia_fim`)

**RLS completo** seguindo o padrão da v3.6 (admin/operador podem editar, todos veem, só admin deleta).

**Migração automática** — extrai compradores existentes da tabela `veiculos` (campos `comprador_nome`, `comprador_doc`) e popula as novas tabelas. Deduplica por CPF/CNPJ.

### 🐛 Correções incluídas

- **`getMetas()`** estava com bug (variáveis `data`/`error` usadas antes de declaradas). Corrigido + uso de `.maybeSingle()` para evitar erro 406 quando tabela está vazia.

---

## Permissões por role

| Ação | Admin | Operador | Visualizador |
|---|:-:|:-:|:-:|
| Ver clientes/vendas/garantias | ✅ | ✅ | ✅ |
| Criar/editar cliente | ✅ | ✅ | ❌ |
| Registrar venda | ✅ | ✅ | ❌ |
| Excluir cliente/venda | ✅ | ❌ | ❌ |

---

## Passo a passo de deploy

### 1. Executar migration no Supabase

```
Supabase → SQL Editor → New Query
Cole: SUPABASE_MIGRATION_v3.7.sql
Clique em Run
```

A migração é idempotente — pode rodar mais de uma vez com segurança.

### 2. Verificar a migração

```sql
SELECT
  (SELECT COUNT(*) FROM veiculos WHERE status = 'vendido' AND comprador_nome IS NOT NULL) AS veiculos_vendidos,
  (SELECT COUNT(*) FROM clientes) AS clientes_cadastrados,
  (SELECT COUNT(*) FROM vendas_relacao) AS vendas_migradas;
```

`clientes_cadastrados` e `vendas_migradas` devem refletir os dados existentes.

### 3. Substituir/criar arquivos no projeto

| Arquivo | Ação |
|---|---|
| `src/lib/garantia.js` | **CRIAR** — lógica isolada de cálculo |
| `src/lib/api.js` | **SUBSTITUIR** — adiciona clientes/vendas + corrige getMetas |
| `src/hooks/useFleetData.js` | **SUBSTITUIR** — carrega clientes e vendasRelacao |
| `src/pages/PosVenda.jsx` | **CRIAR** — nova página com 3 sub-abas |
| `src/App.jsx` | **SUBSTITUIR** — renomeia Vendidos → Pós-Venda |

### 4. Deletar arquivo antigo

Pode deletar `src/pages/Vendidos.jsx` — não é mais usado.

```powershell
Remove-Item src\pages\Vendidos.jsx
```

### 5. Deploy

```bash
git add .
git commit -m "v3.7 - Pos-Venda: clientes + vendas_relacao + garantia 90 dias"
git push
```

---

## Próximos passos sugeridos (v3.8 e além)

A arquitetura ficou pronta para evoluir naturalmente:

1. **Modal de cadastro/edição de Cliente** — botão "Novo Cliente" na sub-aba Clientes (use o ModalCliente como template)
2. **Adaptar ModalVender** — em vez de só preencher campos do veículo, chamar `fleet.registrarVenda()` para criar a venda completa
3. **Notificações de garantia vencendo** — usar `garantia.js` num cron job (Edge Function) para enviar e-mail ao cliente
4. **Acionamentos de garantia** — registrar reclamações dentro do prazo (futura tabela `acionamentos`)
5. **Documentos por venda** — upload de contrato e termo de entrega via Supabase Storage

---

## Atualizar o Documento de Referência

### Seção 3.1 — adicionar:
| clientes | bigint IDENTITY | id, nome, tipo, cpf_cnpj (único), telefone, email, endereço |
| vendas_relacao | bigint IDENTITY | veiculo_id, cliente_id, data_venda, valor_venda, garantia_dias, garantia_inicio, garantia_fim (calculada) |

### Seção 5 — Histórico:
| v3.7 | Pós-Venda v1 | Aba Vendidos renomeada para Pós-Venda. Tabela clientes deduplicada por CPF/CNPJ. Tabela vendas_relacao com garantia 90 dias CDC calculada automaticamente. Sub-abas Vendas / Clientes / Garantias. Lógica isolada em garantia.js para reuso futuro. Migração automática de vendas existentes. Correção do bug getMetas. |

---

Dashboard CLV v3.7 — Confidencial
