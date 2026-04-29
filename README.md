# 🚛 FleetControl v3

Sistema de gestão de manutenção de estoque de veículos de carga.
**Stack:** Vite + React · Supabase (PostgreSQL + Realtime) · Vercel

---

## 🚀 Deploy em 5 passos

### 1. Supabase — Criar projeto e banco
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e execute todo o conteúdo de `SUPABASE_SETUP.sql`
3. Copie as credenciais em **Settings → API**:
   - `Project URL`
   - `anon public key`

### 2. Variáveis de ambiente locais
```bash
cp .env.example .env
```
Edite `.env` com suas credenciais:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### 3. Instalar e rodar localmente
```bash
npm install
npm run dev
# Acesse http://localhost:5173
```

### 4. GitHub — Subir o código
```bash
git init
git add .
git commit -m "FleetControl v3 initial commit"
git remote add origin https://github.com/SEU_USUARIO/fleetcontrol.git
git push -u origin main
```

### 5. Vercel — Deploy automático
1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório do GitHub
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` → sua Project URL
   - `VITE_SUPABASE_ANON_KEY` → sua anon key
4. Clique **Deploy** ✅

A cada `git push` na branch `main`, o Vercel faz deploy automático.

---

## 📁 Estrutura do Projeto

```
fleetcontrol/
├── src/
│   ├── lib/
│   │   ├── supabase.js      # Cliente Supabase
│   │   ├── api.js           # Data access layer
│   │   └── constants.js     # Helpers, tema, constantes
│   ├── hooks/
│   │   └── useFleetData.js  # Hook central com Realtime
│   ├── components/
│   │   ├── UI.jsx           # Componentes base
│   │   └── Modals.jsx       # Formulários modais
│   ├── pages/
│   │   ├── KPIs.jsx         # Dashboard de indicadores
│   │   ├── Veiculos.jsx     # Gestão do estoque
│   │   ├── Vendidos.jsx     # Histórico de vendas
│   │   ├── Prestadores.jsx  # Cadastro de oficinas
│   │   └── Historico.jsx    # Log de serviços
│   ├── App.jsx              # Roteamento principal
│   └── main.jsx             # Entry point
├── SUPABASE_SETUP.sql        # Schema do banco
├── vercel.json               # Config Vercel (SPA routing)
├── vite.config.js
└── .env.example
```

---

## 🔐 Segurança (Produção)

Para uso em produção com múltiplos usuários, habilite autenticação:
1. **Supabase Auth** — email/senha ou SSO
2. **RLS (Row Level Security)** — políticas por `auth.uid()`
3. Troque a política `anon_all_*` por políticas autenticadas

---

## 📊 Funcionalidades

| Módulo | Funcionalidades |
|--------|----------------|
| **Dashboard KPI** | Giro, rentabilidade, custos, metas editáveis, score geral |
| **Estoque** | CRUD completo, serviços por veículo, custos detalhados |
| **Vendidos** | Histórico, lucro por venda, KPIs financeiros |
| **Prestadores** | Cadastro, avaliação por estrelas, histórico de serviços |
| **Histórico** | Log completo de todos os serviços |
| **Realtime** | Atualizações instantâneas via Supabase Realtime |
