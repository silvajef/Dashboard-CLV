import { C } from '../lib/constants'
import { useBreakpoint } from '../lib/responsive'

export function Badge({ status, cfg }) {
  const c = cfg[status] || { label: status, color: C.muted }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700, background:c.color+'22', color:c.color, border:`1px solid ${c.color}44`, whiteSpace:'nowrap', fontFamily:'inherit' }}>
      {c.icon && <span>{c.icon}</span>}{c.label}
    </span>
  )
}

export function GaugeBar({ value, max, color, height=6 }) {
  const pct = max > 0 ? Math.min(100, (value/max)*100) : 0
  return (
    <div style={{ background:C.border, borderRadius:99, height, overflow:'hidden', width:'100%' }}>
      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:99, transition:'width 0.7s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  )
}

export function Card({ children, style }) {
  return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:22, ...style }}>{children}</div>
}

export function KPI({ label, value, icon, color, sub }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 16px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }} />
      <div style={{ fontSize:20, marginBottom:2 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:800, color, fontFamily:"'JetBrains Mono',monospace", letterSpacing:-1 }}>{value}</div>
      <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:12, color:C.muted, marginTop:8, borderTop:`1px solid ${C.border}`, paddingTop:6 }}>{sub}</div>}
    </div>
  )
}

export function Btn({ children, onClick, variant='primary', small, disabled, style, full }) {
  const v = {
    primary:   { background:C.amber,       color:'#000', border:'none' },
    secondary: { background:'transparent', color:C.text,  border:`1px solid ${C.border}` },
    danger:    { background:C.redDim,      color:C.red,   border:`1px solid ${C.red}44` },
    success:   { background:C.greenDim,    color:C.green, border:`1px solid ${C.green}44` },
    ghost:     { background:'transparent', color:C.text,  border:`1px solid ${C.border}` },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...v[variant], borderRadius:8,
      padding: small ? '7px 13px' : '10px 20px',
      fontSize: small ? 12 : 14, fontWeight:700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, fontFamily:'inherit',
      width: full ? '100%' : undefined,
      whiteSpace: 'nowrap', ...style
    }}>{children}</button>
  )
}

export function Input({ label, value, onChange, type='text', placeholder, required, style, readOnly, options, rows }) {
  const base = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, ...style }}>
      {label && <label style={{ fontSize:12, color:C.muted, fontWeight:700, letterSpacing:0.5 }}>{label}{required && <span style={{ color:C.red }}> *</span>}</label>}
      {options
        ? <select value={value||''} onChange={e=>onChange(e.target.value)} style={base} disabled={readOnly}><option value=''>Selecione...</option>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>
        : rows
          ? <textarea value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...base, resize:'vertical' }} readOnly={readOnly}/>
          : <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ ...base, ...(readOnly?{opacity:0.6,cursor:'not-allowed'}:{}) }} readOnly={readOnly}/>
      }
    </div>
  )
}

export function Modal({ title, onClose, children, wide }) {
  const { isMobile } = useBreakpoint()
  return (
    <div style={{ position:'fixed', inset:0, background:'#000000cc', display:'flex', alignItems:isMobile?'flex-end':'center', justifyContent:'center', zIndex:200, padding:isMobile?0:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{
        background:C.card, border:`1px solid ${C.border}`,
        borderRadius: isMobile ? '16px 16px 0 0' : 16,
        padding: isMobile ? '24px 20px' : 28,
        width: isMobile ? '100%' : wide ? '900px' : '540px',
        maxWidth:'100%', maxHeight: isMobile ? '92vh' : '90vh',
        overflowY:'auto', boxSizing:'border-box',
      }}>
        {isMobile && <div style={{ width:40, height:4, background:C.border, borderRadius:2, margin:'0 auto 20px' }}/>}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h3 style={{ margin:0, fontSize:isMobile?16:18, fontWeight:800, color:C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer', padding:'4px 8px', borderRadius:6 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SectionHead({ title, subtitle, action }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20, gap:10, flexWrap:'wrap' }}>
      <div>
        <div style={{ fontSize:18, fontWeight:800, color:C.text, letterSpacing:-0.3 }}>{title}</div>
        {subtitle && <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  const { isMobile } = useBreakpoint()
  return (
    <div style={{ display:'flex', gap:2, background:C.surface, borderRadius:10, padding:4, border:`1px solid ${C.border}`, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{
          background: active===t.id ? C.card : 'transparent',
          color: active===t.id ? C.amber : C.muted,
          border: active===t.id ? `1px solid ${C.border}` : '1px solid transparent',
          borderRadius:7, padding: isMobile ? '7px 12px' : '7px 16px',
          fontSize:13, fontWeight: active===t.id ? 700 : 500, cursor:'pointer',
          display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap',
          transition:'all 0.15s', fontFamily:'inherit', flexShrink:0,
        }}>
          {t.icon} {!isMobile || tabs.length <= 3 ? t.label : ''}
        </button>
      ))}
    </div>
  )
}

export function Grid({ cols=2, gap=16, children, style, mobileCols, tabletCols }) {
  const { isMobile, isTablet } = useBreakpoint()
  const c = isMobile ? (mobileCols||1) : isTablet ? (tabletCols||Math.max(1,cols-1)) : cols
  return <div style={{ display:'grid', gridTemplateColumns:`repeat(${c},1fr)`, gap, ...style }}>{children}</div>
}

export function LoadingScreen() {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:48, height:48, background:C.amber, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, animation:'pulse 1.5s infinite' }}>🚛</div>
      <div style={{ color:C.muted, fontSize:14, fontFamily:"'Syne',sans-serif" }}>Carregando {' '}
        <strong style={{ color:C.text }}>Dashboard CLV</strong>...
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ background:C.redDim, border:'1px solid #f4485e44', borderRadius:10, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, gap:10, flexWrap:'wrap' }}>
      <span style={{ color:C.red, fontSize:13 }}>⚠️ {message}</span>
      {onRetry && <Btn variant='danger' small onClick={onRetry}>Tentar novamente</Btn>}
    </div>
  )
}
