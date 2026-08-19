/**
 * Cifra simétrica para segredos em repouso (tokens OAuth, PII).
 * AES-256-GCM. Formato de armazenamento: base64(iv[12] || ciphertext || authTag[16]).
 *
 * Chave em ENCRYPTION_KEY (hex de 64 chars = 32 bytes), SÓ no ambiente do servidor.
 * Nunca importar este módulo no bundle do browser.
 *
 *   const blob = encrypt('APP_USR-123')   // → 'base64...'
 *   decrypt(blob) === 'APP_USR-123'
 */
import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

/** Lê e valida a chave. Lança se ausente ou com tamanho errado. */
function lerChave() {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(`ENCRYPTION_KEY inválida: esperado hex de 64 chars (32 bytes), recebido ${hex ? `${hex.length} chars` : 'ausente'}`)
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Cifra um texto. Retorna base64(iv || ct || tag).
 * `contexto` vira AAD (Additional Authenticated Data) do GCM — amarra o
 * ciphertext ao propósito para o qual foi gerado (ex. "lead:telefone").
 * decrypt() com contexto diferente do usado aqui falha (authTag inválido),
 * mesmo com a chave certa — impede que um blob cifrado para um propósito
 * (ex. token OAuth) seja decifrado por um endpoint pensado para outro
 * (ex. revelar PII de lead).
 */
export function encrypt(plaintext, contexto = '') {
  const key = lerChave()
  const iv  = randomBytes(IV_LEN)
  const c   = createCipheriv(ALGO, key, iv)
  if (contexto) c.setAAD(Buffer.from(contexto, 'utf8'))
  const body = Buffer.concat([c.update(String(plaintext), 'utf8'), c.final()])
  return Buffer.concat([iv, body, c.getAuthTag()]).toString('base64')
}

/** Decifra um blob base64(iv || ct || tag). Lança se adulterado ou se `contexto` não bate com o usado no encrypt(). */
export function decrypt(blob, contexto = '') {
  const key = lerChave()
  const raw = Buffer.from(blob, 'base64')
  if (raw.length < IV_LEN + TAG_LEN) {
    throw new Error(`blob cifrado curto demais: ${raw.length} bytes (mínimo ${IV_LEN + TAG_LEN})`)
  }
  const iv   = raw.subarray(0, IV_LEN)
  const tag  = raw.subarray(raw.length - TAG_LEN)
  const body = raw.subarray(IV_LEN, raw.length - TAG_LEN)
  const d    = createDecipheriv(ALGO, key, iv)
  if (contexto) d.setAAD(Buffer.from(contexto, 'utf8'))
  d.setAuthTag(tag)
  return Buffer.concat([d.update(body), d.final()]).toString('utf8')
}

/**
 * Hash determinístico para lookup sem expor o valor (HMAC-SHA256 hex, chaveado
 * por ENCRYPTION_KEY). PII de baixa entropia (telefone, CPF) não pode usar
 * SHA-256 puro — um atacante com acesso ao banco reconstrói o valor original
 * por força bruta/rainbow table (o espaço de telefones válidos é pequeno).
 * HMAC exige a chave, que só existe no servidor. Ver skill pii-lgpd.
 */
export function hashParaLookup(valorNormalizado) {
  return createHmac('sha256', lerChave()).update(String(valorNormalizado), 'utf8').digest('hex')
}
