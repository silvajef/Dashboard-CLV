// ProcessTimeline — stepper horizontal do processo de venda
// Substitui a lista vertical em EtapasProcesso (ProcessoVenda.jsx)
//
// Props:
//   etapas: array de { tipo, label, icon, concluido, concluido_em, obs }
//   onStepClick?: (idx) => void   — opcional; quando fornecido, habilita clique

import { C } from '../lib/constants'
import Icon from './Icon'

export default function ProcessTimeline({ etapas = [], onStepClick }) {
  if (!etapas.length) return null

  const currentIdx   = etapas.findIndex(e => !e.concluido)
  const allDone      = currentIdx === -1
  const progressPct  = allDone
    ? 100
    : (Math.max(0, currentIdx - 0.5) / Math.max(1, etapas.length - 1)) * 100

  return (
    <div style={{ position: 'relative', padding: '4px 0', fontFamily: "'Syne', sans-serif" }}>
      {/* Track de fundo */}
      <div style={{
        position: 'absolute', top: 19, left: 19, right: 19,
        height: 2, background: C.border, borderRadius: 1, zIndex: 0,
      }}/>
      {/* Track preenchida */}
      <div style={{
        position: 'absolute', top: 19, left: 19,
        width: `calc(${progressPct}% - 0px)`,
        maxWidth: 'calc(100% - 38px)',
        height: 2, background: C.blue, borderRadius: 1,
        transition: 'width 400ms cubic-bezier(0.4,0,0.2,1)',
        zIndex: 0,
      }}/>

      {/* Nodes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', gap: 8, zIndex: 1 }}>
        {etapas.map((step, i) => {
          const isDone    = step.concluido
          const isCurrent = !isDone && i === currentIdx

          const nodeBg     = isDone ? C.blue : C.surface
          const nodeBorder = isDone ? C.blue : isCurrent ? C.blue : C.border
          const iconColor  = isDone ? '#fff' : isCurrent ? C.blue : C.muted
          const labelColor = isDone ? C.text  : isCurrent ? C.text  : C.muted
          const subColor   = isDone ? C.muted : isCurrent ? C.blue  : C.faint
          const subText    = isDone ? 'Concluído' : isCurrent ? 'Em andamento' : 'Pendente'

          // Resolve ícone: campo step.icon (SVG name) → fallback por tipo → fallback 'dot'
          // ETAPA_ICONS garante compatibilidade com etapas salvas antes da migração
          const iconName = ETAPA_ICONS[step.tipo] || step.icon || 'dot'

          return (
            <button
              key={step.tipo || i}
              type="button"
              onClick={onStepClick ? () => onStepClick(i, step) : undefined}
              disabled={!onStepClick}
              style={{
                flex: 1, background: 'none', border: 'none',
                cursor: onStepClick ? 'pointer' : 'default',
                padding: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                minWidth: 0, fontFamily: 'inherit',
              }}
              title={step.label}
            >
              {/* node */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: nodeBg, border: `2px solid ${nodeBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: iconColor,
                position: 'relative', flexShrink: 0,
                transition: 'background 220ms ease, border-color 220ms ease',
              }}>
                {isCurrent && (
                  <span style={{
                    position: 'absolute', inset: -4, borderRadius: '50%',
                    border: `2px solid ${C.blue}`,
                    opacity: 0.25,
                    animation: 'clvPulse 1.8s ease-out infinite',
                  }}/>
                )}
                <Icon name={isDone ? 'check' : iconName} size={16} strokeWidth={isDone ? 2.5 : 1.8}/>
              </div>

              {/* label */}
              <div style={{ textAlign: 'center', minWidth: 0, maxWidth: '100%' }}>
                <div style={{
                  fontSize: 11, fontWeight: isCurrent ? 600 : 500,
                  color: labelColor,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  lineHeight: 1.25,
                }}>{step.label}</div>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: subColor, marginTop: 3,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{subText}</div>
              </div>
            </button>
          )
        })}
      </div>

      <style>{`
        @keyframes clvPulse {
          0%   { transform: scale(1);   opacity: 0.45; }
          70%  { transform: scale(1.4); opacity: 0;    }
          100% { transform: scale(1.4); opacity: 0;    }
        }
      `}</style>
    </div>
  )
}

// Mapeamento tipo de etapa → ícone SVG (garante compatibilidade com registros antigos no banco)
export const ETAPA_ICONS = {
  financiamento: 'bank',
  contrato:      'contract',
  revisao:       'wrench',
  vistoria:      'search',
  documentacao:  'folder',
  entrega:       'car',
}
