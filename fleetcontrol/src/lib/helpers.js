export const fmtR    = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
export const fmtPct  = v => `${(v||0).toFixed(1)}%`
export const fmtDias = v => `${Math.round(v||0)}d`
export const fmtN    = v => (v||0).toLocaleString('pt-BR')
export const today   = () => new Date().toISOString().split('T')[0]

export const custoVeiculo = servicos =>
  (servicos||[]).reduce((s,m) => s+(m.custo_pecas||0)+(m.custo_mao||0)+(m.outros||0), 0)

export const diasNoEstoque = v => {
  const entrada = new Date(v.data_entrada)
  const saida   = v.data_venda ? new Date(v.data_venda) : new Date()
  return Math.max(0, Math.floor((saida - entrada) / 86400000))
}

export const mesAno = iso => {
  const d = new Date(iso)
  return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
