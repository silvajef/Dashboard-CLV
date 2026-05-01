import { useState, useMemo } from 'react'
import { calcularVeiculosCriticos, resumoAlertas, TIPO_ALERTA, SEVERIDADE } from '../lib/alertas'

const C = {
  bg:      '#0f1117',
  surface: '#1a1d27',
  border:  '#2a2d3a',
  text:    '#e2e8f0',
  muted:   '#64748b',
  warn:    '#f59e0b',
  danger:  '#ef4444',
}

const COR_SEV = {
  [SEVERIDADE.CRITICA]: '#ef4444',
  [SEVERIDADE.ALTA]:    '#f59e0b',
  [SEVERIDADE.MEDIA]:   '#f59e0b',
}

const ICONE_TIPO = {
  [TIPO_ALERTA.SERVICO_PENDENTE]: '🔴',
  [TIPO_ALERTA.SEM_MANUTENCAO]:   '⏱',
}

export default function AlertaBanner({ veiculos = [], servicos = [], metas = {}, onVerVeiculo }) {
  const [expandido, setExpandido] = useState(false)
  const [fechado,   setFechado]   = useState(false)

  const criticos = useMemo(
    () => calcularVeiculosCriticos({ veiculos, servicos, metas }),
    [veiculos, servicos, metas]
  )

  const resumo = useMemo(() => resumoAlertas(criticos), [criticos])

  if (criticos.length === 0 || fechado) return null

  const corBanner   = COR_SEV[criticos[0]?.severidade] || C.warn
  const iconeBanner = resumo.total >= 3 ? '🚨' : '⚠️'
  const limiar      = metas?.dias_max_estoque || 30

  const partesDetalhe = []
  if (resumo.porTipo[TIPO_ALERTA.SERVICO_PENDENTE] > 0)
    partesDetalhe.push(`${resumo.porTipo[TIPO_ALERTA.SERVICO_PENDENTE]} com serviço pendente`)
  if (resumo.porTipo[TIPO_ALERTA.SEM_MANUTENCAO] > 0)
    partesDetalhe.push(`${resumo.porTipo[TIPO_ALERTA.SEM_MANUTENCAO]} sem manutenção há +${limiar} dias`)

  return (
    <div style={{ ...s.banner, borderLeftColor: corBanner }}>
      <div style={s.cab}>
        <div style={s.cabEsq}>
          <span style={{ fontSize: 17, lineHeight: 1 }}>{iconeBanner}</span>
          <div>
            <span style={{ ...s.tituloBanner, color: corBanner }}>
              {resumo.total} veículo{resumo.total > 1 ? 's' : ''} com atenção necessária
            </span>
            {partesDetalhe.length > 0 && (
              <span style={s.detalhe}>{partesDetalhe.join(' · ')}</span>
            )}
          </div>
        </div>
        <div style={s.acoes}>
          <button onClick={() => setExpandido(e => !e)} style={{ ...s.btnLink, color: corBanner }}>
            {expandido ? 'Ocultar ▲' : 'Ver detalhes ▼'}
          </button>
          <button onClick={() => setFechado(true)} style={s.btnX} title="Fechar">✕</button>
        </div>
      </div>

      {expandido && (
        <div style={s.lista}>
          {criticos.map(v => {
            const cor   = COR_SEV[v.severidade] || C.warn
            const icone = ICONE_TIPO[v.tipoAlerta] || '⚠️'
            const label = v.tipoAlerta === TIPO_ALERTA.SERVICO_PENDENTE
              ? 'Serviço pendente'
              : `${v.diasSemServico}d sem serviço`

            return (
              <div key={v.id} style={s.item}>
                <div style={s.itemInfos}>
                  <span style={{ ...s.badgeTipo, background: `${cor}18`, color: cor }}>
                    {icone} {label}
                  </span>
                  <span style={s.itemNome}>{v.marca_nome} {v.modelo_nome}</span>
                  <span style={s.itemPlaca}>{v.placa}</span>
                  {v.diasEstoque !== null && (
                    <span style={s.itemSub}>{v.diasEstoque}d em estoque</span>
                  )}
                </div>
                {onVerVeiculo && (
                  <button onClick={() => onVerVeiculo(v)} style={s.btnVer}>Ver →</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  banner: {
    background: '#1b190f', border: `1px solid ${C.warn}28`,
    borderLeft: `3px solid ${C.warn}`, borderRadius: 10,
    padding: '11px 16px', margin: '16px 16px 0',
    fontFamily: "'Syne', sans-serif",
  },
  cab: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  cabEsq: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 },
  tituloBanner: { fontWeight: 700, fontSize: 13 },
  detalhe: { color: C.muted, fontSize: 12, marginLeft: 4 },
  acoes: { display: 'flex', alignItems: 'center', gap: 6 },
  btnLink: { background: 'none', border: 'none', fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: 'pointer', padding: '3px 8px' },
  btnX: { background: 'none', border: 'none', color: C.muted, fontSize: 14, cursor: 'pointer', padding: '3px 6px', fontFamily: "'Syne', sans-serif" },
  lista: { marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 },
  item: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px' },
  itemInfos: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  badgeTipo: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' },
  itemNome: { color: C.text, fontSize: 13, fontWeight: 600 },
  itemPlaca: { color: C.muted, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", background: C.bg, padding: '1px 6px', borderRadius: 4, border: `1px solid ${C.border}` },
  itemSub: { color: C.muted, fontSize: 11 },
  btnVer: { background: 'none', border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif", padding: '4px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' },
}
