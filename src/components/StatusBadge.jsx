// StatusBadge — dot + ícone SVG + label padronizado para status de veículo
// Substitui o uso de emojis e do Badge genérico para STATUS_VEICULO_CFG
//
// Uso:
//   import StatusBadge from './StatusBadge'
//   <StatusBadge status="pronto" />
//   <StatusBadge status="manutencao" size="sm" />

import { C } from '../lib/constants'
import Icon from './Icon'

const CFG = {
  pendente:   { label: 'Revisão Pendente', color: C.amber,  icon: 'clock'       },
  manutencao: { label: 'Em Manutenção',    color: C.blue,   icon: 'wrench'      },
  pronto:     { label: 'Pronto p/ Venda',  color: C.green,  icon: 'check'       },
  em_venda:   { label: 'Em Venda',         color: C.purple, icon: 'tag'         },
  vendido:    { label: 'Vendido',          color: C.muted,  icon: 'checkDouble' },
}

const SIZES = {
  sm: { pad: '2px 8px',  fs: 10, ih: 11, gap: 5, dot: 5 },
  md: { pad: '4px 10px', fs: 11, ih: 12, gap: 6, dot: 6 },
  lg: { pad: '6px 12px', fs: 13, ih: 14, gap: 7, dot: 7 },
}

export default function StatusBadge({ status, size = 'md', showDot = true, style }) {
  const cfg  = CFG[status] || CFG.pendente
  const s    = SIZES[size] || SIZES.md
  const glow = status !== 'vendido' ? `0 0 10px ${cfg.color}40` : undefined
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: s.gap,
      padding: s.pad, borderRadius: 999,
      fontSize: s.fs, fontWeight: 600,
      color: cfg.color,
      background: cfg.color + '18',
      border: `1px solid ${cfg.color}44`,
      whiteSpace: 'nowrap', lineHeight: 1,
      fontFamily: "'Syne', sans-serif",
      boxShadow: glow,
      ...style,
    }}>
      {showDot && (
        <span style={{
          width: s.dot, height: s.dot, borderRadius: '50%',
          background: cfg.color, flexShrink: 0,
          boxShadow: glow,
        }}/>
      )}
      <Icon name={cfg.icon} size={s.ih} strokeWidth={2}/>
      {cfg.label}
    </span>
  )
}
