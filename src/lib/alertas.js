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

function diasEntre(dataInicio, dataFim) {
  return Math.floor((dataFim - dataInicio) / 86_400_000)
}

function ordenarPorSeveridade(a, b) {
  const peso = { [SEVERIDADE.CRITICA]: 3, [SEVERIDADE.ALTA]: 2, [SEVERIDADE.MEDIA]: 1 }
  const diff = (peso[b.severidade] || 0) - (peso[a.severidade] || 0)
  if (diff !== 0) return diff
  return (b.diasSemServico ?? 0) - (a.diasSemServico ?? 0)
}
