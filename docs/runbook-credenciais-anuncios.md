# Runbook — Credenciais de Anúncios (Mercado Livre, OLX, Facebook)

> Documento vivo. A pesquisa feita durante o design desta feature (2026-08-31)
> confirmou que os portais do ML e da OLX bloqueiam leitura automatizada
> (403 ao tentar buscar a documentação oficial via ferramenta) e que o passo
> de aprovação varia por conta — por isso este guia é preenchido **junto com
> você**, sessão por sessão, em vez de escrito de antemão. Cada seção abaixo
> tem o que já sabemos (pesquisa + código antigo) e o que falta confirmar ao
> vivo. Atualize esta seção conforme formos avançando.

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Onde é lida | Segredo? |
|---|---|---|
| `VITE_ML_CLIENT_ID` | browser (`src/lib/plataformas/mercadolivre.js`) | não — client_id é público |
| `ML_CLIENT_ID` | servidor (`api/_plataformas/mercadolivre.js`) | não |
| `ML_CLIENT_SECRET` | servidor (`api/_plataformas/mercadolivre.js`) | **sim** — nunca prefixar com `VITE_` |
| `VITE_OLX_CLIENT_ID` | browser (`src/lib/plataformas/olx.js`) | não |
| `OLX_CLIENT_ID` | servidor (`api/_plataformas/olx.js`) | não |
| `OLX_CLIENT_SECRET` | servidor (`api/_plataformas/olx.js`) | **sim** — nunca prefixar com `VITE_` |
| `ENCRYPTION_KEY` | já existe (PII/LGPD) | sim — reusada pra cifrar tokens |
| `APP_PUBLIC_URL` | servidor (`api/anuncios-olx-configurar-leads.js`, `api/anuncios-status.js`) | não — mas **obrigatória**: sem ela, a URL do webhook OLX/feed Facebook não é montada a partir de `req.headers.host` de propósito (um Host forjado poderia redirecionar leads pra outro domínio — achado do security-reviewer). Ex.: `https://dashboard-clv.vercel.app` (sem barra no final) |
| `LOJA_TELEFONE` | servidor (`api/_plataformas/olx.js`) | não — telefone de contato usado nos anúncios OLX (não existe campo de telefone da loja em `veiculos`) |
| `LOJA_CEP` | servidor (`api/_plataformas/olx.js`) | não — CEP usado nos anúncios OLX |

⚠️ Regra que gerou a maior parte da dívida de segurança removida em 2026-07-08:
**nenhuma variável de client_secret pode ter o prefixo `VITE_`** — o Vite publica
toda `VITE_*` no bundle JS do browser. `ML_CLIENT_ID`/`OLX_CLIENT_ID` (sem `VITE_`)
existem SÓ pra uso do servidor mesmo sendo "não-secretos" — evita duplicar a
mesma env var com e sem prefixo.

## Mercado Livre

**Status:** não iniciado.

1. Acesse https://developers.mercadolivre.com.br/devcenter com o usuário
   administrador da conta ML da loja.
2. "Criar nova aplicação" → preencher nome, descrição, **Redirect URI**
   (precisa bater exatamente com `https://<seu-domínio>/` — sem barra a mais
   ou a menos).
3. Após criar, a tela de edição mostra o **App ID** (= `client_id`) e um botão
   pra revelar o **Client Secret**.
4. **A confirmar ao vivo:** se publicar na categoria de veículos
   (Classificados) exige algo além da criação do app — a conta ML pode
   precisar já operar nessa categoria, ou pode haver um scope/permissão
   adicional. Reportar aqui o que a tela pedir.
5. **A confirmar ao vivo:** `category_id` correto pra veículos (o modal de
   publicação em `src/components/ModalPublicarAnuncio.jsx` hoje pede esse
   valor manualmente — ex.: buscar via `GET /sites/MLB/categories` filtrando
   por "Carros, Motos e Outros").

## OLX

**Status:** não iniciado.

1. Acesse https://developers.olx.com.br e registre a aplicação com o(s)
   **redirect_uri** (mínimo 1, máximo 3, conforme a doc pública).
2. Segundo a doc pública, a OLX **não é self-service**: depois do registro,
   a OLX entra em contato pra entregar `client_id` e `client_secret`. **A
   confirmar ao vivo:** prazo típico e se ainda é assim em 2026.
3. Scope necessário: `autoupload` (publicação) — leads via webhook
   (`api/olx-webhook.js`) exigem a conta OLX ter **plano profissional**
   ativo (erro `code: -6` da API se não tiver, ver `api/_plataformas/olx.js`).
4. **A confirmar ao vivo:** telefone/CEP da loja pra usar no payload de
   publicação — hoje `api/_plataformas/olx.js#publicarAnuncio` tenta ler
   `veiculo.telefone`/`veiculo.cep`, que **não existem** na tabela
   `veiculos` (schema real só tem campos do veículo em si). Precisa decidir
   uma fonte fixa (ex.: env var `LOJA_TELEFONE`/`LOJA_CEP`) antes de publicar
   de verdade — hoje cai no fallback `'00000000000'`/vazio.

## Facebook (feed de catálogo automotivo)

**Status:** não iniciado. Diferente de ML/OLX — não é OAuth por item.

1. Acesse o Meta Commerce Manager (business.facebook.com/commerce) com a
   Página do Facebook da loja.
2. Catálogo → tipo **Veículos** → Inventário automotivo.
3. **A confirmar ao vivo:** requisito de verificação de revendedor — a
   pesquisa (2026-08-31) indicou que existe uma etapa de conta verificada
   pra Vehicle Inventory Solutions, mas não achei o passo a passo exato
   (a página de ajuda da Meta não retornou conteúdo renderizável via
   ferramenta). Documentar aqui o fluxo real assim que percorrido.
4. **A confirmar ao vivo:** baixe o **modelo de feed** direto do Commerce
   Manager (Configurações do feed → Baixar modelo) e compare com os campos
   gerados em `api/anuncios-facebook-feed.js` — o XML atual é um melhor
   esforço baseado em documentação genérica, não confirmado contra o schema
   real da Meta.
5. Depois de criar o catálogo, cole a URL do feed (gerada em
   Configurações → Facebook → "Gerar URL do feed" no Dashboard CLV) no campo
   de "Feed de dados" do Commerce Manager, com a frequência de sincronização
   desejada (a rota aceita `Cache-Control: public, max-age=1800`, ou seja
   suporta polling de até 30min sem custo extra de processamento).

## Depois de conectar cada plataforma

- Confirme em **Configurações** (aba do Dashboard CLV) que o card mostra
  "Conectado"/"Ativo" sem erro.
- Publique 1 veículo de teste em **Anúncios**, confira que aparece uma
  pílula verde no card do veículo e que o link/listing_id bate com o
  anúncio real na plataforma.
- Marque esse mesmo veículo como vendido (fluxo normal de venda) e confirme
  que a pílula vira "Encerrado" automaticamente nas plataformas conectadas.
