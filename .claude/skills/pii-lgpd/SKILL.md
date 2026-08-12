---
name: pii-lgpd
description: Protege PII (nome, telefone, email, CPF/CNPJ) sob LGPD — cifra AES-256-GCM em repouso, coluna hash para lookup, máscaras de exibição e exclusão de dados scoped. Use ao gravar/ler dados pessoais de leads/clientes ou implementar exclusão de conta.
---

Protege dados pessoais de terceiros (leads/clientes) conforme a LGPD. **Alvo direto:** hoje
`api/olx-webhook.js` grava `nome`/`telefone`/`email` em **texto claro** na tabela `leads`. Padrão
validado no Zennith (`lib/encrypt.ts`). Contexto em
[`docs/aprendizados-zennith.md`](../../../docs/aprendizados-zennith.md) §3.

## Quando aplicar

- Vai gravar/ler PII (nome, telefone, email, CPF, CNPJ).
- Precisa buscar registros por um campo que é PII.
- Vai exibir PII na UI.
- Implementando exclusão de conta/dados (direito ao esquecimento).

## Passos

1. **Cifra em repouso (AES-256-GCM).** Chave de 32 bytes em `ENCRYPTION_KEY` (hex de 64 chars),
   **server-only**. Crie `api/_crypto.js`:
   ```js
   import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
   const ALGO = 'aes-256-gcm'

   function chave() {
     const hex = process.env.ENCRYPTION_KEY
     if (!hex || hex.length !== 64) throw new Error(`ENCRYPTION_KEY deve ser hex de 64 chars (32 bytes); recebi length=${hex ? hex.length : 0}`)
     return Buffer.from(hex, 'hex')
   }

   /** Cifra PII. Formato: base64(iv[12] || ciphertext || authTag[16]). */
   export function encrypt(plaintext) {
     const iv = randomBytes(12)
     const c  = createCipheriv(ALGO, chave(), iv)
     const body = Buffer.concat([c.update(String(plaintext), 'utf8'), c.final()])
     return Buffer.concat([iv, body, c.getAuthTag()]).toString('base64')
   }

   /** Decifra o formato acima. */
   export function decrypt(ciphertext) {
     const buf = Buffer.from(ciphertext, 'base64')
     const iv  = buf.subarray(0, 12)
     const tag = buf.subarray(buf.length - 16)
     const body = buf.subarray(12, buf.length - 16)
     const d = createDecipheriv(ALGO, chave(), iv)
     d.setAuthTag(tag)
     return Buffer.concat([d.update(body), d.final()]).toString('utf8')
   }

   /** SHA-256 do valor normalizado — para lookup determinístico sem expor o valor. */
   export function hashLookup(valorNormalizado) {
     return createHash('sha256').update(String(valorNormalizado), 'utf8').digest('hex')
   }
   ```

2. **Guarde cifrado + hash de lookup.** Campo cifrado não é buscável (IV aleatório). Para buscar um
   lead por telefone, guarde `telefone_encrypted` **e** `telefone_hash = hashLookup(e164)`; busque
   pelo hash. Exemplo no upsert do webhook:
   ```js
   const e164 = normalizarTelefone(body.phone)          // +55DDDNNNNNNNNN
   leadPayload.telefone_encrypted = encrypt(e164)
   leadPayload.telefone_hash      = hashLookup(e164)     // indexável, buscável
   delete leadPayload.telefone                            // não gravar texto claro
   ```

3. **Máscaras de exibição** — a UI recebe o mínimo:
   ```js
   export const maskTelefone = (t) => `+55 (••) •••••-${String(t).replace(/\D/g, '').slice(-4)}`
   export const maskCpf      = (c) => { const d = String(c).replace(/\D/g, ''); return `•••.•••.${d.slice(6, 9)}-${d.slice(9, 11)}` }
   ```

4. **Direito ao esquecimento** — RPC `SECURITY DEFINER` que apaga só os dados do próprio
   `auth.uid()` (nunca id de alvo do cliente). Ver skill `rls-hardening` para o padrão REVOKE/scoping.

## Verificação

- `decrypt(encrypt(x)) === x` (round-trip).
- Busca por `*_hash` encontra o registro sem que o valor apareça em índice ou log.
- UI só recebe o valor mascarado onde o completo não é necessário.
- RPC de exclusão apaga apenas linhas onde `user_id = auth.uid()`; teste cross-tenant confirma que
  não apaga dados de outro usuário.
