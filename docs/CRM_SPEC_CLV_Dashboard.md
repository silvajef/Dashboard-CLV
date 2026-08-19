# Especificação do Módulo de CRM — CLV Dashboard (revisão 2026-08-12)

> Revisão da spec original enviada pelo usuário, confrontada com o schema, a
> arquitetura e as convenções reais do Dashboard CLV. A spec original foi
> escrita sem olhar o código — várias premissas não batiam com o que já
> existe (algumas coisas já estão construídas, outras foram descritas com
> padrões de projetos diferentes). Este documento substitui o original.

## 0. Divergências corrigidas

1. **`leads` e `leads_atividades` já existem e estão em produção.** O funil
   (`src/pages/Leads.jsx` + `src/components/FunilLeads.jsx`) já tem Kanban,
   visão de funil e histórico de atividade por lead, com RLS aplicada
   (`sql/20260708120000_rls_crm_role_policies.sql`). Este documento **estende**
   o que existe — não recria do zero.
2. **Não existe integração RENAVE neste repositório.** A spec original cita
   "mesmo padrão usado na integração RENAVE" como referência de abstração de
   provedor — isso não existe no Dashboard CLV (`grep -ri renave` não retorna
   nada). É bleed do projeto irmão Zennith. O padrão de referência real e já
   testado aqui é o webhook OLX removido em `e26c67a`
   (`api/olx-webhook.js`, recuperável via `git show e26c67a^:api/olx-webhook.js`)
   somado à skill `secure-webhooks`: HMAC timing-safe, ack rápido,
   idempotência, raw-event, headers sanitizados antes de persistir.
3. **Webhooks são Vercel serverless functions (`api/*.js`), não Supabase Edge
   Functions.** É a única convenção usada em todo webhook já implementado
   neste projeto (`vercel.json` já carve-out `/api/*`; toda função usa a
   assinatura Node do Vercel, incompatível com `Deno.serve` do Supabase Edge).
   Corrigido na seção 11.
4. **Não existe tabela `vendedores`.** "Vendedor" é um valor do enum
   `profiles.role` (`admin | operador | vendedor`), não uma entidade própria.
   `leads.responsavel_id` **já existe** como FK para `auth.users`, mas nunca
   foi ligado à UI (nenhum componente lê ou escreve nesse campo hoje).
   Round-robin deve operar sobre `profiles WHERE role='vendedor' AND ativo=true`.
5. **A RLS atual é por papel, não por dono da linha.** O próprio cabeçalho de
   `sql/20260708120000_rls_crm_role_policies.sql` declara: *"Dashboard-CLV é
   ferramenta interna de UMA loja com controle por papel (admin/operador/
   vendedor), NÃO multi-tenant por user_id."* Hoje qualquer usuário
   autenticado vê todos os leads; INSERT/UPDATE é liberado para
   admin/operador/vendedor sem filtro de dono. A proposta original de "RLS
   por vendedor_responsável_id" contraria esse princípio já estabelecido —
   não é uma correção, é uma mudança de arquitetura. Virou pergunta aberta
   (seção 12), não foi assumida.
6. **PII já está em texto claro em `leads`** (`nome`, `telefone`, `email`) —
   confirmado pelo schema e pela skill `pii-lgpd`, que já documenta isso como
   pendência (Fase 4 do roadmap de segurança, ainda não aplicada). WhatsApp
   aumenta volume e sensibilidade desse dado — cifrar deixa de ser "depois" e
   devia entrar no mesmo escopo deste módulo.
7. **Não existe um motor de "estágios configuráveis"** em nenhum lugar do
   projeto. Todo enum de negócio hoje é hardcoded (CHECK constraint no banco
   + config JS espelhada, ex. `STATUS_VEICULO_CFG`, `STATUS_LEAD_CFG`,
   `TIPOS_ATIVIDADE`) ou vem da tabela singleton `metas`. Manter esse padrão
   evita introduzir uma abstração nova sem necessidade real hoje.
8. **Nomes de coluna da spec original não batem com o schema real**:
   `veiculo_interesse_id` → já existe como `veiculo_id`; `origem` → hoje é
   `plataforma_origem`, restrito por CHECK a slugs de marketplace
   (`mercadolivre|olx|icarros|mobiauto|napista|manual` — falta `whatsapp`);
   `estagio` → é o mesmo campo que `status`
   (`novo|contato|visita|proposta|ganho|perdido` — falta `qualificado` e
   `negociação` da spec original, ver seção 2).

---

## 1. Objetivo

Fazer do WhatsApp mais um canal de entrada para o funil de leads que **já
existe**, com dedupe por telefone, histórico de interação, atribuição a
vendedor, SLA de resposta e vínculo com o estoque — eliminando o controle
disperso entre WhatsApp pessoal e memória do vendedor. Conecta-se ao módulo
**Estoque** (via `leads.veiculo_id`, já existente) e ao **KPI de giro**
recém-implementado (`src/lib/alertas.js`, `ALERTAS_CONFIG.DIAS_REPRECIFICAR_*`)
— lead perdido por falta de veículo compatível deve virar sinal para a curva
de aquisição.

---

## 2. Modelo de dados

### 2.1. `leads` — já existe, precisa de ALTER

Schema atual (`sql/20260708140000_drop_anuncios_integracoes.sql` é a
migration mais recente que a toca):

```
id                bigint identity PK
nome              text NOT NULL        -- texto claro, ver §2.4
telefone          text                 -- texto claro, chave de dedupe, ver §2.4
email             text                 -- texto claro
veiculo_id        bigint FK veiculos(id) ON DELETE SET NULL
plataforma_origem text CHECK IN (mercadolivre|olx|icarros|mobiauto|napista|manual)
status            text NOT NULL DEFAULT 'novo'
                  CHECK IN (novo|contato|visita|proposta|ganho|perdido)
responsavel_id    uuid FK auth.users(id) ON DELETE SET NULL   -- existe, não usado na UI
obs               text
external_id       text                 -- da migration OLX, reaproveitável p/ WhatsApp
provider          text
source            text
user_id           uuid FK auth.users(id)  -- quem criou a linha, não é RLS boundary
raw_event_id      bigint FK raw_webhook_events(id)
created_at        timestamptz
updated_at        timestamptz
```

**ALTER necessário** (migration nova, ver §11):

```sql
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS motivo_perda   text,
  ADD COLUMN IF NOT EXISTS valor_estimado numeric(12,2);

ALTER TABLE leads DROP CONSTRAINT leads_plataforma_origem_check;
ALTER TABLE leads ADD CONSTRAINT leads_plataforma_origem_check
  CHECK (plataforma_origem IN
    ('mercadolivre','olx','icarros','mobiauto','napista','manual','whatsapp','indicacao'));

ALTER TABLE leads DROP CONSTRAINT leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('novo','contato','qualificado','visita','proposta','negociacao','ganho','perdido'));
```

`motivo_perda` só deveria aceitar valor quando `status='perdido'` — validar
na camada de API (`api-leads.js`), não precisa de CHECK cruzado no banco
(padrão já usado em outros campos condicionais do projeto).

### 2.2. `leads_atividades` — já existe, precisa de ALTER

```
id          bigint identity PK
lead_id     bigint FK leads(id) ON DELETE CASCADE
tipo        text CHECK IN (mensagem|ligacao|visita|proposta|nota|status)
descricao   text NOT NULL
usuario_id  uuid FK auth.users(id)
created_at  timestamptz
```

Já cobre boa parte do que a spec original chamava de `interacoes` — **não
criar tabela nova**, só estender:

```sql
ALTER TABLE leads_atividades
  ADD COLUMN IF NOT EXISTS canal text CHECK (canal IN ('whatsapp','ligacao','presencial','email','sistema'));

ALTER TABLE leads_atividades DROP CONSTRAINT leads_atividades_tipo_check;
ALTER TABLE leads_atividades ADD CONSTRAINT leads_atividades_tipo_check
  CHECK (tipo IN ('mensagem','mensagem_recebida','mensagem_enviada','ligacao','visita','proposta','nota','status','agendamento'));
```

`usuario_id NULL` já serve como "autor = sistema" (automação) sem precisar
de um valor sentinela novo.

### 2.3. `whatsapp_threads` — tabela nova (legítima)

Único item de modelo de dados da spec original que é de fato novo — nada
parecido existe no schema atual:

```sql
CREATE TABLE whatsapp_threads (
  id                 bigint generated always as identity PRIMARY KEY,
  lead_id            bigint NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  numero_whatsapp    text NOT NULL,
  thread_provider_id text,
  ultima_mensagem_em timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON whatsapp_threads (numero_whatsapp);
```

`bigint identity`, não `uuid` — segue a convenção de toda tabela existente
no projeto (`leads.id`, `veiculos.id`, `leads_atividades.id` são todos
`bigint identity`; `uuid` neste schema é reservado para `auth.users`/
`profiles`).

### 2.4. PII — cifrar `nome`/`telefone`/`email`

Segue o padrão já documentado (e ainda não aplicado) na skill `pii-lgpd`,
usando `api/_crypto.js` (AES-256-GCM, já existe, hoje sem nenhum caller):

- `telefone` vira `telefone_encrypted` (blob cifrado) + `telefone_hash`
  (SHA-256 via `hashParaLookup`, indexável) para dedupe **sem** expor
  texto claro em índice.
- Mesma coisa para `nome`/`email` se decidirem cifrar os três (telefone é
  o mais crítico por ser chave de dedupe pública).
- Máscara de exibição no client (ex. `(11) 9****-1234`) fora do papel
  `admin`/`operador` responsável — ver skill para o padrão exato.

### 2.5. `estagios_funil` — **não criar**

Manter `status` como CHECK constraint + config JS espelhada
(`STATUS_LEAD_CFG` em `src/lib/plataformas/types.js`), do mesmo jeito que
`STATUS_VEICULO_CFG` já funciona para veículos. Construir um motor de
estágios configurável (tabela + UI de admin) é escopo novo, desproporcional
ao que o resto do app faz hoje — revisitar só se aparecer uma necessidade
concreta de estágios por tipo de negócio/vendedor.

### 2.6. `vendedores` — **não criar**

Usar `profiles` (`id, nome, role, ativo`) filtrado por `role='vendedor'`.
Round-robin e metas por vendedor operam sobre essa view, não uma tabela nova.
Se precisar de meta individual por vendedor (a spec original citava
`meta_mensal`), estender `profiles` com uma coluna, não criar tabela — seguir
o padrão singleton usado em `metas` (que hoje é só uma meta da loja inteira,
sem segmentação por pessoa).

---

## 3. Captura de leads via WhatsApp

**Arquitetura corrigida**: Vercel serverless function em `api/whatsapp-webhook.js`,
seguindo exatamente o padrão do `api/olx-webhook.js` removido — não Supabase
Edge Function. A skill `secure-webhooks` já documenta o checklist a aplicar
(verificação HMAC timing-safe do payload assinado pelo provedor, ack rápido
antes de processar, idempotência por `external_id`/hash do payload,
gravação em `raw_webhook_events` antes de qualquer side-effect, headers
sanitizados no log).

**Escolha de provedor** (Meta Cloud API vs. BSP) é decisão de negócio, não
técnica — ver pergunta em aberto na seção 12. A camada de abstração deve
expor uma interface mínima e estável independente da escolha:

```js
// src/lib/whatsapp/provider.js — interface, não implementação
enviarMensagem(numero, texto)        // → { providerId }
receberWebhook(payloadBruto, headers) // → { numero, texto, timestamp, externalId } | null se inválido
```

**Fluxo de captura:**
1. `api/whatsapp-webhook.js` recebe POST → verifica assinatura → ack 200 rápido
2. Grava em `raw_webhook_events` (já existe, genérica, reutilizada da era OLX)
3. Busca lead por telefone (`telefone_hash`, dedupe) — se não achar, cria
   `lead` com `plataforma_origem='whatsapp'`, `status='novo'`
4. Upsert em `whatsapp_threads` (por `numero_whatsapp`)
5. Grava em `leads_atividades` com `canal='whatsapp'`,
   `tipo='mensagem_recebida'`, `usuario_id=NULL` (autor sistema)
6. Resposta do vendedor pelo Dashboard deve chamar `enviarMensagem()` (API do
   provedor), nunca depender do app do celular — é o que garante histórico
   completo mesmo se o vendedor sair da empresa

---

## 4. SLA de resposta

Corrigido para se plugar no motor de alertas **que já existe**
(`src/lib/alertas.js` → `gerarTodosAlertas`), em vez de descrever um sistema
de notificação novo. Segue exatamente o padrão de dois estágios que acabamos
de implementar para o giro de estoque (`ALERTAS_CONFIG.DIAS_REPRECIFICAR_*`):

```js
// alertas.js — novo gerador, mesmo padrão de calcularAlertasReprecificacao
ALERTAS_CONFIG.SLA_LEAD_MEDIA_MIN  = 15   // media: sem contato há 15min
ALERTAS_CONFIG.SLA_LEAD_ALTA_MIN   = 60   // alta: sem contato há 1h → escalar gestor
TIPO_ALERTA.LEAD_SEM_CONTATO = 'lead_sem_contato'
```

`gerarTodosAlertas` precisa receber `leads` como novo parâmetro
(`App.jsx:80` hoje só passa `veiculos, servicos, vendasRelacao, metas`).
`tempo_ate_primeiro_contato` é derivável de `leads.created_at` até a primeira
linha em `leads_atividades` com `tipo IN ('mensagem_enviada','ligacao')` —
não precisa de coluna nova, é uma query/cálculo, igual o resto dos KPIs deste
app (nada aqui é persistido pré-calculado).

KPI médio por vendedor entra em `FunilLeads.jsx`, que já tem a estrutura de
tabela por origem — replicar para "por responsável".

---

## 5. Atribuição de leads

- Round-robin sobre `profiles WHERE role='vendedor' AND ativo=true`,
  gravando em `leads.responsavel_id` (campo já existe, só precisa ser escrito
  pela primeira vez).
- Reatribuição manual pelo gestor grava em `leads_atividades`
  (`tipo='status'`, `descricao='Reatribuído de X para Y'`) — reaproveita o
  log de atividade existente como trilha de auditoria, não precisa de tabela
  de log separada.
- **Não fica "sem dono"**: `responsavel_id` deveria virar `NOT NULL` — mas só
  depois que a UI de atribuição existir (`ModalLead` não tem esse campo
  hoje); aplicar `NOT NULL` antes disso quebraria o insert manual de leads.

---

## 6. Vínculo com o estoque

Nomes corretos: usar `leads.veiculo_id` (já existe, FK para `veiculos`), não
`veiculo_interesse_id`. "Demanda não atendida" (pergunta por veículo que não
está no estoque) é conceito novo — mais simples como campo de texto livre
(`leads.veiculo_desejado_texto`) do que uma segunda FK opcional, já que por
definição o veículo não existe no estoque para linkar. Ao marcar lead como
`ganho`, vincular à venda (`vendas`/`vendas_relacao`, que já têm
`veiculo_id`) — o elo já é possível pela mesma FK, só precisa ser
preenchido no fluxo de "converter lead em venda" (hoje não existe esse botão
em `Leads.jsx`).

---

## 7. Follow-up e automação

Estrutura mantida, com uma ressalva de infraestrutura: hoje **nada** neste
projeto roda em cron/servidor — todo alerta (`alertas.js`) é recalculado no
client a cada carregamento, sobre dado realtime do Supabase. Lembrete de
"lead parado" (sem interação há N dias) encaixa nesse padrão client-side sem
mudança de infra.

Mensagem automática de reengajamento (enviar WhatsApp proativamente) **não**
encaixa — exige envio server-side (chave do provedor não pode estar no
client) e, se for fora da janela de 24h da Meta, exige template pré-aprovado.
Precisaria de `vercel.json` → `crons` (feature nova neste projeto) chamando
uma function que varre leads frios e dispara mensagem. Tratar como fase
separada, não bloqueia a captura básica.

`motivo_perda` (campo novo, §2.1) vira obrigatório no client quando
`status` muda para `perdido` — validação em `Leads.jsx`, não no banco.

---

## 8. Relatórios e KPIs do CRM

Tudo listado na spec original já tem lugar natural em `FunilLeads.jsx`
(que já calcula `tempoMedioFechamento`, `idadeMedia`, taxa de conversão por
`plataforma_origem`) — é extensão de componente existente, não página nova:

- Tempo médio até primeiro contato (geral e por `responsavel_id`)
- Taxa de conversão por `status` (funil já é visual, só adicionar o cálculo)
- Taxa de conversão por `plataforma_origem` (já existe, só ganha o valor
  `whatsapp`)
- Ranking por `responsavel_id` (novo — depende da seção 5 estar implementada)
- `motivo_perda` mais frequentes (novo campo, groupby simples)
- Leads com `veiculo_desejado_texto` preenchido, por período — alimenta a
  curva de aquisição

---

## 9. Integração com F&I

Não existe nenhuma tabela de financiamento/seguro no schema atual — item
100% novo, sem base para reaproveitar. Prioridade mais baixa que os itens
1–8: recomenda-se tratar como fase 3+, depois que a captura via WhatsApp e o
funil básico estiverem estáveis.

---

## 10. Permissões

Ver pergunta em aberto (seção 12) — a spec original propõe visão restrita
por vendedor, o que hoje não existe em nenhuma tabela deste projeto (todo
RLS é por papel, leitura aberta a todo autenticado). Duas opções viáveis,
detalhadas na pergunta:

- **A. Manter RLS atual** (leitura aberta, escrita por papel) — `responsavel_id`
  vira só um campo de atribuição/contabilidade, sem reforço de visibilidade.
  Zero mudança de arquitetura, consistente com o resto do app.
- **B. Introduzir RLS por dono** — vendedor só lê/edita leads onde
  `responsavel_id = auth.uid()` (exceto admin/operador). Seria o primeiro
  caso de RLS por ownership no projeto — precisa ser decisão explícita, não
  suposição.

Log de auditoria em reatribuição/mudança de estágio: reaproveita
`leads_atividades`, não precisa de tabela de auditoria nova (ver seção 5).

---

## 11. Considerações técnicas (Supabase + Vercel)

- **Tabelas**: `leads` e `leads_atividades` recebem `ALTER` (seção 2.1–2.2);
  `whatsapp_threads` é a única `CREATE TABLE` nova (seção 2.3). Migration
  nomeada `YYYYMMDDHHMMSS_crm_whatsapp.sql`, idempotente, via skill
  `nova-migracao` — seguindo exatamente o padrão de
  `sql/20260708120000_rls_crm_role_policies.sql`.
- **RLS**: estender a policy já existente em `leads`/`leads_atividades`
  (`sql/20260708120000...`) para cobrir `whatsapp_threads` com o mesmo
  padrão por papel — e só migrar para RLS por dono se a decisão da seção 12
  for pela opção B.
- **Webhook**: `api/whatsapp-webhook.js`, function Vercel Node (não Edge
  Function do Supabase) — mesmo padrão do `api/olx-webhook.js` removido +
  checklist da skill `secure-webhooks`. Usa `SUPABASE_SERVICE_ROLE_KEY`
  direto (REST), como o webhook antigo fazia.
- **Cifragem**: `api/_crypto.js` (já existe, sem caller hoje) passa a ser
  usado para `telefone`/`nome`/`email` — skill `pii-lgpd` tem o padrão
  completo (coluna `_encrypted` + `_hash`, máscara de exibição).
- **Envio de mensagem** (resposta do vendedor pelo Dashboard): novo endpoint
  `api/whatsapp-send.js`, chamado pelo client autenticado, nunca expõe o
  token do provedor no bundle.

---

## 12. Decisões — respondidas em 2026-08-12

1. **Provedor de WhatsApp**: decidir depois. Constrói-se apenas a interface
   de abstração (`enviarMensagem`/`receberWebhook`) quando chegar a vez do
   webhook — nenhuma escolha de Meta Cloud API vs. BSP é necessária para a
   Fase 1 (seção 13).
2. **Visibilidade de lead por vendedor**: mantém a RLS atual (leitura aberta
   por papel). `responsavel_id` é só atribuição/contabilidade para o
   round-robin — **não** restringe o que cada vendedor enxerga. Não introduz
   RLS por ownership.
3. **Ordem de implementação**: Fase 1 = extensões sobre o que já existe
   (migrations de `leads`/`leads_atividades`, cifragem PII, SLA no motor de
   alertas, atribuição/round-robin na UI). O webhook de captura via WhatsApp
   (Fase 2) fica para quando a conta do provedor estiver definida — ver
   plano de fases abaixo.

## 13. Plano de fases

**Fase 1 — concluída em 2026-08-12:**

Implementada exatamente como planejada, com um ajuste de segurança em cima do
que foi descrito abaixo: `api/_crypto.js` ganhou AAD por contexto
(`encrypt(valor, 'lead:telefone')`/`decrypt(blob, contexto)`) e
`hashParaLookup` virou HMAC-SHA256 (era SHA-256 puro — reversível por força
bruta em PII de baixa entropia como telefone). Motivo: `leads-pii-revelar.js`
decifra qualquer blob que o client mandar sem checar a origem no banco — hoje
inofensivo porque só PII de lead usa `ENCRYPTION_KEY`, mas a skill
`oauth-integrations` já planeja reusar a mesma chave/módulo para tokens OAuth
na Fase 2. Sem o AAD, o endpoint viraria um oráculo de decifragem cross-
purpose nesse momento. Revisão completa via agente `security-reviewer`.

Itens que ficaram fora desta fase (não pedidos, escopo maior):
- Vínculo automático lead→venda ao marcar "Ganho" (§6) — depende do fluxo
  `ModalIniciarVenda`/`EtapasProcesso` em `Veiculos.jsx`, integração própria.
- Backfill de PII de linhas antigas (se existirem leads pré-migration em
  produção, continuam legíveis pelas colunas de texto claro até rodar um
  script de backfill — fora do SQL, precisa de `ENCRYPTION_KEY`).

Abaixo, o plano original (referência):

**Fase 1 (agora)** — sem dependência externa, roda 100% com o que já existe:
- Migration: `ALTER TABLE leads` (motivo_perda, valor_estimado, CHECKs
  ampliados) + `ALTER TABLE leads_atividades` (canal, tipo ampliado) +
  `CREATE TABLE whatsapp_threads` (schema pronto, sem consumidor ainda) +
  RLS por papel estendida para `whatsapp_threads`.
- Cifragem de PII em `leads` (`nome`/`telefone`/`email` via `api/_crypto.js`,
  padrão da skill `pii-lgpd`).
- Alerta de SLA (`lead_sem_contato`, 15min/1h) plugado em
  `gerarTodosAlertas`.
- Atribuição de responsável na UI (`ModalLead`) + round-robin sobre
  `profiles WHERE role='vendedor'`.
- Campos novos na UI: `motivo_perda` (obrigatório ao perder),
  `valor_estimado`, `veiculo_desejado_texto` (demanda não atendida).

**Fase 2** — depende da conta WhatsApp Business estar definida:
- Escolha de provedor (Meta Cloud API vs. BSP).
- `api/whatsapp-webhook.js` (Vercel, padrão `secure-webhooks`) +
  `api/whatsapp-send.js`.
- Interface `enviarMensagem`/`receberWebhook`.

**Fase 3** — depois do básico estável:
- Automação de reengajamento (Vercel Cron).
- Integração F&I (financiamento/seguro — schema 100% novo).
