# Perfil Vendedor + Tela Exclusiva de Estoque

**Data:** 2026-06-17
**Status:** Aprovado, em implementação

## Objetivo

Renomear o perfil `visualizador` para `vendedor` e dar a ele acesso restrito:
apenas dados de estoque, **sem informações financeiras**, exceto o **preço de venda**
dos veículos. O vendedor tem uma tela exclusiva ao acessar o Dashboard CLV.

## Decisões (brainstorming)

1. **Painel de comissões atual** ([PainelVendedor.jsx](../../../src/pages/PainelVendedor.jsx))
   permanece para admin/operador. Não é a tela do novo perfil.
2. **Navegação do vendedor:** apenas a tela de estoque + a ficha individual de
   cada veículo. Nenhuma outra aba.
3. **Info extra na tela do vendedor** (além de fotos/ficha/preço): status de
   disponibilidade, histórico de manutenção (sem custos), preço FIPE de referência.
   *Não* incluir link do anúncio.
4. **Componente novo** (`EstoqueVendedor.jsx`), não reuso do `Veiculos.jsx` (782
   linhas, editável, financeiro). Esconder financeiro é uma fronteira de segurança
   e deve ser explícita/auditável num componente enxuto e read-only.

## Mudanças

### 1. Renomear role `visualizador` → `vendedor`
- **Migração SQL:** `UPDATE profiles SET role='vendedor' WHERE role='visualizador'`.
  Verificar/ajustar qualquer CHECK constraint ou RLS que liste valores de role.
- [useAuth.jsx](../../../src/hooks/useAuth.jsx): adicionar `isVendedor`. Manter
  `podeEditar = isAdmin || isOperador` (vendedor é read-only). Tratar
  `'visualizador'` legado como vendedor durante a transição.
- [Usuarios.jsx](../../../src/pages/Usuarios.jsx): renomear nos dropdowns,
  `ROLE_INFO` e `PERMISSOES` ("Vendedor — vê estoque, sem dados financeiros").
- [App.jsx](../../../src/App.jsx) `ROLE_BADGE`: `visualizador` → `vendedor`.

### 2. Gating de navegação
- Se `role === 'vendedor'`: sidebar/bottom-nav mostra **apenas** a tela de estoque.
  Login cai direto nela. Nenhuma outra aba é montada.
- `admin`/`operador`: `TABS_BASE` intocada.
- A aba "Vendedor" atual (painel de comissões) fica só para admin/operador e é
  renomeada para **"Comissões"** (`id: 'comissoes'`) para evitar confusão com o role.

### 3. Tela exclusiva: `src/pages/EstoqueVendedor.jsx` (novo, read-only)
- **Lista:** card com foto (capa), marca/modelo/ano, km, cor, preço de venda
  (`valor_anuncio`) e badge de status. Filtro por status. Sem editar/criar/excluir.
- **Ficha (ao clicar):** fotos, ficha técnica (marca/modelo/ano, tipo, cor, km,
  combustível, placa), preço de venda, status, FIPE de referência (`valor_fipe`),
  histórico de manutenção **sem custos** (tipo, status, descrição, prestador,
  data, garantia — nunca `custo_pecas`/`custo_mao`/`outros`).

### 4. Fronteira financeira
- `EstoqueVendedor` lê de `fleet.veiculos` mas só renderiza campos permitidos.
  Nunca toca `valor_compra`, `custo_*`, `valor_fipe` como custo, margem.
- **Caveat:** ocultação client-side; os dados ainda chegam ao navegador
  (`useFleetData` carrega tudo). Proteção real exigiria RLS/colunas restritas no
  Supabase — registrado como endurecimento futuro.

## Campos do modelo (referência)
`veiculo`: `fotos[]`, `marca_nome`, `modelo_nome`, `ano_modelo`, `tipo`, `cor`,
`km`, `combustivel`, `placa`, `status`, `valor_anuncio` (preço de venda),
`valor_fipe` (FIPE). Não existe campo `cambio`.
`servico`: `tipo`, `status`, `descricao`, `prestador.nome`, `data_servico`,
`garantia` (+ custos, que serão omitidos).

## Arquivos
`useAuth.jsx`, `App.jsx`, `Usuarios.jsx`, **novo** `EstoqueVendedor.jsx`,
1 migração SQL. `PainelVendedor.jsx` só muda label/visibilidade.
