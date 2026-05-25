/**
 * Dashboard CLV — Data Access Layer (Supabase)
 * v3.8 — valor_compra (era valor_estoque), custos_fixos, vendedor, comissao_pct
 */
import { supabase } from './supabase'

/* ── VEÍCULOS ───────────────────────────────────────────────────────────── */
export async function getVeiculos() {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*, servicos(*, prestador:prestadores(id, nome)), custos_fixos(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertVeiculo(veiculo) {
  // Extrai relações e campos virtuais que não vão para o banco
  const { servicos, prestador, custos_fixos, _custos_fixos, id, ...payload } = veiculo
  payload.modelo = payload.modelo_nome || payload.modelo || ''

  const { data, error } = id
    ? await supabase.from('veiculos').update(payload).eq('id', id).select().single()
    : await supabase.from('veiculos').insert(payload).select().single()

  if (error) throw error

  // Salva custos_fixos se fornecido (_custos_fixos vem do ModalVeiculo)
  // custos_fixos do banco vem como array (relação 1-N), pegar primeiro elemento
  const cfRaw = _custos_fixos || custos_fixos
  const cfPayload = Array.isArray(cfRaw) ? cfRaw[0] : cfRaw
  if (cfPayload && data?.id) {
    await upsertCustosFixos({ veiculo_id: data.id, ...cfPayload })
  }

  return data
}

export async function deleteVeiculo(id) {
  const { error } = await supabase.from('veiculos').delete().eq('id', id)
  if (error) throw error
}

/* ── CUSTOS FIXOS (v3.8) ────────────────────────────────────────────────── */
export async function upsertCustosFixos(custos) {
  const { id, veiculo_id, ...payload } = custos

  // Tenta UPDATE primeiro (existe registro para este veículo?)
  const { data: existente } = await supabase
    .from('custos_fixos')
    .select('id')
    .eq('veiculo_id', veiculo_id)
    .maybeSingle()

  if (existente) {
    const { data, error } = await supabase
      .from('custos_fixos')
      .update(payload)
      .eq('veiculo_id', veiculo_id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('custos_fixos')
      .insert({ veiculo_id, ...payload })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteCustosFixos(veiculoId) {
  const { error } = await supabase
    .from('custos_fixos')
    .delete()
    .eq('veiculo_id', veiculoId)
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
    .select('*, cliente:clientes(*), veiculo:veiculos(*)')
    .order('data_venda', { ascending: false })
  if (error) throw error
  return data || []
}

export async function upsertVendaRelacao(venda) {
  const { id, cliente, veiculo, garantia_fim, ...payload } = venda
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

/* ── PROCESSOS DE VENDA (v3.9) ──────────────────────────────────────────── */
export async function getProcessosVenda() {
  const { data, error } = await supabase
    .from('processos_venda')
    .select('*')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data || []
}

export async function upsertProcessoVenda(processo) {
  const { id, veiculo, ...payload } = processo
  const { data, error } = id
    ? await supabase.from('processos_venda').update(payload).eq('id', id).select().single()
    : await supabase.from('processos_venda').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function deleteProcessoVenda(id) {
  const { error } = await supabase.from('processos_venda').delete().eq('id', id)
  if (error) throw error
}

/**
 * Conclui o processo: marca como concluído, muda veículo para "vendido",
 * cria registro de venda e, se houver troca, insere novo veículo no estoque.
 */
export async function concluirProcessoVenda({ processoId, processo, veiculo, dataVenda }) {
  const dataVendaFinal = dataVenda || new Date().toISOString().split('T')[0]
  // 1. Processo → concluido
  const { error: e1 } = await supabase
    .from('processos_venda')
    .update({ status: 'concluido' })
    .eq('id', processoId)
  if (e1) throw e1

  // 2. Veículo → vendido + dados do comprador
  const { error: e2 } = await supabase
    .from('veiculos')
    .update({
      status:         'vendido',
      valor_venda:    processo.valor_venda,
      data_venda:     dataVendaFinal,
      comprador_nome: processo.comprador_nome,
      comprador_doc:  processo.comprador_doc || null,
      vendedor_nome:  processo.vendedor_nome || null,
      comissao_pct:   processo.comissao_pct  || 0,
    })
    .eq('id', veiculo.id)
  if (e2) throw e2

  // 3. Veículo em troca → entra no estoque como "pendente"
  if (['troca','troca_financiado'].includes(processo.forma_pagamento) && processo.troca_placa) {
    const { error: e3 } = await supabase.from('veiculos').insert({
      placa:        processo.troca_placa.toUpperCase(),
      marca_nome:   processo.troca_marca  || '',
      modelo_nome:  processo.troca_modelo || '',
      modelo:       processo.troca_modelo || '',
      ano_modelo:   processo.troca_ano    || '',
      km:           processo.troca_km     || 0,
      cor:          (processo.troca_cor   || '').toUpperCase(),
      valor_compra: processo.troca_valor  || 0,
      tipo:         processo.troca_tipo        || 'Carro',
      combustivel:  processo.troca_combustivel || null,
      codigo_fipe:  processo.troca_codigo_fipe || null,
      valor_fipe:   processo.troca_valor_fipe  || null,
      status:       'pendente',
      data_entrada: new Date().toISOString().split('T')[0],
      obs:          `RECEBIDO EM TROCA — PROC. #${processoId}`,
    })
    if (e3) throw e3
  }

  // 4. Cria/encontra cliente e registra em vendas_relacao (alimenta Pós-Venda)
  let clienteId = null

  if (processo.comprador_doc?.trim()) {
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('cpf_cnpj', processo.comprador_doc.trim())
      .maybeSingle()
    if (clienteExistente) clienteId = clienteExistente.id
  }

  if (!clienteId) {
    const { data: novoCliente, error: e4 } = await supabase
      .from('clientes')
      .insert({
        nome:     processo.comprador_nome || 'Comprador não identificado',
        cpf_cnpj: processo.comprador_doc?.trim() || null,
        telefone: processo.comprador_telefone || null,
        email:    processo.comprador_email    || null,
        endereco: processo.comprador_endereco || null,
      })
      .select('id')
      .single()
    if (e4) throw e4
    clienteId = novoCliente.id
  }

  const { error: e5 } = await supabase.from('vendas_relacao').insert({
    veiculo_id:      veiculo.id,
    cliente_id:      clienteId,
    data_venda:      dataVendaFinal,
    valor_venda:     processo.valor_venda || 0,
    garantia_dias:   90,
    garantia_inicio: dataVendaFinal,
  })
  if (e5) throw e5
}

/**
 * Cancela o processo: reverte veículo ao status anterior.
 */
export async function cancelarProcessoVenda({ processoId, veiculoId, statusAnterior }) {
  const { error: e1 } = await supabase
    .from('processos_venda')
    .update({ status: 'cancelado' })
    .eq('id', processoId)
  if (e1) throw e1

  const { error: e2 } = await supabase
    .from('veiculos')
    .update({ status: statusAnterior || 'pronto' })
    .eq('id', veiculoId)
  if (e2) throw e2
}

export async function registrarVenda({ veiculo_id, cliente, valor_venda, data_venda, garantia_dias = 90 }) {
  let clienteId = cliente.id

  if (!clienteId) {
    if (cliente.cpf_cnpj && cliente.cpf_cnpj.trim() !== '') {
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('cpf_cnpj', cliente.cpf_cnpj.trim())
        .maybeSingle()
      if (existente) clienteId = existente.id
    }
    if (!clienteId) {
      const novoCliente = await upsertCliente(cliente)
      clienteId = novoCliente.id
    }
  }

  await supabase
    .from('veiculos')
    .update({
      status: 'vendido',
      valor_venda,
      data_venda,
      comprador_nome: cliente.nome,
      comprador_doc:  cliente.cpf_cnpj || null,
    })
    .eq('id', veiculo_id)

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

/* ── DOCUMENTOS (v4.0) ─────────────────────────────────────────────────────── */
const BUCKET_DOCS = 'documentos-veiculos'

export async function getDocumentos(veiculoId) {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('veiculo_id', veiculoId)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data || []
}

async function comprimirSeImagem(file) {
  if (!file.type.startsWith('image/')) return file
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio  = Math.min(1, 1920 / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', 0.82)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export async function uploadDocumento({ veiculoId, file, categoria, nome }) {
  const payload  = await comprimirSeImagem(file)
  const ext      = file.name.split('.').pop().toLowerCase()
  const safeName = nome.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path     = `${veiculoId}/${Date.now()}_${safeName}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET_DOCS)
    .upload(path, payload, { contentType: file.type, upsert: false })
  if (upErr) throw upErr

  const { data, error } = await supabase
    .from('documentos')
    .insert({
      veiculo_id:   veiculoId,
      categoria,
      nome,
      storage_path: path,
      tipo_mime:    file.type,
      tamanho_kb:   Math.round(payload.size / 1024),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadContratoGerado({ veiculoId, blob, nomeArquivo }) {
  const path = `${veiculoId}/${Date.now()}_${nomeArquivo}.html`
  const { error: upErr } = await supabase.storage
    .from(BUCKET_DOCS)
    .upload(path, blob, { contentType: 'text/html', upsert: false })
  if (upErr) throw upErr

  const { data, error } = await supabase
    .from('documentos')
    .insert({
      veiculo_id:   veiculoId,
      categoria:    'contrato_venda',
      nome:         nomeArquivo,
      storage_path: path,
      tipo_mime:    'text/html',
      tamanho_kb:   Math.round(blob.size / 1024),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export function getDocumentoUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET_DOCS).getPublicUrl(storagePath)
  return data?.publicUrl || null
}

export async function deleteDocumento(id, storagePath) {
  const { error: e1 } = await supabase.storage.from(BUCKET_DOCS).remove([storagePath])
  if (e1) throw e1
  const { error: e2 } = await supabase.from('documentos').delete().eq('id', id)
  if (e2) throw e2
}
