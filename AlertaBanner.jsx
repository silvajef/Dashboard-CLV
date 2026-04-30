import { useState, useMemo } from 'react'

// AlertaBanner não importa useAuth — aparece para todos os usuários logados.
// O App.jsx já garante que só chegamos aqui com sessão válida.

const C = {
  bg:      '#0f1117',
  surface: '#1a1d27',
  border:  '#2a2d3a',
  text:    '#e2e8f0',
  muted:   '#64748b',
  warn:    '#f59e0b',
  danger:  '#ef4444',
  success: '#22c55e',
}

/**
 * AlertaBanner
 *
 * Exibe um banner colapsável quando há veículos com atenção necessária.
 * Visível para TODOS os usuários autenticados (admin, operador e visualizador).
 *
 * Critérios de alerta:
 *   1. Veículo com serviço de status 'pendente'
 *   2. Veículo sem manutenção há mais de `metas.dias_max_estoque` dias
 *      (padrão: 30 dias se a meta não estiver configurada)
 *
 * Props:
 *   veiculos     — array de veículos do useFleetData
 *   servicos     — array de serviços do useFleetData
 *   metas        — objeto metas { dias_max_estoque }
 *   onVerVeiculo — callback(veiculo) — navega ao detalhe do veículo
 */
export default function AlertaBanner({ veiculos = [], servicos = [], metas = {}, onVerVeiculo }) {
  const [expandido, setExpandido] = useState(false)
  const [fechado,   setFechado]   = useState(false)

  const limiar = metas?.dias_max_estoque || 30

  // ── Calcular veículos críticos ──────────────────────────────────────────
  const criticos = useMemo(() => {
    const hoje = new Date()

    return veiculos
      .filter(v => v.status !== 'vendido')
      .map(v => {
        // Dias desde a entrada no estoque
        const diasEstoque = v.data_entrada
          ? Math.floor((hoje - new Date(v.data_entrada)) / 86400000)
          : null

        // Serviços deste veículo, do mais recente para o mais antigo
        const servicosV = servicos
          .filter(s => s.veiculo_id === v.id)
          .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))

        // Dias desde o último serviço (ou desde a entrada se sem serviços)
        const ultimoServico = servicosV[0]
        const diasSemServico = ultimoServico?.data
          ? Math.floor((hoje - new Date(ultimoServico.data)) / 86400000)
          : (diasEstoque ?? 999)

        const temPendente = servicosV.some(s => s.status === 'pendente')

        return { ...v, diasEstoque, diasSemServico, temPendente }
      })
      .filter(v => v.temPendente || (v.diasSemServico ?? 0) >= limiar)
      .sort((a, b) => {
        // Pendentes primeiro, depois por mais dias sem serviço
        if (a.temPendente !== b.temPendente) return a.temPendente ? -1 : 1
        return (b.diasSemServico ?? 0) - (a.diasSemServico ?? 0)
      })
  }, [veiculos, servicos, limiar])

  // Sem alertas ou fechado pelo usuário → não renderiza
  if (criticos.length === 0 || fechado) return null

  const total   = criticos.length
  const urgente = criticos.filter(v => v.temPendente).length
  const vencido = criticos.filter(v => !v.temPendente).length
  const cor     = total >= 3 ? C.danger : C.warn
  const icone   = total >= 3 ? '🚨' : '⚠️'

  return (
    <div style={{ ...s.banner, borderLeftColor: cor }}>

      {/* ── Cabeçalho ── */}
      <div style={s.cab}>
        <div style={s.cabEsq}>
          <span style={{ fontSize: 17, lineHeight: 1 }}>{icone}</span>
          <div>
            <span style={{ ...s.tituloBanner, color: cor }}>
              {total} veículo{total > 1 ? 's' : ''} com atenção necessária
            </span>
            <span style={s.detalhe}>
              {urgente > 0 && `${urgente} com serviço pendente`}
              {urgente > 0 && vencido > 0 && ' · '}
              {vencido > 0 && `${vencido} sem manutenção há +${limiar} dias`}
            </span>
          </div>
        </div>

        <div style={s.acoes}>
          <button
            onClick={() => setExpandido(e => !e)}
            style={{ ...s.btnLink, color: cor }}
          >
            {expandido ? 'Ocultar ▲' : 'Ver detalhes ▼'}
          </button>
          <button
            onClick={() => setFechado(true)}
            style={s.btnX}
            title="Fechar alerta"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Lista expandida ── */}
      {expandido && (
        <div style={s.lista}>
          {criticos.map(v => {
            const corItem = v.temPendente ? C.danger : C.warn
            return (
              <div key={v.id} style={s.item}>
                <div style={s.itemInfos}>
                  <span style={{
                    ...s.badgeTipo,
                    background: `${corItem}18`,
                    color: corItem,
                  }}>
                    {v.temPendente ? '🔴 Pendente' : `⏱ ${v.diasSemServico}d sem serviço`}
                  </span>

                  <span style={s.itemNome}>
                    {v.marca_nome} {v.modelo_nome}
                  </span>

                  <span style={s.itemPlaca}>{v.placa}</span>

                  {v.diasEstoque !== null && (
                    <span style={s.itemSub}>{v.diasEstoque}d em estoque</span>
                  )}
                </div>

                {onVerVeiculo && (
                  <button onClick={() => onVerVeiculo(v)} style={s.btnVer}>
                    Ver →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  banner: {
    background: '#1b190f',
    border: `1px solid ${C.warn}28`,
    borderLeft: `3px solid ${C.warn}`,  // cor dinâmica aplicada inline
    borderRadius: 10,
    padding: '11px 16px',
    margin: '16px 16px 0',
    fontFamily: "'Syne', sans-serif",
  },
  cab: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  cabEsq: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 200,
  },
  tituloBanner: {
    fontWeight: 700,
    fontSize: 13,
  },
  detalhe: {
    color: C.muted,
    fontSize: 12,
    marginLeft: 4,
  },
  acoes: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  btnLink: {
    background: 'none',
    border: 'none',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "'Syne', sans-serif",
    cursor: 'pointer',
    padding: '3px 8px',
  },
  btnX: {
    background: 'none',
    border: 'none',
    color: C.muted,
    fontSize: 14,
    cursor: 'pointer',
    padding: '3px 6px',
    fontFamily: "'Syne', sans-serif",
  },
  lista: {
    marginTop: 12,
    borderTop: `1px solid ${C.border}`,
    paddingTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '8px 12px',
  },
  itemInfos: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  badgeTipo: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 20,
    whiteSpace: 'nowrap',
  },
  itemNome: {
    color: C.text,
    fontSize: 13,
    fontWeight: 600,
  },
  itemPlaca: {
    color: C.muted,
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    background: C.bg,
    padding: '1px 6px',
    borderRadius: 4,
    border: `1px solid ${C.border}`,
  },
  itemSub: {
    color: C.muted,
    fontSize: 11,
  },
  btnVer: {
    background: 'none',
    border: `1px solid ${C.border}`,
    color: C.muted,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Syne', sans-serif",
    padding: '4px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
}
