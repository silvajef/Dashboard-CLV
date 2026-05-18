// src/components/EmptyState.jsx — vazio com personalidade
// Uso:
//   <EmptyState icon="package" title="Nenhum veículo" description="..." onAction={() => ...} actionLabel="Novo veículo"/>

import { C } from '../lib/constants'
import Icon from './Icon'

export default function EmptyState({ icon = 'package', title, description, actionLabel, onAction, style }) {
  return (
    <div style={{
      background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14,
      padding: '48px 32px', textAlign: 'center',
      fontFamily: "'Syne', sans-serif",
      ...style,
    }}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 18px',
        borderRadius: 16, background: C.card,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: C.muted, position: 'relative',
      }}>
        <Icon name={icon} size={28} strokeWidth={1.5}/>
        <span style={{ position: 'absolute', top: -4, right: -6, color: C.blue }}>
          <Icon name="sparkles" size={14} strokeWidth={2}/>
        </span>
      </div>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text, letterSpacing: '-0.015em' }}>{title}</h3>
      {description && (
        <p style={{ margin: '6px auto 0', fontSize: 13, color: C.muted, maxWidth: 360, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} style={{
          marginTop: 18, background: C.blue, color: '#fff',
          border: 'none', borderRadius: 8, padding: '8px 16px',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="plus" size={13}/> {actionLabel}
        </button>
      )}
    </div>
  )
}
