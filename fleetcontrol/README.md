# 🚛 FleetControl v3

Sistema de gestão de estoque de veículos de carga com KPIs integrados.

**Stack:** React + Vite · Supabase (PostgreSQL + Realtime) · Vercel

---

## 🚀 Deploy em 5 passos

### 1. Supabase — Criar banco de dados

1. Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito
2. Vá em **SQL Editor** e execute todo o conteúdo de `supabase/schema.sql`
3. Anote suas credenciais em **Project Settings › API**:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 2. Repositório GitHub

```bash
git init
git add .
git commit -m "chore: initial FleetControl v3"
git remote add origin https://github.com/SEU_USUARIO/fleetcontrol.git
git push -u origin main
```

### 3. Vercel — Deploy automático

1. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**
2. Importe o repositório do GitHub
3. Em **Environment Variables**, adicione:
   ```
   VITE_SUPABASE_URL      = https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGci...
   ```
4. Clique em **Deploy** — pronto! ✅

### 4. Desenvolvimento local

```bash
cp .env.example .env
# Edite .env com suas credenciais Supabase

npm install
npm run dev
# Acesse: http://localhost:5173
```

### 5. (Opcional) Popular banco com dados iniciais

Descomente o bloco `/* insert ... */` no final do `schema.sql` e execute novamente no SQL Editor.

---

## 📁 Estrutura do Projeto

```
fleetcontrol/
├── src/
│   ├── lib/
│   │   ├── supabase.js       # Cliente Supabase
│   │   ├── constants.js      # Constantes e configs
│   │   └── helpers.js        # Funções utilitárias
│   ├── hooks/
│   │   ├── useVeiculos.js    # CRUD veículos + serviços + realtime
│   │   ├── usePrestadores.js # CRUD prestadores + realtime
│   │   └── useMetas.js       # Metas KPI persistidas
│   ├── components/
│   │   ├── UI.jsx            # Primitivos: Btn, Input, Modal, KPI...
│   │   ├── Navbar.jsx        # Navegação principal
│   │   ├── ModalVeiculo.jsx  # Criar/editar veículo
│   │   ├── ModalServico.jsx  # Registrar/editar serviço
│   │   ├── ModalVender.jsx   # Registrar venda
│   │   └── ModalPrestador.jsx# Criar/editar prestador
│   ├── pages/
│   │   ├── Dashboard.jsx     # Visão geral + alertas
│   │   ├── Estoque.jsx       # Lista de veículos ativos
│   │   ├── VeiculoDetalhe.jsx# Ficha + serviços + custos
│   │   ├── Vendidos.jsx      # Histórico de vendas
│   │   ├── Prestadores.jsx   # Gestão de prestadores
│   │   ├── Historico.jsx     # Histórico de serviços
│   │   └── KPIs.jsx          # Dashboard de indicadores
│   ├── styles/global.css
│   ├── App.jsx               # Roteamento
│   └── main.jsx              # Entry point
├── supabase/
│   └── schema.sql            # Schema completo do banco
├── .env.example
├── vercel.json
├── vite.config.js
└── package.json
```

---

## 🗄️ Schema do Banco

| Tabela        | Descrição                                      |
|---------------|------------------------------------------------|
| `veiculos`    | Cadastro de veículos com dados e status        |
| `servicos`    | Serviços vinculados a cada veículo             |
| `prestadores` | Oficinas e prestadores de serviço              |
| `metas`       | Metas KPI (linha única, persistida)            |

**Relacionamentos:**
- `servicos.veiculo_id` → `veiculos.id` (CASCADE delete)
- `servicos.prestador_id` → `prestadores.id` (SET NULL on delete)

---

## ⚡ Funcionalidades Realtime

O Supabase está configurado para escutar mudanças em tempo real nas tabelas `veiculos`, `servicos` e `prestadores`. Se dois usuários usarem o sistema simultaneamente, as telas atualizam automaticamente.

---

## 🔐 Segurança

O schema usa **Row Level Security (RLS)** com política de acesso público — ideal para uso interno em loja. Para adicionar autenticação por usuário, substitua as policies por verificações de `auth.uid()`.
