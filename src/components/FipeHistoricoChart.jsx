/**
 * FipeHistoricoChart — SVG line chart for FIPE price history.
 * Props: historico (priceHistory array from FIPE v2), valorEntrada (purchase price).
 * FIPE returns months newest-first; we reverse to plot chronologically.
 */
import { C } from '../lib/constants'
import { parseFipeValor } from '../hooks/useFipe'

const MESES = {
  janeiro:'jan', fevereiro:'fev', março:'mar', abril:'abr',
  maio:'mai', junho:'jun', julho:'jul', agosto:'ago',
  setembro:'set', outubro:'out', novembro:'nov', dezembro:'dez',
}

function fmtMes(str = '') {
  const parts = str.toLowerCase().split(' ')
  const nome  = MESES[parts[0]] || parts[0]
  const ano   = (parts[2] || '').slice(2)
  return `${nome}/${ano}`
}

function fmtR(v) {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR')
}

export default function FipeHistoricoChart({ historico, valorEntrada }) {
  if (!historico?.length) return null

  // Reverse: FIPE sends newest-first; chart reads left-to-right (oldest → newest)
  const pontos = [...historico]
    .reverse()
    .slice(-12)
    .map(h => ({ label: fmtMes(h.month), valor: parseFipeValor(h.price) }))
    .filter(p => p.valor > 0)

  if (pontos.length < 2) return null

  const W = 520, H = 150
  const PAD = { top: 20, right: 20, bottom: 34, left: 68 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const valores = pontos.map(p => p.valor)
  const rawMin = Math.min(...valores)
  const rawMax = Math.max(...valores)
  // If purchase price is in view range, extend accordingly
  const vMin = valorEntrada > 0 ? Math.min(rawMin, valorEntrada) * 0.97 : rawMin * 0.97
  const vMax = valorEntrada > 0 ? Math.max(rawMax, valorEntrada) * 1.03 : rawMax * 1.03
  const range = vMax - vMin || 1

  const px = i => PAD.left + (i / (pontos.length - 1)) * cW
  const py = v => PAD.top + cH - ((v - vMin) / range) * cH

  const linePts = pontos.map((p, i) => `${px(i)},${py(p.valor)}`).join(' ')
  const fillPts = `${PAD.left},${PAD.top + cH} ${linePts} ${px(pontos.length - 1)},${PAD.top + cH}`

  const showEntrada = valorEntrada > 0 && valorEntrada >= vMin && valorEntrada <= vMax

  // Variation vs oldest point
  const oldest  = pontos[0].valor
  const newest  = pontos[pontos.length - 1].valor
  const varPct  = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0
  const varCor  = varPct >= 0 ? C.green : C.red

  return (
    <div style={{ background:`${C.green}08`, border:`1px solid ${C.green}22`, borderRadius:10, padding:'14px 16px', marginTop:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ fontSize:10, color:C.green, fontWeight:700, letterSpacing:1 }}>
          📈 HISTÓRICO FIPE — ÚLTIMOS {pontos.length} MESES
        </div>
        <div style={{ fontSize:11, fontWeight:800, color:varCor, fontFamily:"'JetBrains Mono',monospace" }}>
          {varPct >= 0 ? '+' : ''}{varPct.toFixed(1)}% no período
        </div>
      </div>

      <div style={{ overflowX:'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', maxWidth:W, display:'block' }}>
          {/* Grid lines + Y labels */}
          {[0, 0.5, 1].map(t => {
            const yy  = PAD.top + cH * (1 - t)
            const val = vMin + range * t
            return (
              <g key={t}>
                <line x1={PAD.left} y1={yy} x2={PAD.left + cW} y2={yy}
                  stroke={C.border} strokeDasharray="3,3" strokeWidth={1}/>
                <text x={PAD.left - 6} y={yy + 4} textAnchor="end" fontSize={9} fill={C.faint}>
                  {fmtR(val)}
                </text>
              </g>
            )
          })}

          {/* Fill area under line */}
          <polygon points={fillPts} fill={`${C.green}12`}/>

          {/* Main price line */}
          <polyline points={linePts} fill="none" stroke={C.green} strokeWidth={2}
            strokeLinejoin="round" strokeLinecap="round"/>

          {/* Purchase price reference dashed line */}
          {showEntrada && (
            <line
              x1={PAD.left} y1={py(valorEntrada)}
              x2={PAD.left + cW} y2={py(valorEntrada)}
              stroke={C.amber} strokeDasharray="6,3" strokeWidth={1.5} opacity={0.75}/>
          )}

          {/* X-axis labels — skip every other if too many */}
          {pontos.map((p, i) => {
            if (pontos.length > 8 && i % 2 !== 0) return null
            return (
              <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize={9} fill={C.faint}>
                {p.label}
              </text>
            )
          })}

          {/* Dots on line */}
          {pontos.map((p, i) => (
            <circle key={i} cx={px(i)} cy={py(p.valor)} r={3}
              fill={C.green} stroke={C.card} strokeWidth={1.5}/>
          ))}

          {/* Highlight last point with value */}
          <circle cx={px(pontos.length - 1)} cy={py(newest)} r={4}
            fill={C.green} stroke={C.card} strokeWidth={2}/>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginTop:4, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:14, height:2, background:C.green, borderRadius:1 }}/>
          <span style={{ fontSize:10, color:C.muted }}>Tabela FIPE · atual: <b style={{ color:C.green }}>{fmtR(newest)}</b></span>
        </div>
        {showEntrada && (
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:14, height:2, background:C.amber, borderRadius:1, opacity:0.8 }}/>
            <span style={{ fontSize:10, color:C.muted }}>Valor de Compra: <b style={{ color:C.amber }}>{fmtR(valorEntrada)}</b></span>
          </div>
        )}
      </div>
    </div>
  )
}
