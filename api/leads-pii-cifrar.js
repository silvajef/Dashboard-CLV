/**
 * Cifra nome/telefone/email de um lead antes de gravar no Supabase.
 * O client nunca grava PII em texto claro — chama este endpoint primeiro,
 * envia os blobs retornados para leads.nome_encrypted/telefone_encrypted/
 * telefone_hash/email_encrypted via upsertLead(). Ver skill pii-lgpd.
 */
import { guard } from './_guard.js'
import { encrypt, hashParaLookup } from './_crypto.js'

const LIMITE_TAMANHO = { nome: 200, telefone: 20, email: 254 }

/** AAD do GCM — amarra o ciphertext ao campo, ver api/_crypto.js. */
const CONTEXTO = { nome: 'lead:nome', telefone: 'lead:telefone', email: 'lead:email' }

/** Normaliza telefone para E.164-ish antes do hash (dedupe estável). */
function normalizarTelefone(telefone) {
  const digitos = String(telefone).replace(/\D/g, '')
  return digitos.startsWith('55') ? `+${digitos}` : `+55${digitos}`
}

/** @returns {{ valor: object }|{ erro: string }} */
function validar(body) {
  if (!body || typeof body !== 'object') return { erro: `body inválido: esperado objeto, recebi ${typeof body}` }
  const { nome, telefone, email } = body
  if (nome === undefined && telefone === undefined && email === undefined) {
    return { erro: `informe ao menos um de nome/telefone/email, recebi ${JSON.stringify(body)}` }
  }
  for (const [campo, valor] of Object.entries({ nome, telefone, email })) {
    if (valor === undefined) continue
    if (typeof valor !== 'string') return { erro: `campo "${campo}" deve ser string, recebi ${typeof valor}` }
    if (valor.length > LIMITE_TAMANHO[campo]) {
      return { erro: `campo "${campo}" excede ${LIMITE_TAMANHO[campo]} chars, recebi ${valor.length}` }
    }
  }
  return { valor: { nome, telefone, email } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const g = await guard(req)
  if (!g.ok) return res.status(g.status).json({ error: g.error })

  const parsed = validar(req.body)
  if ('erro' in parsed) return res.status(400).json({ error: parsed.erro })
  const { nome, telefone, email } = parsed.valor

  res.setHeader('Cache-Control', 'no-store')

  try {
    const resultado = {}
    if (nome !== undefined) resultado.nome_encrypted = encrypt(nome, CONTEXTO.nome)
    if (telefone !== undefined) {
      const e164 = telefone ? normalizarTelefone(telefone) : ''
      resultado.telefone_encrypted = encrypt(e164, CONTEXTO.telefone)
      resultado.telefone_hash = telefone ? hashParaLookup(e164) : null
    }
    if (email !== undefined) resultado.email_encrypted = encrypt(email ? email.trim().toLowerCase() : '', CONTEXTO.email)
    return res.status(200).json(resultado)
  } catch {
    return res.status(500).json({ error: 'Falha ao cifrar' })
  }
}
