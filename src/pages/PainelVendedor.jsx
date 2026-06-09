// Painel pessoal do vendedor: KPIs de vendas, progresso de meta e ranking.
// Props: veiculos[], metas{}, perfil{nome}, role
import { useState, useMemo } from 'react'
import { useBreakpoint } from '../lib/responsive'
import { C, fmtR } from '../lib/constants'

// ── Utilitários ────────────────────────────────────────────────────────────────

const normDate = str => {
  if (!str) return null
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/')
    return `${y}-${m}-${d}`
  }
  return /^\d{4}-\d{2}-\d{2}/.test(str) ? str.slice(0, 10) : null
}

function filtrarPeriodo(vendidos, periodo) {
  if (periodo === 'total') return vendidos
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - parseInt(periodo))
  const cutoffISO = cutoff.toISOString().split('T')[0]
  return vendidos.filter(v => {
    const dvISO = normDate(v.data_venda)
    return dvISO && dvISO >= cutoffISO
  })
}

// Matching tolerante a maiúsculas/minúsculas e variações de nome
function nomeMatch(a, b) {
  if (!a || !b) return false
  const na = a.toLowerCase().trim()
  const nb = b.toLowerCase().trim()
  return na === nb || na.includes(nb) || nb.includes(na)
}

// ── Calculadores ───────────────────────────────────────────────────────────────

function calcVendasPessoais(vendidos, nome) {
  if (!nome) return []
  return vendidos.filter(v => nomeMatch(v.vendedor_nome, nome))
}

function calcKPIs(vendas) {
  const receita  = vendas.reduce((s, v) => s + (v.valor_venda || 0), 0)
  const comissao = vendas.reduce((s, v) => s + (v.valor_venda || 0) * ((v.comissao_pct || 0) / 100), 0)
  const ticket   = vendas.length > 0 ? receita / vendas.length : 0
  return { qtd: vendas.length, receita, comissao, ticket }
}

function calcRanking(vendidos) {
  const map = {}
  vendidos.forEach(v => {
    const nome = v.vendedor_nome?.trim() || '(sem vendedor)'
    if (!map[nome]) map[nome] = { nome, qtd: 0, receita: 0, comissao: 0 }
    map[nome].qtd++
    map[nome].receita  += v.valor_venda || 0
    map[nome].comissao += (v.valor_venda || 0) * ((v.comissao_pct || 0) / 100)
  })
  return Object.values(map).sort((a, b) => b.qtd - a.qtd || b.receita - a.receita)
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

// ── Sub-componentes ────────────────────────────────────────────────────────────

/** Card KPI numérico genérico. */
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

/** Card de meta com barra de progresso colorida. */
function CardMeta({ qtd, meta }) {
  const pct = meta > 0 ? Math.min(100, (qtd / meta) * 100) : 0
  const cor  = pct >= 100 ? C.green : pct >= 60 ? C.amber : C.red
  const resto = Math.max(0, meta - qtd)
  return (
    <div style={s.card}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
                     textTransform: 'uppercase', marginBottom: 8 }}>META DO MÊS</div>
      <div style={{ ...chakra, fontSize: 22, fontWeight: 700, color: cor, letterSpacing: '-0.5px' }}>
        {qtd}<span style={{ fontSize: 14, color: C.muted }}> / {meta}</span>
      </div>
      <div style={{ margin: '10px 0 6px', height: 6, background: C.surface, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 3, transition: 'width 0.4s' }}/>
      </div>
      <div style={{ fontSize: 11, color: C.muted }}>
        {pct >= 100 ? '✅ Meta atingida!' : `${pct.toFixed(0)}% — faltam ${resto} venda${resto !== 1 ? 's' : ''}`}
      </div>
    </div>
  )
}

/** Grid de 4 KPIs da visão pessoal do vendedor. */
function GridKPIs({ kpis, metaMes, periodo, cols }) {
  const subPeriodo = periodo === 'total' ? 'período total' : `últimos ${periodo}d`
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10, marginBottom: 24 }}>
      <CardKPI label="Suas Vendas"  value={kpis.qtd}            color={C.blue}
        sub={`${fmtR(kpis.receita)} faturado`}/>
      <CardMeta qtd={kpis.qtd} meta={metaMes}/>
      <CardKPI label="Sua Comissão" value={fmtR(kpis.comissao)} color={C.amber}
        sub={subPeriodo}/>
      <CardKPI label="Ticket Médio" value={fmtR(kpis.ticket)}   color={C.cyan}
        sub="por venda"/>
    </div>
  )
}

/** Linha de uma venda na lista pessoal. */
function LinhaVenda({ v }) {
  const comissao = (v.valor_venda || 0) * ((v.comissao_pct || 0) / 100)
  const nome     = [v.marca_nome, v.modelo_nome || v.modelo].filter(Boolean).join(' ') || '—'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                   padding: '10px 0', borderBottom: `1px solid ${C.border}`,
                   flexWrap: 'wrap', gap: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{nome}</div>
        <div style={{ fontSize: 11, color: C.muted, ...mono }}>
          {v.placa} · {v.comprador_nome || '—'} · {v.data_venda || '—'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ ...chakra, fontSize: 13, fontWeight: 700, color: C.green }}>{fmtR(v.valor_venda)}</div>
        {v.comissao_pct > 0 && (
          <div style={{ fontSize: 10, color: C.amber }}>{v.comissao_pct}% = {fmtR(comissao)}</div>
        )}
      </div>
    </div>
  )
}

/** Seção com lista de vendas pessoais ou estado vazio. */
function SecaoVendas({ vendas, nomeAtual }) {
  const msgVazia = nomeAtual
    ? `Nenhuma venda de "${nomeAtual}" neste período.`
    : 'Configure seu nome em Usuários para ver suas vendas.'
  return (
    <>
      <p style={s.secao}>Minhas Vendas — {vendas.length} no período</p>
      <div style={{ ...s.card, marginBottom: 24 }}>
        {vendas.length === 0
          ? <p style={{ color: C.faint, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>{msgVazia}</p>
          : vendas.map(v => <LinhaVenda key={v.id} v={v}/>)
        }
      </div>
    </>
  )
}

/** Linha do ranking com posição e destaque para o usuário atual. */
function LinhaRanking({ r, pos, isAtual }) {
  const corPos = [C.amber, C.muted, C.orange][pos] || C.faint
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                   borderBottom: `1px solid ${C.border}`,
                   background: isAtual ? `${C.blue}08` : 'transparent',
                   borderLeft: `3px solid ${isAtual ? C.blue : 'transparent'}` }}>
      <span style={{ ...chakra, fontSize: 16, fontWeight: 700, color: corPos, minWidth: 24, textAlign: 'right' }}>
        {pos + 1}
      </span>
      <div style={{ flex: 1, fontSize: 13, fontWeight: isAtual ? 700 : 400, color: isAtual ? C.text : C.muted }}>
        {r.nome} {isAtual && <span style={{ fontSize: 10, color: C.blue }}>← você</span>}
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ ...chakra, fontSize: 12, fontWeight: 700, color: C.green }}>
          {r.qtd} venda{r.qtd !== 1 ? 's' : ''}
        </span>
        <span style={{ ...chakra, fontSize: 12, color: C.text }}>{fmtR(r.receita)}</span>
        {r.comissao > 0 && (
          <span style={{ ...chakra, fontSize: 11, color: C.amber }}>{fmtR(r.comissao)}</span>
        )}
      </div>
    </div>
  )
}

/** Ranking de todos os vendedores no período. */
function SecaoRanking({ ranking, nomeAtual }) {
  if (ranking.filter(r => r.nome !== '(sem vendedor)').length === 0) return null
  return (
    <>
      <p style={s.secao}>Ranking do Período</p>
      <div style={{ ...s.card, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        {ranking.map((r, i) => (
          <LinhaRanking key={r.nome} r={r} pos={i} isAtual={nomeMatch(r.nome, nomeAtual)}/>
        ))}
      </div>
    </>
  )
}

/** Header com saudação e seletor de período. */
function HeaderVendedor({ nome, periodo, setPeriodo }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                   marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
      <div>
        <h2 style={{ margin: 0, ...chakra, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.5px' }}>
          PAINEL DO VENDEDOR
        </h2>
        {nome && (
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Olá, <span style={{ color: C.text, fontWeight: 700 }}>{nome}</span>! 👋
          </div>
        )}
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

// ── Componente principal ────────────────────────────────────────────────────────

/** Painel do vendedor com KPIs pessoais, lista de vendas e ranking. */
export default function PainelVendedor({ veiculos, metas, perfil }) {
  const [periodo, setPeriodo] = useState('30')
  const { isMobile }          = useBreakpoint()

  const nomeAtual      = perfil?.nome || ''
  const metaMes        = metas?.vendas_mes || 0
  const cols           = isMobile ? '1fr 1fr' : 'repeat(4, 1fr)'

  const vendidos        = useMemo(() => veiculos.filter(v => v.status === 'vendido'), [veiculos])
  const vendidosPer     = useMemo(() => filtrarPeriodo(vendidos, periodo), [vendidos, periodo])
  const vendasPessoais  = useMemo(() => calcVendasPessoais(vendidosPer, nomeAtual), [vendidosPer, nomeAtual])
  const kpis            = useMemo(() => calcKPIs(vendasPessoais), [vendasPessoais])
  const ranking         = useMemo(() => calcRanking(vendidosPer), [vendidosPer])

  return (
    <div style={s.page}>
      <HeaderVendedor nome={nomeAtual} periodo={periodo} setPeriodo={setPeriodo}/>
      <GridKPIs kpis={kpis} metaMes={metaMes} periodo={periodo} cols={cols}/>
      <SecaoVendas vendas={vendasPessoais} nomeAtual={nomeAtual}/>
      <SecaoRanking ranking={ranking} nomeAtual={nomeAtual}/>
    </div>
  )
}
