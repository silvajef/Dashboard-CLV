-- CLV FleetControl — Anúncios e CRM de Leads
-- v3.10 — integracoes, anuncios, leads, leads_atividades
-- PKs: bigint (padrão do projeto). FKs para auth.users mantêm uuid.

/* ── INTEGRAÇÕES (tokens OAuth por plataforma por usuário) ────────────── */
CREATE TABLE IF NOT EXISTS integracoes (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plataforma    text        NOT NULL CHECK (plataforma IN ('mercadolivre','olx','icarros','mobiauto','napista')),
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  ml_user_id    text,
  dados_extra   jsonb       DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, plataforma)
);

ALTER TABLE integracoes ENABLE ROW LEVEL SECURITY;

-- Cada usuário enxerga e edita apenas suas próprias integrações
CREATE POLICY "integracoes_own" ON integracoes
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

/* ── ANÚNCIOS (publicações de veículos nas plataformas) ───────────────── */
CREATE TABLE IF NOT EXISTS anuncios (
  id              bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  veiculo_id      bigint       REFERENCES veiculos(id) ON DELETE CASCADE NOT NULL,
  plataforma      text         NOT NULL CHECK (plataforma IN ('mercadolivre','olx','icarros','mobiauto','napista')),
  listing_id      text,
  url             text,
  status          text         NOT NULL DEFAULT 'rascunho'
                               CHECK (status IN ('ativo','pausado','expirado','vendido','erro','rascunho')),
  preco_anunciado numeric(12,2),
  titulo          text,
  publicado_em    timestamptz  DEFAULT now(),
  atualizado_em   timestamptz  DEFAULT now(),
  UNIQUE(veiculo_id, plataforma)
);

ALTER TABLE anuncios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anuncios_auth" ON anuncios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE anuncios;

/* ── LEADS (CRM) ──────────────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS leads (
  id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome              text        NOT NULL,
  telefone          text,
  email             text,
  veiculo_id        bigint      REFERENCES veiculos(id) ON DELETE SET NULL,
  anuncio_id        bigint      REFERENCES anuncios(id) ON DELETE SET NULL,
  plataforma_origem text        CHECK (plataforma_origem IN
                                  ('mercadolivre','olx','icarros','mobiauto','napista','manual')),
  status            text        NOT NULL DEFAULT 'novo'
                                CHECK (status IN ('novo','contato','visita','proposta','ganho','perdido')),
  responsavel_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  obs               text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_auth" ON leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE leads;

/* ── ATIVIDADES DE LEADS (histórico de interações) ────────────────────── */
CREATE TABLE IF NOT EXISTS leads_atividades (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id     bigint      REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  tipo        text        NOT NULL CHECK (tipo IN ('mensagem','ligacao','visita','proposta','nota','status')),
  descricao   text        NOT NULL,
  usuario_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE leads_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atividades_auth" ON leads_atividades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE leads_atividades;
