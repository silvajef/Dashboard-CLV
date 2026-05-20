import { useRef, useState, useEffect } from 'react'

// Round a raw step value up to the nearest "nice" step: 1/2/5 × 10^n
function niceStep(raw) {
  if (!raw || raw <= 0) return 1
  const exp  = Math.floor(Math.log10(raw))
  const base = 10 ** exp
  const frac = raw / base
  if (frac <= 1) return base
  if (frac <= 2) return 2 * base
  if (frac <= 5) return 5 * base
  return 10 * base
}

// LineTracker — multi-series line chart with vertical hover cursor + tooltip.
// Usage:
//   <LineTracker
//     series={[{ name: 'Receita', color: C.amber, data: [...] }]}
//     labels={['Jul','Ago','Set']}
//     height={200}
//     formatY={v => fmtR(v * 1000)}
//     theme={{ line: C.border, faint: C.faint, muted: C.muted, text: C.text, surface: C.card }}
//   />
export default function LineTracker({
  series,
  labels,
  height       = 200,
  formatY      = (v) => v,
  formatTooltip,
  yTicks       = 5,
  theme,
  padding      = { top: 8, right: 12, bottom: 24, left: 44 },
}) {
  const wrapRef = useRef(null)
  const [w, setW] = useState(600)
  const [hoverX, setHoverX] = useState(null)

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const t = theme || {}
  const W = Math.max(300, w)
  const H = height
  const innerW = W - padding.left - padding.right
  const innerH = H - padding.top  - padding.bottom
  const n = labels.length
  if (n < 2 || !series?.length) return null

  const allValues = series.flatMap(s => s.data)
  const maxV  = Math.max(...allValues)
  const minV  = Math.min(0, ...allValues)
  const range = (maxV - minV) || 1

  const step = niceStep(range / (yTicks - 1))
  const ticks = Array.from({ length: yTicks }, (_, i) => minV + step * i)
  const niceMax   = ticks[ticks.length - 1]
  const niceRange = (niceMax - minV) || 1

  const xAt = (i) => padding.left + (i / (n - 1)) * innerW
  const yAt = (v) => padding.top  + (1 - (v - minV) / niceRange) * innerH

  const linePath = (data) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(d).toFixed(1)}`).join(' ')

  const areaPath = (data) => {
    const top = data.map((d, i) =>
      `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(d).toFixed(1)}`
    ).join(' ')
    return `${top} L${xAt(n-1).toFixed(1)},${yAt(minV).toFixed(1)} L${xAt(0).toFixed(1)},${yAt(minV).toFixed(1)} Z`
  }

  const onMove = (e) => {
    const rect  = e.currentTarget.getBoundingClientRect()
    const x     = e.clientX - rect.left
    const ratio = (x - padding.left) / innerW
    setHoverX(Math.round(Math.max(0, Math.min(1, ratio)) * (n - 1)))
  }

  const fmt = formatTooltip || formatY

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <svg
        width={W} height={H}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverX(null)}
        style={{ display: 'block', cursor: hoverX != null ? 'crosshair' : 'default' }}
      >
        {/* Y gridlines + labels */}
        {ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left} x2={W - padding.right}
              y1={yAt(tick)} y2={yAt(tick)}
              stroke={t.line} strokeWidth="1"
              strokeDasharray={i === 0 ? '0' : '2 3'}
            />
            <text
              x={padding.left - 8} y={yAt(tick) + 3}
              textAnchor="end" fontSize="10"
              fill={t.faint} fontFamily="inherit"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatY(tick)}
            </text>
          </g>
        ))}

        {/* Gradient defs */}
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`grad-lt-${i}-${s.color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={s.color} stopOpacity="0.30"/>
              <stop offset="75%"  stopColor={s.color} stopOpacity="0.06"/>
              <stop offset="100%" stopColor={s.color} stopOpacity="0"/>
            </linearGradient>
          ))}
        </defs>

        {/* Area fill + line per series */}
        {series.map((s, i) => (
          <g key={i}>
            <path d={areaPath(s.data)} fill={`url(#grad-lt-${i}-${s.color.replace('#','')})`}/>
            <path d={linePath(s.data)} fill="none" stroke={s.color} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
            {/* Glow ring + dot no último ponto */}
            <circle cx={xAt(n-1)} cy={yAt(s.data[n-1])} r="9"  fill={s.color} opacity="0.12"/>
            <circle cx={xAt(n-1)} cy={yAt(s.data[n-1])} r="4"  fill={s.color} stroke={t.surface || '#12151e'} strokeWidth="2"/>
          </g>
        ))}

        {/* Hover cursor */}
        {hoverX != null && (
          <g>
            <line
              x1={xAt(hoverX)} x2={xAt(hoverX)}
              y1={padding.top}  y2={H - padding.bottom}
              stroke={t.text} strokeWidth="1" strokeDasharray="3 3" opacity="0.4"
            />
            {series.map((s, i) => (
              <circle key={i}
                cx={xAt(hoverX)} cy={yAt(s.data[hoverX])}
                r="5" fill={t.surface} stroke={s.color} strokeWidth="2"
              />
            ))}
          </g>
        )}

        {/* X labels */}
        {labels.map((label, i) => (
          <text key={i} x={xAt(i)} y={H - 6} textAnchor="middle"
            fontSize="10" fill={t.muted} fontFamily="inherit">
            {label}
          </text>
        ))}
      </svg>

      {/* Floating tooltip */}
      {hoverX != null && (() => {
        const left     = xAt(hoverX)
        const flipLeft = left > W * 0.7
        return (
          <div style={{
            position: 'absolute',
            left:  flipLeft ? 'auto' : left + 10,
            right: flipLeft ? (W - left + 10) : 'auto',
            top:   padding.top,
            background:   t.surface,
            border:       `1px solid ${t.line}`,
            borderRadius: 8,
            padding:      '8px 10px',
            fontSize:     11,
            color:        t.text,
            pointerEvents:'none',
            boxShadow:    '0 8px 20px -8px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)',
            minWidth:     110,
            zIndex:       2,
          }}>
            <div style={{
              fontSize: 10, color: t.muted, fontWeight: 600,
              marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              {labels[hoverX]}
            </div>
            {series.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6, marginTop: i ? 4 : 0,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: s.color, flexShrink: 0,
                }}/>
                <span style={{ color: t.muted, flex: 1 }}>{s.name}</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(s.data[hoverX], s)}
                </span>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
