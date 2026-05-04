export const APP_NAME    = 'Dashboard CLV'
export const APP_VERSION = '3.8'

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
  text:   '#e8edf8',
  muted:  '#8b95b0',
  faint:  '#636b85',
  subtle: '#2e3650',
}

// ─── Formatação ───────────────────────────────────────────────────────────────
export const today   = () => new Date().toISOString().split('T')[0]
export const fmtR    = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
export const fmtPct  = v => `${(v||0).toFixed(1)}%`
export const fmtDias = v => `${Math.round(v||0)}d`
export const fmtN    = v => (v||0).toLocaleString('pt-BR')

/**
 * fmtData — formata qualquer data para DD/MM/AAAA
 * Aceita: string ISO (YYYY-MM-DD), Date, ou string DD/MM/AAAA (retorna igual)
 */
export function fmtData(val) {
  if (!val) return ''
  // Já está no formato DD/MM/AAAA
  if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val
  try {
    // String ISO YYYY-MM-DD
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const [y, m, d] = val.split('T')[0].split('-')
      return `${d}/${m}/${y}`
    }
    // Objeto Date
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return val
  }
}

/**
 * isoParaDisplay — YYYY-MM-DD → DD/MM/AAAA
 * isoParaDisplay('2026-01-15') → '15/01/2026'
 */
export function isoParaDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

/**
 * displayParaIso — DD/MM/AAAA → YYYY-MM-DD (para salvar no banco)
 * displayParaIso('15/01/2026') → '2026-01-15'
 */
export function displayParaIso(display) {
  if (!display) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(display)) return display // já é ISO
  const parts = display.split('/')
  if (parts.length !== 3) return display
  const [d, m, y] = parts
  if (!d || !m || !y || y.length !== 4) return display
  return `${y}-${m}-${d}`
}

// ─── Cálculos de custo ────────────────────────────────────────────────────────

/** custoV — soma custo de manutenção (serviços) */
export const custoV = v =>
  (v.servicos || []).reduce((s, m) => s + (m.custo_pecas||0) + (m.custo_mao||0) + (m.outros||0), 0)

/** custoFixos — soma custos fixos (IPVA, licenciamento, transferência, multas, outros) */
export const custoFixos = v => {
  const cf = v.custos_fixos
  if (!cf) return 0
  return (cf.ipva||0) + (cf.licenciamento||0) + (cf.transferencia||0) +
         (cf.multas||0) + (cf.outros_valor||0)
}

/** custoTotal — custo de compra + manutenção + custos fixos */
export const custoTotal = v =>
  (v.valor_compra || 0) + custoV(v) + custoFixos(v)

/** custoOperacional — manutenção + custos fixos (sem o valor de compra) */
export const custoOperacional = v => custoV(v) + custoFixos(v)

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
