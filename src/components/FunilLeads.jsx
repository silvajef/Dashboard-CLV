/**
 * Painel analítico do funil de leads: distribuição por etapa, taxa de conversão
 * e ranking de plataformas de origem.
 *
 * FunilLeads({ leads: Lead[] })
 */
import { C } from '../lib/constants'
import { STATUS_LEAD_CFG } from '../lib/plataformas/types'
import { PLATAFORMAS } from '../lib/plataformas/index'
import { useBreakpoint } from '../lib/responsive'

const PIPELINE  = ['novo', 'contato', 'visita', 'proposta']
const TERMINAIS = ['ganho', 'perdido']
const ALL_STAGES = [...PIPELINE, ...TERMINAIS]

const PLAT_EMOJI = Object.fromEntries([...PLATAFORMAS.map(p => [p.slug, p.emoji]), ['manual', '📋']])
const PLAT_NOME  = Object.fromEntries([...PLATAFORMAS.map(p => [p.slug, p.nome]), ['manual', 'Manual']])

const s = {
  secao: { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
           textTransform: 'uppercase', margin: '0 0 10px' },
}

// ── Calculators (pure) ────────────────────────────────────────────────────

function calcFunil(leads) {
  const total = leads.length || 1
  return ALL_STAGES.map(status => {
    const count = leads.filter(l => l.status === status).length
    return { status, count, pct: Math.round(count / total * 100) }
  })
}

function calcPlataformas(leads) {
  const m = {}
  for (const l of leads) {
    const slug = l.plataforma_origem || l.provider || 'manual'
    if (!m[slug]) m[slug] = { total: 0, ganhos: 0, somaDias: 0 }
    m[slug].total++
    if (l.status === 'ganho') m[slug].ganhos++
    m[slug].somaDias += Math.round((Date.now() - new Date(l.created_at)) / 86400000)
  }
  return Object.entries(m)
    .map(([slug, d]) => ({
      slug, total: d.total, ganhos: d.ganhos,
      taxa: Math.round(d.ganhos / d.total * 100),
      idadeMedia: Math.round(d.somaDias / d.total),
    }))
    .sort((a, b) => b.total - a.total)
}

function taxaConversao(leads) {
  const fechados = leads.filter(l => TERMINAIS.includes(l.status))
  if (!fechados.length) return null
  return Math.round(fechados.filter(l => l.status === 'ganho').length / fechados.length * 100)
}

function tempoMedioFechamento(leads) {
  const fechados = leads.filter(l => TERMINAIS.includes(l.status))
  if (!fechados.length) return null
  const soma = fechados.reduce((s, l) => s + (Date.now() - new Date(l.created_at)), 0)
  return Math.round(soma / fechados.length / 86400000)
}

function contarSemana(leads) {
  const limite = Date.now() - 7 * 86400000
  return leads.filter(l => new Date(l.created_at) > limite).length
}

// ── Sub-components ────────────────────────────────────────────────────────

/** Cartão de KPI numérico para o resumo do funil. */
function CardKpi({ label, valor, cor = C.text }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: C.faint,
                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <span style={{ fontSize: 22, fontWeight: 800, color: cor }}>{valor}</span>
    </div>
  )
}

/** Linha horizontal do funil com barra proporcional ao stage mais populoso. */
function LinhaFunil({ cfg, count, pct, barPct }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ width: 90, fontSize: 11, color: C.muted, flexShrink: 0 }}>{cfg.label}</span>
      <div style={{ flex: 1, background: C.surface, borderRadius: 4, height: 18 }}>
        {count > 0 && (
          <div style={{ width: `${Math.max(barPct, 3)}%`, height: '100%',
                        background: cfg.color, borderRadius: 4, opacity: 0.85 }} />
        )}
      </div>
      <span style={{ width: 30, fontSize: 12, fontWeight: 700, color: C.text, textAlign: 'right', flexShrink: 0 }}>
        {count}
      </span>
      <span style={{ width: 36, fontSize: 11, color: C.muted, flexShrink: 0 }}>{pct}%</span>
    </div>
  )
}

/** Linha da tabela de plataformas com taxa colorida por performance. */
function LinhaPlataforma({ slug, total, ganhos, taxa, idadeMedia }) {
  const taxaCor = taxa >= 20 ? C.green : taxa >= 10 ? C.amber : C.red
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px 90px',
                  padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.text }}>{PLAT_EMOJI[slug]} {PLAT_NOME[slug] || slug}</span>
      <span style={{ fontSize: 13, color: C.text }}>{total}</span>
      <span style={{ fontSize: 13, color: C.green }}>{ganhos}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: taxaCor }}>{taxa}%</span>
      <span style={{ fontSize: 13, color: C.muted }}>{idadeMedia}d</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function FunilLeads({ leads }) {
  const { isMobile } = useBreakpoint()

  const funil    = calcFunil(leads)
  const plats    = calcPlataformas(leads)
  const taxa     = taxaConversao(leads)
  const tempMed  = tempoMedioFechamento(leads)
  const semana   = contarSemana(leads)
  const maxCount = Math.max(...PIPELINE.map(s => funil.find(f => f.status === s)?.count || 0), 1)

  const pipelineFunil = funil.filter(f => PIPELINE.includes(f.status))
  const terminalFunil = funil.filter(f => TERMINAIS.includes(f.status))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                    gap: 10, marginBottom: 24 }}>
        <CardKpi label="Total de Leads"      valor={leads.length} />
        <CardKpi label="Taxa de Conversão"   valor={taxa !== null ? `${taxa}%` : '—'} cor={C.green} />
        <CardKpi label="Tempo Médio (dias)"  valor={tempMed !== null ? `${tempMed}d` : '—'} />
        <CardKpi label="Leads esta Semana"   valor={semana} cor={C.blue} />
      </div>

      <p style={s.secao}>Funil de Conversão</p>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: '16px 20px', marginBottom: 28 }}>
        {pipelineFunil.map(({ status, count, pct }) => (
          <LinhaFunil key={status} cfg={STATUS_LEAD_CFG[status]} count={count} pct={pct}
                      barPct={count / maxCount * 100} />
        ))}
        <div style={{ borderTop: `1px solid ${C.border}`, margin: '10px 0' }} />
        {terminalFunil.map(({ status, count, pct }) => (
          <LinhaFunil key={status} cfg={STATUS_LEAD_CFG[status]} count={count} pct={pct}
                      barPct={count / maxCount * 100} />
        ))}
      </div>

      <p style={s.secao}>Por Plataforma de Origem</p>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                    overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px 90px', minWidth: 420,
                      padding: '8px 16px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          {['Plataforma', 'Leads', 'Ganhos', 'Conversão', 'Idade Média'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.faint,
                                   textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>
        <div style={{ minWidth: 420 }}>
          {plats.length === 0
            ? <p style={{ padding: '16px', fontSize: 12, color: C.faint, margin: 0 }}>Nenhum lead registrado.</p>
            : plats.map(p => <LinhaPlataforma key={p.slug} {...p} />)
          }
        </div>
      </div>
    </div>
  )
}
