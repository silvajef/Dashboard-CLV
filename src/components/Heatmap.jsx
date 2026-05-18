// src/components/Heatmap.jsx — Heatmap genérico (marca × tipo, por exemplo)
// Uso:
//   <Heatmap
//     rows={['Fiat','VW','Ford',...]}
//     cols={['Pick-up','Van','Cam. Leve','Cam. Médio']}
//     data={matrix}                  // [[42, null, ...], ...]
//     valueLabel="d"                 // sufixo no número
//     thresholds={[45, 75, 90]}      // <45 success, 45-75 blue, 75-90 amber, >90 red
//   />

import { useState } from 'react'
import { C } from '../lib/constants'

export default function Heatmap({
  rows, cols, data, valueLabel = '',
  thresholds = [45, 75, 90],
  title, subtitle,
}) {
  const [hover, setHover] = useState(null)

  const colorFor = (d) => {
    if (d == null) return null
    if (d < thresholds[0]) return C.green
    if (d < thresholds[1]) return C.blue
    if (d < thresholds[2]) return C.amber
    return C.red
  }
  const intensityFor = (d) => {
    if (d == null) return 0
    return Math.min(1, Math.max(0.2, d / (thresholds[2] * 1.4)))
  }

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: 24, position: 'relative', fontFamily: "'Syne', sans-serif",
    }}>
      {title && <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>{title}</h3>}
      {subtitle && <div style={{ fontSize: 12, color: C.muted, marginTop: 3, marginBottom: 18, fontFamily: "'Inter', sans-serif" }}>{subtitle}</div>}

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: `110px repeat(${cols.length}, 1fr)`, gap: 4, marginBottom: 4 }}>
        <div/>
        {cols.map(c => (
          <div key={c} style={{
            fontSize: 10, fontWeight: 600, color: C.muted,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            textAlign: 'center', paddingBottom: 6,
          }}>{c}</div>
        ))}
      </div>

      {/* Rows */}
      {rows.map((r, i) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `110px repeat(${cols.length}, 1fr)`, gap: 4, marginBottom: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.text, display: 'flex', alignItems: 'center' }}>{r}</div>
          {cols.map((c, j) => {
            const d = data[i][j]
            const cor = colorFor(d)
            const intensity = intensityFor(d)
            const isHover = hover && hover.i === i && hover.j === j
            return (
              <div key={j}
                onMouseEnter={() => d != null && setHover({ i, j, d, r, c })}
                onMouseLeave={() => setHover(null)}
                style={{
                  height: 38, borderRadius: 6,
                  background: d == null ? C.card
                              : cor + Math.round(intensity * 255).toString(16).padStart(2, '0'),
                  border: `1px solid ${isHover ? cor : (d == null ? C.border : 'transparent')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: d == null ? 'default' : 'pointer',
                  transition: 'border-color 150ms ease, transform 150ms ease',
                  transform: isHover ? 'scale(1.04)' : 'scale(1)',
                }}>
                {d != null && (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12, fontWeight: 600,
                    color: intensity > 0.55 ? '#fff' : cor,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {d}{valueLabel}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Escala</span>
        {[
          { label: `< ${thresholds[0]}${valueLabel}`,  color: C.green },
          { label: `${thresholds[0]}–${thresholds[1]}${valueLabel}`, color: C.blue },
          { label: `${thresholds[1]}–${thresholds[2]}${valueLabel}`, color: C.amber },
          { label: `> ${thresholds[2]}${valueLabel}`,  color: C.red   },
          { label: 'sem dado', color: C.card, outline: true },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 12, height: 12, borderRadius: 3,
              background: l.outline ? C.card : l.color,
              border: l.outline ? `1px dashed ${C.border}` : 'none',
            }}/>
            <span style={{ fontSize: 10, color: C.muted }}>{l.label}</span>
          </div>
        ))}
      </div>

      {hover && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: C.text, color: C.bg,
          padding: '8px 12px', borderRadius: 8,
          fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {hover.r} · {hover.c} <span style={{ opacity: 0.5 }}>·</span>{' '}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{hover.d}{valueLabel}</span>
        </div>
      )}
    </div>
  )
}
