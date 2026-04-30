# Dashboard CLV — Guia de Deploy v3.6

## Resumo das Permissões por Role

| Ação | Admin | Operador | Visualizador |
|------|:-----:|:--------:|:------------:|
| Ver todos os dados | ✅ | ✅ | ✅ |
| Criar/editar veículos, serviços, prestadores | ✅ | ✅ | ❌ |
| Registrar e editar vendas | ✅ | ✅ | ❌ |
| Excluir qualquer registro | ✅ | ❌ | ❌ |
| Alterar metas do sistema | ✅ | ❌ | ❌ |
| Criar e gerenciar usuários | ✅ | ❌ | ❌ |
| Ver alertas de manutenção | ✅ | ✅ | ✅ |

---

## O que foi implementado

### 🔐 Autenticação com Supabase Auth
- Página de Login com e-mail + senha
- Recuperação de senha por e-mail (link enviado pelo Supabase)
- Proteção total de rotas — sem login, sem acesso
- Listener em tempo real — logout funciona em todas as abas

### 👥 Multi-usuário com Roles
- Página **Usuários** acessível apenas para Admin
- Criação de usuários com e-mail, senha, nome e role
- Edição de nome e role de qualquer usuário
- Ativação/desativação de usuário (sem deletar do Auth)
- Admin não pode alterar o próprio role (proteção contra auto-bloqueio)
- Badge de role na sidebar (desktop) e header (mobile)
- Menu de navegação dinâmico — item "Usuários" só aparece para Admin

### 🔒 RLS no banco de dados
- Tabelas protegidas: `veiculos`, `servicos`, `prestadores`, `metas`, `profiles`
- Função `meu_role()` centraliza a leitura de role nas policies
- Trigger `handle_new_user` cria `profile` automaticamente ao criar usuário no Auth
- **Metas**: somente Admin pode INSERT e UPDATE (Operador só lê)

### 🚨 Alertas de Revisões Vencidas
- Banner colapsável no topo da página Estoque
- **Visível para todos os usuários** (admin, operador e visualizador)
- Dispara quando: serviço com status `pendente` OU sem manutenção há mais de N dias
- N = `metas.dias_max_estoque` (padrão 30 dias se não configurado)
- Cores escaladas: amarelo (1-2 alertas) → vermelho (3+)
- Pendentes aparecem primeiro na lista
- Botão "Ver →" navega ao detalhe do veículo

---

## Passo a passo de deploy

### 1. Executar migration no Supabase

```
Supabase → SQL Editor → New Query
Cole: SUPABASE_MIGRATION_v3.6.sql
Clique em Run
```

### 2. Criar o primeiro usuário Admin

```
Supabase → Authentication → Users → Add User
Preencha: e-mail e senha do dono da loja
Copie o UUID gerado (coluna "UID" na listagem)
```

Ainda no SQL Editor, execute:
```sql
UPDATE profiles
SET role = 'admin', nome = 'Nome do Admin'
WHERE id = 'COLE-O-UUID-AQUI';
```

> ⚠️ **CRÍTICO**: Faça esses passos ANTES do git push.
> Após o deploy com RLS ativo, o banco rejeita acessos não autenticados.
> Se nenhum admin existir, você ficará trancado fora do sistema.

### 3. (Recomendado) Desativar confirmação de e-mail

Permite que novos usuários criados pelo Admin façam login imediatamente,
sem precisar confirmar o e-mail:

```
Supabase → Authentication → Providers → Email
Desativar "Confirm email"
```

Se mantiver ativado, o Admin ainda pode criar usuários pelo sistema,
mas eles precisarão confirmar o e-mail antes do primeiro acesso.

### 4. Substituir/criar arquivos no projeto

| Arquivo | Ação |
|---------|------|
| `src/main.jsx` | **SUBSTITUIR** — envolve App no AuthProvider |
| `src/App.jsx` | **SUBSTITUIR** — nav dinâmica + badge role + logout |
| `src/hooks/useAuth.js` | **CRIAR** — hook e context de autenticação |
| `src/pages/Login.jsx` | **CRIAR** — tela de login + recuperação de senha |
| `src/pages/Usuarios.jsx` | **CRIAR** — gestão de usuários (só Admin) |
| `src/components/AlertaBanner.jsx` | **CRIAR** — alertas de manutenção |

### 5. Adicionar AlertaBanner no Veiculos.jsx

**Adicione o import no topo:**
```jsx
import AlertaBanner from '../components/AlertaBanner'
```

**Adicione o componente logo após a abertura da div principal:**
```jsx
<AlertaBanner
  veiculos={data.veiculos}
  servicos={data.servicos}
  metas={data.metas}
  onVerVeiculo={(v) => {
    // substitua pelo que abre o detalhe no seu Veiculos.jsx atual
    setVeiculoSelecionado(v)
    setModalAberto(true)
  }}
/>
```

### 6. Adicionar constante ao constants.js

```js
// src/lib/constants.js — adicionar ao arquivo existente:
export const DIAS_ALERTA_PADRAO = 30
```

### 7. Deploy

```bash
git add .
git commit -m "v3.6 - Auth + Multi-usuário (admin/operador/visualizador) + Alertas"
git push
```

---

## Notas técnicas

### AuthProvider e o estado `undefined`
```
session = undefined  → ainda verificando com Supabase → exibe "Carregando..."
session = null       → verificado, sem sessão ativa  → exibe Login
session = objeto     → sessão válida                 → exibe sistema
```
Evita o "flash" da tela de login antes do carregamento da sessão.

### Proteção de metas na UI
O RLS bloqueia no banco. Além disso, o componente de Metas deve
verificar `podeEditar` (disponível via `useAuth()`) para ocultar
os botões de edição para Operador e Visualizador, evitando confusão.

Exemplo no componente de Metas:
```jsx
const { isAdmin } = useAuth()
// ...
{isAdmin && <button onClick={editarMeta}>Editar</button>}
```

### Por que o Operador não vê o botão "Excluir" mas o Admin vê?
O `useAuth()` exporta `isAdmin` e `podeEditar`. Use `isAdmin`
nos componentes para condicionar botões de exclusão e edição de metas.
O RLS garante a segurança no banco mesmo se a UI for manipulada.

---

## Seções para atualizar no Documento de Referência (v3.6)

### Seção 3.1 — Adicionar:
| profiles | uuid PK (FK auth.users) | id, nome, role, ativo, criado_em |

### Seção 5 — Histórico de Versões:
| v3.6 | Multi-auth | Login Supabase Auth. Multi-usuário com roles admin/operador/visualizador.
RLS completo com função meu_role() e trigger handle_new_user.
Página Usuários com gestão completa pelo Admin.
AlertaBanner para alertas de manutenção vencida (visível para todos). |

### Seção 9.2 — Decisões técnicas — Adicionar:
- `useAuth()` é o hook central de autenticação — nunca ler sessão direto do supabase nos componentes
- `podeEditar` = admin || operador — usar para condicionar botões de escrita
- `isAdmin` — usar para condicionar exclusão e alteração de metas

---

Dashboard CLV v3.6 — Confidencial
