---
name: oauth-integrations
description: Integrações OAuth com plataformas externas (Mercado Livre, OLX) — tokens só no servidor e cifrados, refresh proativo, adaptador por plataforma e idempotência no publish. Use ao adicionar/alterar integração OAuth ou publicar anúncios em plataformas.
---

Padrão para integrar plataformas via OAuth sem vazar segredos. `api/ml-token.js` já faz a troca do
`authorization_code` server-side (bom: `client_secret` fora do browser), mas **hoje devolve os
tokens ao browser** — antipadrão a corrigir. Contexto em
[`docs/aprendizados-zennith.md`](../../../docs/aprendizados-zennith.md) §5.

## Quando aplicar

- Adicionar/alterar integração OAuth (ML, OLX, iCarros…).
- Publicar/atualizar anúncio em plataforma externa (autoupload).
- Rever `api/ml-token.js`, `api/ml-api.js`, `src/lib/plataformas/*`.

## Passos

1. **Tokens vivem só no servidor, cifrados em repouso.** A função `api/ml-token.js` deve gravar o
   `access_token`/`refresh_token` cifrados (reuse `encrypt` da skill `pii-lgpd`) na tabela
   `integracoes` (protegida por RLS/service-role) e **retornar ao cliente apenas o status**
   (conectado + `expires_at`), nunca os tokens.
   ```js
   // depois da troca bem-sucedida do code por token:
   await admin.from('integracoes').upsert({
     user_id: userId, plataforma: 'ml',
     access_token_enc:  encrypt(json.access_token),
     refresh_token_enc: encrypt(json.refresh_token),
     expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
   })
   return res.status(200).json({ conectado: true })   // NÃO retornar tokens ao browser
   ```

2. **Refresh proativo.** Um helper server-side garante token válido antes de cada chamada de saída;
   renova quando faltar pouco para `expires_at` e regrava cifrado.
   ```js
   /** Retorna um access_token válido, renovando se estiver perto de expirar. */
   async function tokenValido(userId, plataforma) {
     const row = await carregarIntegracao(userId, plataforma)
     if (!row) throw new Error(`integração ausente: user=${userId} plataforma=${plataforma}`)
     const faltaPouco = new Date(row.expires_at).getTime() - Date.now() < 60_000
     if (!faltaPouco) return decrypt(row.access_token_enc)
     return await renovar(userId, plataforma, decrypt(row.refresh_token_enc))
   }
   ```

3. **Adaptador por plataforma.** Mantenha `src/lib/plataformas/*` com uma interface fina e única por
   plataforma (ML real, stubs OLX/iCarros). Troca de provider não vaza para o resto do app
   ("wrap third-party libs behind a thin interface", `CLAUDE.md`). O cliente chama sempre a mesma
   forma; a função `api/*` resolve o provider.

4. **Idempotência no publish de saída.** Republicar o mesmo veículo não pode criar anúncio duplicado
   — use `listing_id`/`adId` como chave: se já existe anúncio para `(veiculo_id, plataforma)`,
   faça update, não novo insert.

5. **Segredos:** `client_secret`, tokens e webhook_token nunca no bundle do browser nem em
   `localStorage`. Variáveis sensíveis só no ambiente do servidor (Vercel).

## Verificação

- Nenhum `access_token`/`refresh_token`/`client_secret` aparece na resposta ao browser, no bundle
  ou em `localStorage`.
- Uma chamada de saída perto do vencimento renova o token antes de falhar (`tokenValido`).
- Publicar o mesmo veículo duas vezes resulta em um único anúncio por plataforma (update, não duplicata).
- Trocar de provider mexe só no adaptador em `src/lib/plataformas/`, não nas páginas.
