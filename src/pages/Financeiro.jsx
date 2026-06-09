// Módulo Financeiro — DRE + Fluxo de Caixa mensal + Projeção.
// Props: veiculos[], metas{}. Tudo calculado do FleetContext, sem queries novas.
import { useState, useMemo } from 'react'
import { useBreakpoint } from '../lib/responsive'
import LineTracker from '../components/charts/LineTracker'
import { C, fmtR, fmtPct, custoV, custoFixos } from '../lib/constants'

// ── Utilitários de data ────────────────────────────────────────────────────────

const normDate = str => {
  if (!str) return null
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/')
    return `${y}-${m}-${d}`
  }
  return /^\d{4}-\d{2}-\d{2}/.test(str) ? str.slice(0, 10) : null
}

const mesChave = str => { const iso = normDate(str); return iso ? iso.slice(0, 7) : null }

function ultimosMeses(n) {
  const hoje = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (n - 1 - i), 1)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return { chave: `${d.getFullYear()}-${m}`, label: `${m}/${d.getFullYear()}` }
  })
}

// ── Calculadores ───────────────────────────────────────────────────────────────

function filtrarPeriodo(veiculos, periodo) {
  if (periodo === 'total') return veiculos
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - parseInt(periodo))
  const cutoffISO = cutoff.toISOString().split('T')[0]
  return veiculos.filter(v => {
    if (v.status !== 'vendido') return true
    const dvISO = normDate(v.data_venda)
    return dvISO && dvISO >= cutoffISO
  })
}

function calcDRE(vendidos) {
  const receita    = vendidos.reduce((s, v) => s + (v.valor_venda  || 0), 0)
  const aquisicao  = vendidos.reduce((s, v) => s + (v.valor_compra || 0), 0)
  const manutencao = vendidos.reduce((s, v) => s + custoV(v), 0)
  const fixos      = vendidos.reduce((s, v) => s + custoFixos(v), 0)
  const custo      = aquisicao + manutencao + fixos
  const lucro      = receita - custo
  const margem     = receita > 0 ? (lucro / receita) * 100 : 0
  return { receita, aquisicao, manutencao, fixos, custo, lucro, margem }
}

function calcFluxo(veiculos, nMeses = 6) {
  const meses    = ultimosMeses(nMeses)
  const servicos = veiculos.flatMap(v => v.servicos || [])
  return meses.map(({ chave, label }) => {
    const entradas = veiculos
      .filter(v => v.status === 'vendido' && mesChave(v.data_venda) === chave)
      .reduce((s, v) => s + (v.valor_venda || 0), 0)
    const compras = veiculos
      .filter(v => mesChave(v.data_entrada) === chave)
      .reduce((s, v) => s + (v.valor_compra || 0), 0)
    const mnt = servicos
      .filter(s => mesChave(s.data) === chave && s.status !== 'cancelado')
      .reduce((s, sc) => s + (sc.custo_pecas || 0) + (sc.custo_mao || 0) + (sc.outros || 0), 0)
    return { chave, label, entradas, compras, manutencao: mnt, saidas: compras + mnt, saldo: entradas - compras - mnt }
  })
}

function calcProjecao(fluxo) {
  const base = fluxo.slice(-3).filter(m => m.entradas > 0 || m.saidas > 0)
  if (base.length === 0) return null
  const avg = fn => Math.round(base.reduce((s, m) => s + fn(m), 0) / base.length)
  return { entradas: avg(m => m.entradas), saidas: avg(m => m.saidas), saldo: avg(m => m.saldo) }
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const chakra = { fontFamily: "'Chakra Petch', monospace" }
const mono   = { fontFamily: "'JetBrains Mono', monospace" }

const s = {
  page:  { padding: '24px 20px', maxWidth: 1100, margin: '0 auto' },
  secao: { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 10 },
  card:  { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' },
}

const chartTheme = { line: C.border, faint: C.faint, muted: C.muted, text: C.text, surface: C.card }
const fmtK = v => v < 0 ? `-R$${Math.abs(v).toFixed(0)}k` : `R$${v.toFixed(0)}k`

// ── Sub-componentes ────────────────────────────────────────────────────────────

/** Card KPI numérico para o módulo financeiro. */
function CardKPI({ label, value, color, sub }) {
  return (
    <div style={s.card}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
                     textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ ...chakra, fontSize: 22, fontWeight: 700, color: color || C.text,
                     letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

/** Linha de item do DRE: label à esquerda, valor à direita. */
function LinhaDRE({ label, value, color, indent, bold, topBorder }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                   paddingTop: topBorder ? 10 : 5, paddingBottom: topBorder ? 10 : 5,
                   paddingLeft: indent ? 16 : 0,
                   borderTop: topBorder ? `1px solid ${C.border}` : 'none' }}>
      <span style={{ fontSize: 12, color: bold ? C.text : C.muted, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ ...chakra, fontSize: 13, fontWeight: bold ? 700 : 400, color: color || C.text }}>{value}</span>
    </div>
  )
}

/** Linha da tabela de fluxo mensal. */
function LinhaFluxo({ m }) {
  return (
    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
      <td style={{ padding: '8px 10px', color: C.muted, ...mono, fontSize: 11 }}>{m.label}</td>
      <td style={{ padding: '8px 10px', textAlign: 'right', color: C.green,  ...chakra, fontSize: 12 }}>{fmtR(m.entradas)}</td>
      <td style={{ padding: '8px 10px', textAlign: 'right', color: C.red,    ...chakra, fontSize: 12 }}>{fmtR(m.compras)}</td>
      <td style={{ padding: '8px 10px', textAlign: 'right', color: C.amber,  ...chakra, fontSize: 12 }}>{fmtR(m.manutencao)}</td>
      <td style={{ padding: '8px 10px', textAlign: 'right', color: C.red,    ...chakra, fontSize: 12 }}>{fmtR(m.saidas)}</td>
      <td style={{ padding: '8px 10px', textAlign: 'right', ...chakra, fontSize: 12, fontWeight: 700,
                    color: m.saldo >= 0 ? C.green : C.red }}>{fmtR(m.saldo)}</td>
    </tr>
  )
}

/** Tabela de fluxo de caixa mensal. */
function TabelaFluxo({ fluxo }) {
  const hdrs = ['Mês', 'Entradas', 'Compras', 'Manutenção', 'Saídas', 'Saldo']
  return (
    <div style={{ overflowX: 'auto', marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 480 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {hdrs.map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Mês' ? 'left' : 'right',
                                    fontSize: 10, fontWeight: 700, color: C.muted,
                                    letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{fluxo.map(m => <LinhaFluxo key={m.chave} m={m}/>)}</tbody>
      </table>
    </div>
  )
}

/** Header da página com título e seletor de período. */
function HeaderFinanceiro({ periodo, setPeriodo }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                   marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ margin: 0, ...chakra, fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.5px' }}>FINANCEIRO</h2>
        <span style={{ ...mono, fontSize: 10, color: C.faint, background: C.surface,
                        border: `1px solid ${C.border}`, padding: '3px 10px', borderRadius: 4,
                        letterSpacing: '0.1em' }}>
          {periodo === 'total' ? 'TODO O PERÍODO' : `ÚLTIMOS ${periodo}D`}
        </span>
      </div>
      <div style={{ display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
        {[['30','30D'],['60','60D'],['90','90D'],['total','TUDO']].map(([v, l]) => (
          <button key={v} onClick={() => setPeriodo(v)}
            style={{ background: periodo===v ? C.amber : 'transparent', color: periodo===v ? '#000' : C.faint,
                      border: 'none', padding: '6px 14px', fontSize: 10, fontWeight: 700,
                      cursor: 'pointer', ...mono, letterSpacing: '0.08em', transition: 'all 0.15s' }}>{l}</button>
        ))}
      </div>
    </div>
  )
}

/** Seção de fluxo de caixa: gráfico de linha + tabela mensal. */
function SecaoFluxo({ fluxo, series, labels }) {
  return (
    <>
      <p style={s.secao}>Fluxo de Caixa — últimos 6 meses</p>
      <div style={{ ...s.card, marginBottom: 8 }}>
        <LineTracker series={series} labels={labels} height={200} formatY={fmtK} theme={chartTheme}/>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          {series.map(sr => (
            <div key={sr.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 2, background: sr.color, borderRadius: 1 }}/>
              <span style={{ fontSize: 10, color: C.muted, ...mono }}>{sr.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...s.card, marginBottom: 24 }}><TabelaFluxo fluxo={fluxo}/></div>
    </>
  )
}

/** DRE Simplificado vertical com comparação à meta de margem. */
function SecaoDRE({ dre, metas, periodo }) {
  const corMargem = dre.margem >= (metas?.margem_min || 0) ? C.green : C.amber
  return (
    <>
      <p style={s.secao}>DRE Simplificado — {periodo === 'total' ? 'período total' : `últimos ${periodo} dias`}</p>
      <div style={{ ...s.card, maxWidth: 480, marginBottom: 24 }}>
        <LinhaDRE label="RECEITA BRUTA"          value={fmtR(dre.receita)}    color={C.text}  bold/>
        <LinhaDRE label="(-) Custo de Aquisição" value={fmtR(dre.aquisicao)}  color={C.red}   indent/>
        <LinhaDRE label="(-) Manutenção"         value={fmtR(dre.manutencao)} color={C.amber} indent/>
        <LinhaDRE label="(-) Custos Fixos"       value={fmtR(dre.fixos)}      color={C.amber} indent/>
        <LinhaDRE label="= MARGEM BRUTA"         value={fmtR(dre.lucro)}
                  color={dre.lucro >= 0 ? C.green : C.red} bold topBorder/>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: C.muted }}>Margem %</span>
          <span style={{ ...chakra, fontSize: 13, fontWeight: 700, color: corMargem }}>{fmtPct(dre.margem)}</span>
        </div>
        {metas?.margem_min > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: C.faint }}>Meta mínima</span>
            <span style={{ ...chakra, fontSize: 11, color: C.faint }}>{fmtPct(metas.margem_min)}</span>
          </div>
        )}
      </div>
    </>
  )
}

/** Cards de projeção baseados na média dos últimos 3 meses com dados. */
function SecaoProjecao({ proj, isMobile }) {
  if (!proj) return null
  return (
    <>
      <p style={s.secao}>Projeção — próximo mês (média 3 meses)</p>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <CardKPI label="Entradas Prev." value={fmtR(proj.entradas)} color={C.green}/>
        <CardKPI label="Saídas Prev."   value={fmtR(proj.saidas)}   color={C.red}/>
        <CardKPI label="Saldo Prev."    value={fmtR(proj.saldo)}    color={proj.saldo >= 0 ? C.cyan : C.red}/>
      </div>
    </>
  )
}

// ── Componente principal ────────────────────────────────────────────────────────

/** Módulo Financeiro — DRE + Fluxo de Caixa mensal + Projeção. */
export default function Financeiro({ veiculos, metas }) {
  const [periodo, setPeriodo] = useState('30')
  const { isMobile }          = useBreakpoint()

  const vPeriodo = useMemo(() => filtrarPeriodo(veiculos, periodo), [veiculos, periodo])
  const vendidos = useMemo(() => vPeriodo.filter(v => v.status === 'vendido'), [vPeriodo])
  const dre      = useMemo(() => calcDRE(vendidos), [vendidos])
  const fluxo    = useMemo(() => calcFluxo(veiculos, 6), [veiculos])
  const proj     = useMemo(() => calcProjecao(fluxo), [fluxo])

  const cols   = isMobile ? '1fr 1fr' : 'repeat(4, 1fr)'
  const labels = fluxo.map(m => m.label)
  const series = [
    { name: 'Entradas', color: C.green, data: fluxo.map(m => m.entradas / 1000) },
    { name: 'Saídas',   color: C.red,   data: fluxo.map(m => m.saidas   / 1000) },
    { name: 'Saldo',    color: C.cyan,  data: fluxo.map(m => m.saldo    / 1000) },
  ]

  return (
    <div style={s.page}>
      <HeaderFinanceiro periodo={periodo} setPeriodo={setPeriodo}/>

      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10, marginBottom: 24 }}>
        <CardKPI label="Receita Bruta" value={fmtR(dre.receita)} color={C.green}
          sub={`${vendidos.length} venda${vendidos.length !== 1 ? 's' : ''}`}/>
        <CardKPI label="Custo Total"   value={fmtR(dre.custo)}   color={C.red}
          sub="aquisição + manutenção + fixos"/>
        <CardKPI label="Lucro Bruto"   value={fmtR(dre.lucro)}   color={dre.lucro >= 0 ? C.cyan : C.red}
          sub={fmtPct(dre.margem) + ' de margem'}/>
        <CardKPI label="Projeção 30d"  value={proj ? fmtR(proj.saldo) : '—'}
          color={proj && proj.saldo >= 0 ? C.green : C.red} sub="saldo médio dos últimos 3 meses"/>
      </div>

      <SecaoFluxo fluxo={fluxo} series={series} labels={labels}/>
      <SecaoDRE dre={dre} metas={metas} periodo={periodo}/>
      <SecaoProjecao proj={proj} isMobile={isMobile}/>
    </div>
  )
}
