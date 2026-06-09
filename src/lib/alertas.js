import { calcularGarantias, STATUS_GARANTIA, formatarStatusGarantia } from './garantia.js'

export const ALERTAS_CONFIG = {
  DIAS_SEM_SERVICO_PADRAO: 30,
}

export const TIPO_ALERTA = {
  SERVICO_PENDENTE: 'servico_pendente',
  SEM_MANUTENCAO:   'sem_manutencao',
}

export const SEVERIDADE = {
  CRITICA: 'critica',
  ALTA:    'alta',
  MEDIA:   'media',
}

export function calcularVeiculosCriticos({ veiculos = [], servicos = [], metas = {}, hoje = new Date() }) {
  const limiar = metas?.dias_max_estoque || ALERTAS_CONFIG.DIAS_SEM_SERVICO_PADRAO
  return veiculos
    .filter(v => v.status !== 'vendido')
    .map(v => enriquecerVeiculo(v, servicos, limiar, hoje))
    .filter(v => v.tipoAlerta !== null)
    .sort(ordenarPorSeveridade)
}

export function enriquecerVeiculo(veiculo, servicos, limiar, hoje = new Date()) {
  const diasEstoque = veiculo.data_entrada
    ? diasEntre(new Date(veiculo.data_entrada), hoje)
    : null

  const servicosDoVeiculo = servicos
    .filter(s => s.veiculo_id === veiculo.id)
    .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))

  const ultimoServico = servicosDoVeiculo[0] || null
  const temPendente   = servicosDoVeiculo.some(s => s.status === 'pendente')

  const diasSemServico = ultimoServico?.data
    ? diasEntre(new Date(ultimoServico.data), hoje)
    : (diasEstoque ?? 999)

  let tipoAlerta = null
  let severidade = null

  if (temPendente) {
    tipoAlerta = TIPO_ALERTA.SERVICO_PENDENTE
    severidade = SEVERIDADE.CRITICA
  } else if (diasSemServico >= limiar) {
    tipoAlerta = TIPO_ALERTA.SEM_MANUTENCAO
    severidade = diasSemServico >= limiar * 2 ? SEVERIDADE.ALTA : SEVERIDADE.MEDIA
  }

  return { ...veiculo, diasEstoque, diasSemServico, tipoAlerta, severidade, ultimoServico }
}

export function resumoAlertas(criticos) {
  return {
    total: criticos.length,
    porTipo: {
      [TIPO_ALERTA.SERVICO_PENDENTE]: criticos.filter(v => v.tipoAlerta === TIPO_ALERTA.SERVICO_PENDENTE).length,
      [TIPO_ALERTA.SEM_MANUTENCAO]:   criticos.filter(v => v.tipoAlerta === TIPO_ALERTA.SEM_MANUTENCAO).length,
    },
    porSeveridade: {
      [SEVERIDADE.CRITICA]: criticos.filter(v => v.severidade === SEVERIDADE.CRITICA).length,
      [SEVERIDADE.ALTA]:    criticos.filter(v => v.severidade === SEVERIDADE.ALTA).length,
      [SEVERIDADE.MEDIA]:   criticos.filter(v => v.severidade === SEVERIDADE.MEDIA).length,
    },
  }
}

// ── Novos geradores de alerta ─────────────────────────────────────────────

/**
 * Gera alertas de garantia para vendas vencendo ou já vencidas.
 * Enriquece com dados do veículo para descrições legíveis.
 */
function calcularAlertasGarantia(vendasRelacao, veiculos) {
  return calcularGarantias(vendasRelacao)
    .filter(g => g.status !== STATUS_GARANTIA.ATIVA)
    .map(g => {
      const v = veiculos.find(x => x.id === g.veiculo_id)
      const veiculoDesc = v
        ? `${v.placa} · ${v.marca_nome || ''} ${v.modelo_nome || v.modelo || ''}`.trim()
        : `Venda #${String(g.id).slice(0, 6)}`
      return {
        id: `garantia_${g.id}`,
        tipo: g.status === STATUS_GARANTIA.VENCENDO ? 'garantia_vencendo' : 'garantia_vencida',
        severidade: g.status === STATUS_GARANTIA.VENCENDO ? SEVERIDADE.ALTA : SEVERIDADE.MEDIA,
        titulo: g.status === STATUS_GARANTIA.VENCENDO
          ? `Garantia vencendo em ${g.diasRestantes}d`
          : 'Garantia vencida',
        descricao: `${veiculoDesc} · ${formatarStatusGarantia(g)}`,
        refTipo: 'veiculo',
        refId: v?.id ?? null,
      }
    })
}

/**
 * Gera alertas para veículos cujo custo de manutenção ultrapassou a meta.
 * Requer servicos como array flat com veiculo_id (extraído de v.servicos na chamada).
 */
function calcularAlertasCusto(veiculos, servicos, metas) {
  if (!metas?.custo_max_pct || metas.custo_max_pct <= 0) return []
  const limite = metas.custo_max_pct / 100
  return veiculos
    .filter(v => v.status !== 'vendido' && (v.valor_compra || 0) > 0)
    .flatMap(v => {
      const gasto = servicos
        .filter(s => s.veiculo_id === v.id && s.status !== 'cancelado')
        .reduce((sum, s) => sum + (s.custo_pecas || 0) + (s.custo_mao || 0) + (s.outros || 0), 0)
      const pct = gasto / v.valor_compra
      if (pct <= limite) return []
      return [{
        id: `custo_alto_${v.id}`,
        tipo: 'custo_alto',
        severidade: pct > limite * 1.5 ? SEVERIDADE.ALTA : SEVERIDADE.MEDIA,
        titulo: `Custo alto — ${v.placa}`,
        descricao: `${v.marca_nome || ''} ${v.modelo_nome || v.modelo || ''} · ${Math.round(pct * 100)}% do valor de compra`,
        refTipo: 'veiculo',
        refId: v.id,
      }]
    })
}

/**
 * Agrega todos os geradores em uma lista unificada, ordenada por severidade.
 * servicos deve ser um array flat: veiculos.flatMap(v => v.servicos || [])
 *
 * gerarTodosAlertas({ veiculos, servicos, vendasRelacao, metas }) → Alerta[]
 */
export function gerarTodosAlertas({ veiculos = [], servicos = [], vendasRelacao = [], metas = {}, hoje = new Date() }) {
  const porSeveridade = { [SEVERIDADE.CRITICA]: 3, [SEVERIDADE.ALTA]: 2, [SEVERIDADE.MEDIA]: 1 }
  const alertasVeiculos = calcularVeiculosCriticos({ veiculos, servicos, metas, hoje })
    .map(v => ({
      id: `${v.tipoAlerta}_${v.id}`,
      tipo: v.tipoAlerta,
      severidade: v.severidade,
      titulo: v.tipoAlerta === TIPO_ALERTA.SERVICO_PENDENTE
        ? `Serviço pendente — ${v.placa}`
        : `${v.placa} parado há ${v.diasEstoque}d`,
      descricao: `${v.marca_nome || ''} ${v.modelo_nome || v.modelo || ''}`.trim(),
      refTipo: 'veiculo',
      refId: v.id,
    }))
  return [
    ...alertasVeiculos,
    ...calcularAlertasGarantia(vendasRelacao, veiculos),
    ...calcularAlertasCusto(veiculos, servicos, metas),
  ].sort((a, b) => (porSeveridade[b.severidade] || 0) - (porSeveridade[a.severidade] || 0))
}

function diasEntre(dataInicio, dataFim) {
  return Math.floor((dataFim - dataInicio) / 86_400_000)
}

function ordenarPorSeveridade(a, b) {
  const peso = { [SEVERIDADE.CRITICA]: 3, [SEVERIDADE.ALTA]: 2, [SEVERIDADE.MEDIA]: 1 }
  const diff = (peso[b.severidade] || 0) - (peso[a.severidade] || 0)
  if (diff !== 0) return diff
  return (b.diasSemServico ?? 0) - (a.diasSemServico ?? 0)
}
