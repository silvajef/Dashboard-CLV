---
name: secure-webhooks
description: Padrão seguro para webhooks de entrada (ML/OLX) — verificação de assinatura HMAC timing-safe, ack rápido, idempotência, raw-event e nunca logar segredos. Use ao criar ou revisar qualquer receptor de webhook em api/.
---

Endureça receptores de webhook. O `api/olx-webhook.js` **já acerta** ack rápido, raw-event,
idempotência por `external_id` e `sanitizeHeaders` — codifique isso como padrão e adicione a
verificação de assinatura que falta. Padrão do webhook Pluggy do Zennith. Contexto em
[`docs/aprendizados-zennith.md`](../../../docs/aprendizados-zennith.md) §4.

## Quando aplicar

- Novo receptor de webhook em `api/` (ML, OLX, iCarros, pagamentos…).
- Revisão de webhook existente.

## Passos

1. **Verifique a assinatura sobre o corpo CRU, em tempo constante** (para providers que assinam o
   payload, ex.: Mercado Livre). Leia o body como string **antes** de `JSON.parse` — reserializar
   quebra o HMAC. Nunca compare assinatura com `===`.
   ```js
   import { createHmac } from 'crypto'

   /** Valida assinatura HMAC-SHA256 do corpo cru. Comparação em tempo constante. */
   export function assinaturaValida(rawBody, signature, secret) {
     if (!secret || !signature) return false
     const esperado = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
     if (esperado.length !== signature.length) return false
     let diff = 0
     for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ signature.charCodeAt(i)
     return diff === 0
   }
   ```
   Provider que autentica por **token** (OLX manda `Authorization: Bearer <webhook_token>`): valide
   fazendo lookup do token na tabela `integracoes` para achar o `user_id` — padrão já usado no
   `olx-webhook.js`. Token ausente/inválido → **401**.

2. **Ack primeiro, processa depois.** O provider exige 2XX rápido (OLX: 5s). Responda 200 e faça o
   trabalho pesado como fire-and-forget:
   ```js
   res.status(200).json({ success: true, responseId })   // ack imediato
   processar(evento).catch((e) => console.log(JSON.stringify({ event: 'process_error', responseId, error: e.message })))
   ```

3. **Persista o raw-event** antes de processar (`raw_webhook_events`: provider, payload, headers
   sanitizados, status). Permite reprocessar e auditar.

4. **Idempotência** — providers reenviam. Chave estável (`external_id`; se ausente, hash de campos
   estáveis do payload, como `gerarIdempotencyKey`) + **índice único** no banco + `INSERT` com
   `resolution=ignore-duplicates`. Lição do Zennith: um id externo pode se repetir entre itens
   relacionados — se necessário, use **chave composta** (ex.: `(user_id, external_id, data, valor)`),
   não só o id.

5. **Nunca logue segredos.** Antes de gravar/logar headers, remova `authorization`, `x-api-key`,
   `cookie`:
   ```js
   function sanitizeHeaders(h) { const { authorization, 'x-api-key': _k, cookie: _c, ...safe } = h; return safe }
   ```
   Logging sempre em JSON estruturado (`console.log(JSON.stringify({ event, responseId, ... }))`).

## Verificação

- Assinatura inválida (ou token ausente) → **401/403**, nada gravado.
- Mesmo payload reenviado (mesmo `external_id`) → **sem duplicata** (índice único / ignore-duplicates).
- Provider recebe 2XX dentro do timeout mesmo quando o processamento é lento.
- Nenhum token/segredo aparece nos logs (`raw_webhook_events.headers` sanitizado).
