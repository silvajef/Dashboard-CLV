/**
 * Camada de dados — leads e atividades do CRM (Supabase).
 * nome/telefone/email de leads são PII cifrada em repouso — ver skill
 * pii-lgpd. getLeads() decifra sob demanda; upsertLead() cifra antes de
 * gravar, nunca envia texto claro pro banco.
 */
import { supabase } from './supabase'

/* ── PII: cifra/decifra via api/leads-pii-*.js (chave fica só no servidor) */

const LOTE_REVELAR = 50
const CAMPOS_PII = [
  ['nome_encrypted', 'nome'],
  ['telefone_encrypted', 'telefone'],
  ['email_encrypted', 'email'],
]

async function chamarApiPii(rota, body) {
  const { data: sessao } = await supabase.auth.getSession()
  const token = sessao?.session?.access_token
  const res = await fetch(`/api/${rota}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Falha em /api/${rota}: HTTP ${res.status}`)
  return res.json()
}

async function revelarLote(itens) {
  const valores = []
  for (let i = 0; i < itens.length; i += LOTE_REVELAR) {
    const fatia = itens.slice(i, i + LOTE_REVELAR)
    const resultado = await chamarApiPii('leads-pii-revelar', { itens: fatia })
    valores.push(...resultado.valores)
  }
  return valores
}

/** Decifra nome/telefone/email de um lote de leads; mantém texto claro legado onde não há *_encrypted. */
async function decifrarLeads(leads) {
  const pendentes = []
  const itens = []
  leads.forEach((lead, leadIdx) => {
    for (const [campoEnc, campoDestino] of CAMPOS_PII) {
      if (lead[campoEnc]) {
        pendentes.push({ leadIdx, campoDestino })
        itens.push({ blob: lead[campoEnc], campo: campoDestino })
      }
    }
  })
  if (itens.length === 0) return leads

  const valores = await revelarLote(itens)
  const copia = leads.map(l => ({ ...l }))
  pendentes.forEach(({ leadIdx, campoDestino }, i) => { copia[leadIdx][campoDestino] = valores[i] })
  return copia
}

/* ── Leads ────────────────────────────────────────────────────────────── */

export async function getLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('*, veiculo:veiculos(id, placa, modelo, marca_nome, modelo_nome, ano_modelo), atividades:leads_atividades(id, tipo, created_at)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return decifrarLeads(data || [])
}

export async function upsertLead(lead) {
  const { id, veiculo, nome, telefone, email, ...payload } = lead
  payload.updated_at = new Date().toISOString()

  if (nome !== undefined || telefone !== undefined || email !== undefined) {
    Object.assign(payload, await chamarApiPii('leads-pii-cifrar', { nome, telefone, email }))
  }

  if (id) {
    const { data, error } = await supabase.from('leads').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  // Proveniência: lead manual carimba quem criou (não é fronteira de RLS —
  // ver migration 20260708120000). O webhook OLX já grava user_id próprio.
  if (payload.user_id == null) payload.user_id = await usuarioAtualId()

  const { data, error } = await supabase.from('leads').insert(payload).select().single()
  if (error) throw error
  return data
}

async function usuarioAtualId() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.user?.id ?? null
}

export async function deleteLead(id) {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

/* ── Atribuição ───────────────────────────────────────────────────────── */

/** Vendedores ativos, candidatos a responsável por um lead (round-robin). */
export async function getVendedoresAtivos() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('role', 'vendedor')
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return data || []
}

/**
 * Escolhe o vendedor com menos leads ativos (não ganho/perdido) — round-robin
 * por carga, sem precisar de estado/ponteiro persistido.
 */
export function proximoResponsavel(vendedores, leadsAtuais) {
  if (!vendedores?.length) return null
  const carga = Object.fromEntries(vendedores.map(v => [v.id, 0]))
  leadsAtuais
    .filter(l => !['ganho', 'perdido'].includes(l.status) && carga[l.responsavel_id] !== undefined)
    .forEach(l => { carga[l.responsavel_id] += 1 })
  return vendedores.reduce((menor, v) => carga[v.id] < carga[menor.id] ? v : menor, vendedores[0]).id
}

/* ── Atividades ───────────────────────────────────────────────────────── */

export async function getAtividades(leadId) {
  const { data, error } = await supabase
    .from('leads_atividades')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addAtividade(atividade) {
  const { data, error } = await supabase
    .from('leads_atividades')
    .insert(atividade)
    .select()
    .single()
  if (error) throw error
  return data
}
