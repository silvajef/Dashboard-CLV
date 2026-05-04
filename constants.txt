export const APP_NAME = 'Dashboard CLV'
export const APP_VERSION = '3.1'

export const TIPOS_VEICULO = [
  'Van', 'Pick-up', 'Caminhão Leve', 'Caminhão Médio',
  'Caminhão Pesado', 'Micro-ônibus', 'Outro'
]
export const TIPOS_MANUT = [
  'Mecânica', 'Elétrica', 'Funilaria', 'Pintura', 'Pneus',
  'Suspensão', 'Freios', 'Revisão Geral', 'Limpeza/Detailing',
  'Ar-condicionado', 'Documentação', 'Outro'
]
export const COMBUSTIVEIS = ['Diesel','Flex','Gasolina','Etanol','GNV','Elétrico','Híbrido']

export const STATUS_VEICULO_CFG = {
  pendente:   { label: 'Revisão Pendente', color: '#f59e0b', icon: '⏳' },
  manutencao: { label: 'Em Manutenção',    color: '#4f8ef7', icon: '⚙️' },
  pronto:     { label: 'Pronto p/ Venda',  color: '#22d3a0', icon: '✓'  },
  vendido:    { label: 'Vendido',           color: '#a78bfa', icon: '🏷' },
}
export const STATUS_SERV_CFG = {
  pendente:  { label: 'Pendente',     color: '#f59e0b' },
  andamento: { label: 'Em Andamento', color: '#4f8ef7' },
  concluido: { label: 'Concluído',    color: '#22d3a0' },
  cancelado: { label: 'Cancelado',    color: '#5a6480' },
}

export const C = {
  bg: '#08090d', surface: '#0e1018', card: '#12151e', cardHi: '#171c28',
  border: '#1c2030', borderHi: '#2a3050',
  amber: '#f59e0b', amberDim: '#f59e0b22',
  green: '#22d3a0', greenDim: '#22d3a015',
  red: '#f4485e',   redDim: '#f4485e15',
  blue: '#4f8ef7',  blueDim: '#4f8ef715',
  purple: '#a78bfa',purpleDim: '#a78bfa15',
  cyan: '#22d4dd',  orange: '#fb923c',
  text:   '#e8edf8',   // era #dde3f0 — títulos e valores principais
  muted:  '#8b95b0',   // era #5a6480 — contraste ~5.8:1 (WCAG AA ✅)
  faint:  '#636b85',   // novo — textos terciários: versão, timestamps (4.5:1 ✅)
  subtle: '#2e3650',   // era #242a3e — bordas e separadores
}

export const today    = () => new Date().toISOString().split('T')[0]
export const fmtR     = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
export const fmtPct   = v => `${(v||0).toFixed(1)}%`
export const fmtDias  = v => `${Math.round(v||0)}d`
export const fmtN     = v => (v||0).toLocaleString('pt-BR')
export const custoV   = v => (v.servicos||[]).reduce((s,m)=>s+(m.custo_pecas||0)+(m.custo_mao||0)+(m.outros||0),0)
export const diasNoEstoque = v => {
  const entrada = new Date(v.data_entrada)
  const saida   = v.data_venda ? new Date(v.data_venda) : new Date()
  return Math.max(0, Math.floor((saida - entrada) / 86400000))
}

// Parse "R$ 85.000,00" → 85000
export function parseFipeValor(str = '') {
  if (!str) return 0
  return parseFloat(str.replace(/[R$\s.]/g, '').replace(',', '.')) || 0
}
