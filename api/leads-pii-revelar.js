/**
 * Decifra blobs de PII de lead para exibição sob demanda.
 * Não toca o banco — decifra apenas o que o client já tem em mãos (e só
 * conseguiu ler porque a RLS de `leads` já liberou o SELECT da linha). Cada
 * item declara o campo de origem (nome/telefone/email); o AAD do GCM só bate
 * se o blob foi cifrado por leads-pii-cifrar.js para esse mesmo campo — um
 * blob de outro propósito (ex. token OAuth cifrado com a mesma chave no
 * futuro) falha aqui em vez de ser decifrado. Ver skill pii-lgpd e
 * api/_crypto.js.
 */
import { guard } from './_guard.js'
import { decrypt } from './_crypto.js'

const LIMITE_ITENS = 150
const CONTEXTO = { nome: 'lead:nome', telefone: 'lead:telefone', email: 'lead:email' }

/** @returns {{ valor: {blob: string, campo: string}[] }|{ erro: string }} */
function validar(body) {
  if (!body || !Array.isArray(body.itens)) {
    return { erro: `campo "itens" deve ser array, recebi ${JSON.stringify(body)}` }
  }
  if (body.itens.length === 0 || body.itens.length > LIMITE_ITENS) {
    return { erro: `"itens" deve ter entre 1 e ${LIMITE_ITENS}, recebi ${body.itens.length}` }
  }
  for (const item of body.itens) {
    if (!item || typeof item.blob !== 'string' || !CONTEXTO[item.campo]) {
      return { erro: `item inválido, esperado {blob: string, campo: nome|telefone|email}, recebi ${JSON.stringify(item)}` }
    }
  }
  return { valor: body.itens }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const g = await guard(req)
  if (!g.ok) return res.status(g.status).json({ error: g.error })

  const parsed = validar(req.body)
  if ('erro' in parsed) return res.status(400).json({ error: parsed.erro })

  res.setHeader('Cache-Control', 'no-store')

  try {
    const valores = parsed.valor.map(({ blob, campo }) => decrypt(blob, CONTEXTO[campo]))
    return res.status(200).json({ valores })
  } catch {
    return res.status(500).json({ error: 'Falha ao decifrar' })
  }
}
