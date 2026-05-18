// MiniLine — sparkline SVG with a tracker dot at the current (last) value.
// Scales horizontally via preserveAspectRatio="none"; strokeWidth stays
// consistent via vectorEffect="non-scaling-stroke".
// Usage: <MiniLine data={[10,14,9,18,22]} color="#f59e0b" surface="#12151e" height={36} />
export default function MiniLine({ data, color, muted, surface, height = 36 }) {
  if (!data || data.length < 2) return null
  const W = 240  // fixed viewBox width — scales via preserveAspectRatio
  const H = height
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = (max - min) || 1
  const stepX = W / (data.length - 1)
  const pts = data.map((d, i) => [
    i * stepX,
    H - ((d - min) / range) * (H - 6) - 3,
  ])
  const line = pts.map(([x, y], i) =>
    (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
  ).join(' ')
  const area = line + ` L${W},${H} L0,${H} Z`
  const [lx, ly] = pts[pts.length - 1]
  const gradId = 'ml-' + color.replace('#', '')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* area fill */}
      <path d={area} fill={`url(#${gradId})`}/>

      {/* main line */}
      <path d={line} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"/>

      {/* intermediate ghost dots */}
      {pts.slice(0, -1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6"
          fill={muted || color} opacity="0.4"
          vectorEffect="non-scaling-stroke"/>
      ))}

      {/* tracker dot at last point */}
      <circle cx={lx} cy={ly} r="3.5"
        fill={surface || '#12151e'} stroke={color} strokeWidth="2"
        vectorEffect="non-scaling-stroke"/>
    </svg>
  )
}
