/**
 * Dashboard CLV — Data Access Layer (Supabase)
 */
import { supabase } from './supabase'

/* ── VEÍCULOS ───────────────────────────────────────────────────────────── */
export async function getVeiculos() {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*, servicos(*, prestador:prestadores(id, nome))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertVeiculo(veiculo) {
  const { servicos, prestador, id, ...payload } = veiculo
  payload.modelo = payload.modelo_nome || payload.modelo || ''

  const { data, error } = id
    ? await supabase.from('veiculos').update(payload).eq('id', id).select().single()
    : await supabase.from('veiculos').insert(payload).select().single()

  if (error) throw error
  return data
}

export async function deleteVeiculo(id) {
  const { error } = await supabase.from('veiculos').delete().eq('id', id)
  if (error) throw error
}

/* ── SERVIÇOS ──────────────────────────────────────────────────────────── */
export async function upsertServico(servico) {
  const { prestador, id, ...payload } = servico

  const { data, error } = id
    ? await supabase.from('servicos').update(payload).eq('id', id)
        .select('*, prestador:prestadores(id, nome)').single()
    : await supabase.from('servicos').insert(payload)
        .select('*, prestador:prestadores(id, nome)').single()

  if (error) throw error
  return data
}

export async function deleteServico(id) {
  const { error } = await supabase.from('servicos').delete().eq('id', id)
  if (error) throw error
}

/* ── PRESTADORES ───────────────────────────────────────────────────────── */
export async function getPrestadores() {
  const { data, error } = await supabase.from('prestadores').select('*').order('nome')
  if (error) throw error
  return data
}

export async function upsertPrestador(p) {
  const { id, ...payload } = p
  const { data, error } = id
    ? await supabase.from('prestadores').update(payload).eq('id', id).select().single()
    : await supabase.from('prestadores').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function deletePrestador(id) {
  const { error } = await supabase.from('prestadores').delete().eq('id', id)
  if (error) throw error
}

/* ── METAS ─────────────────────────────────────────────────────────────── */
// CORRIGIDO: bug v3.6 onde data/error estavam sendo usados antes de declarados
export async function getMetas() {
  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  return data || { vendas_mes: 3, margem_min: 8, dias_max_estoque: 90, custo_max_pct: 5 }
}

export async function saveMetas(metas) {
  const { id, ...payload } = metas
  const { data, error } = await supabase
    .from('metas').upsert({ ...payload, id: 1 }, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data
}

/* ── CLIENTES (v3.7) ───────────────────────────────────────────────────── */
export async function getClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome')
  if (error) throw error
  return data || []
}

export async function upsertCliente(cliente) {
  const { id, ...payload } = cliente

  // Limpa cpf_cnpj vazio para permitir multiple NULLs no índice único
  if (!payload.cpf_cnpj || payload.cpf_cnpj.trim() === '') {
    payload.cpf_cnpj = null
  }

  const { data, error } = id
    ? await supabase.from('clientes').update(payload).eq('id', id).select().single()
    : await supabase.from('clientes').insert(payload).select().single()

  if (error) throw error
  return data
}

export async function deleteCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}

/* ── VENDAS RELACAO (v3.7) ─────────────────────────────────────────────── */
export async function getVendasRelacao() {
  const { data, error } = await supabase
    .from('vendas_relacao')
    .select(`
      *,
      cliente:clientes(*),
      veiculo:veiculos(*)
    `)
    .order('data_venda', { ascending: false })

  if (error) throw error
  return data || []
}

export async function upsertVendaRelacao(venda) {
  const { id, cliente, veiculo, garantia_fim, ...payload } = venda

  // garantia_fim é gerada automaticamente pelo banco — não enviar
  // cliente/veiculo são objetos relacionais — não enviar

  const { data, error } = id
    ? await supabase.from('vendas_relacao').update(payload).eq('id', id)
        .select('*, cliente:clientes(*), veiculo:veiculos(*)').single()
    : await supabase.from('vendas_relacao').insert(payload)
        .select('*, cliente:clientes(*), veiculo:veiculos(*)').single()

  if (error) throw error
  return data
}

export async function deleteVendaRelacao(id) {
  const { error } = await supabase.from('vendas_relacao').delete().eq('id', id)
  if (error) throw error
}

/**
 * registrarVenda
 *
 * Operação composta que:
 *   1. Cria/atualiza o cliente (deduplicando por cpf_cnpj)
 *   2. Marca o veículo como vendido
 *   3. Cria o registro em vendas_relacao com garantia
 *
 * Substitui o fluxo antigo onde a venda só atualizava o veículo.
 */
export async function registrarVenda({ veiculo_id, cliente, valor_venda, data_venda, garantia_dias = 90 }) {
  // 1. Cria/encontra o cliente
  let clienteId = cliente.id

  if (!clienteId) {
    // Tenta encontrar cliente existente pelo cpf_cnpj
    if (cliente.cpf_cnpj && cliente.cpf_cnpj.trim() !== '') {
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('cpf_cnpj', cliente.cpf_cnpj.trim())
        .maybeSingle()

      if (existente) clienteId = existente.id
    }

    // Se não encontrou, cria
    if (!clienteId) {
      const novoCliente = await upsertCliente(cliente)
      clienteId = novoCliente.id
    }
  }

  // 2. Atualiza o veículo (mantém compatibilidade com a estrutura atual)
  await supabase
    .from('veiculos')
    .update({
      status:         'vendido',
      valor_venda,
      data_venda,
      comprador_nome: cliente.nome,
      comprador_doc:  cliente.cpf_cnpj || null,
    })
    .eq('id', veiculo_id)

  // 3. Cria a relação de venda com garantia
  const venda = await upsertVendaRelacao({
    veiculo_id,
    cliente_id:      clienteId,
    valor_venda,
    data_venda,
    garantia_dias,
    garantia_inicio: data_venda,
  })

  return venda
}
