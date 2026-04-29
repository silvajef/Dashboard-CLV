export const T = {
  bg:         '#08090d',
  surface:    '#0e1018',
  card:       '#12151e',
  cardHi:     '#171c28',
  border:     '#1c2030',
  borderHi:   '#2a3050',
  amber:      '#f59e0b',
  amberDim:   '#f59e0b22',
  green:      '#22d3a0',
  greenDim:   '#22d3a015',
  red:        '#f4485e',
  redDim:     '#f4485e15',
  blue:       '#4f8ef7',
  blueDim:    '#4f8ef715',
  purple:     '#a78bfa',
  purpleDim:  '#a78bfa15',
  cyan:       '#22d4dd',
  cyanDim:    '#22d4dd15',
  orange:     '#fb923c',
  text:       '#dde3f0',
  muted:      '#5a6480',
  subtle:     '#1e2535',
}

export const FONT = "'Syne', sans-serif"
export const MONO = "'JetBrains Mono', monospace"

export const STATUS_VEICULO_CFG = {
  pendente:   { label: 'Revisão Pendente', color: T.amber,  icon: '⏳' },
  manutencao: { label: 'Em Manutenção',    color: T.blue,   icon: '⚙️' },
  pronto:     { label: 'Pronto p/ Venda',  color: T.green,  icon: '✓'  },
  vendido:    { label: 'Vendido',           color: T.purple, icon: '🏷'  },
}

export const STATUS_SERVICO_CFG = {
  pendente:  { label: 'Pendente',     color: T.amber  },
  andamento: { label: 'Em Andamento', color: T.blue   },
  concluido: { label: 'Concluído',    color: T.green  },
  cancelado: { label: 'Cancelado',    color: T.muted  },
}

export const TIPOS_VEICULO = [
  'Van','Pick-up','Caminhão Leve','Caminhão Médio',
  'Caminhão Pesado','Micro-ônibus','Outro',
]

export const TIPOS_MANUTENCAO = [
  'Mecânica','Elétrica','Funilaria','Pintura','Pneus',
  'Suspensão','Freios','Revisão Geral','Limpeza/Detailing',
  'Ar-condicionado','Documentação','Outro',
]

export const fmtR    = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
export const fmtPct  = v => `${(v || 0).toFixed(1)}%`
export const fmtDias = v => `${Math.round(v || 0)}d`
export const fmtN    = v => (v || 0).toLocaleString('pt-BR')
export const today   = () => new Date().toISOString().split('T')[0]

export const diasNoEstoque = v => {
  const entrada = new Date(v.data_entrada)
  const saida   = v.data_venda ? new Date(v.data_venda) : new Date()
  return Math.max(0, Math.floor((saida - entrada) / 86_400_000))
}

export const custoVeiculo = v =>
  Number(v.custo_pecas || 0) + Number(v.custo_mao_obra || 0) + Number(v.outros_custos || 0)
