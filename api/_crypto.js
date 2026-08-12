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
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

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

/** Cifra um texto. Retorna base64(iv || ct || tag). */
export function encrypt(plaintext) {
  const key = lerChave()
  const iv  = randomBytes(IV_LEN)
  const c   = createCipheriv(ALGO, key, iv)
  const body = Buffer.concat([c.update(String(plaintext), 'utf8'), c.final()])
  return Buffer.concat([iv, body, c.getAuthTag()]).toString('base64')
}

/** Decifra um blob base64(iv || ct || tag). Lança se adulterado (authTag). */
export function decrypt(blob) {
  const key = lerChave()
  const raw = Buffer.from(blob, 'base64')
  if (raw.length < IV_LEN + TAG_LEN) {
    throw new Error(`blob cifrado curto demais: ${raw.length} bytes (mínimo ${IV_LEN + TAG_LEN})`)
  }
  const iv   = raw.subarray(0, IV_LEN)
  const tag  = raw.subarray(raw.length - TAG_LEN)
  const body = raw.subarray(IV_LEN, raw.length - TAG_LEN)
  const d    = createDecipheriv(ALGO, key, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(body), d.final()]).toString('utf8')
}

/** Hash determinístico para lookup sem expor o valor (SHA-256 hex). Ver skill pii-lgpd. */
export function hashParaLookup(valorNormalizado) {
  return createHash('sha256').update(String(valorNormalizado), 'utf8').digest('hex')
}
