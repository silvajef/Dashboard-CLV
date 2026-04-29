import { T, FONT, MONO } from '../lib/theme'

// ── Badge de status ───────────────────────────────────────────────────
export function Badge({ status, cfg }) {
  const c = cfg[status] || { label: status, color: T.muted }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.color + '22', color: c.color, border: `1px solid ${c.color}44`,
      whiteSpace: 'nowrap', fontFamily: FONT,
    }}>
      {c.icon && <span>{c.icon}</span>}
      {c.label}
    </span>
  )
}

// ── Barra de progresso ────────────────────────────────────────────────
export function GaugeBar({ value, max, color, height = 6 }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div style={{ background: T.border, borderRadius: 99, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({ children, style, accent }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: 22,
      ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Botão ─────────────────────────────────────────────────────────────
const BTN_VARIANTS = {
  primary:   { background: T.amber,     color: '#000',    border: 'none' },
  secondary: { background: 'transparent', color: T.muted, border: `1px solid ${T.border}` },
  danger:    { background: T.redDim,    color: T.red,     border: `1px solid ${T.red}44` },
  success:   { background: T.greenDim,  color: T.green,   border: `1px solid ${T.green}44` },
  ghost:     { background: 'transparent', color: T.text,  border: `1px solid ${T.border}` },
}

export function Btn({ children, onClick, variant = 'primary', small, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...BTN_VARIANTS[variant],
        borderRadius: 8,
        padding: small ? '6px 12px' : '10px 20px',
        fontSize: small ? 12 : 14,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: FONT,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Input / Select ────────────────────────────────────────────────────
export function Input({ label, value, onChange, type = 'text', placeholder, required, style, readOnly, options }) {
  const base = {
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
    color: T.text, padding: '10px 14px', fontSize: 14, width: '100%',
    outline: 'none', boxSizing: 'border-box', fontFamily: FONT,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      {label && (
        <label style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: 0.5 }}>
          {label}{required && <span style={{ color: T.red }}> *</span>}
        </label>
      )}
      {options
        ? (
          <select value={value || ''} onChange={e => onChange(e.target.value)} style={base} disabled={readOnly}>
            <option value=''>Selecione...</option>
            {options.map(o => (
              <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
            ))}
          </select>
        )
        : (
          <input
            type={type}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            style={{ ...base, ...(readOnly ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
          />
        )
      }
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: '#000000cc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 28,
        width: wide ? 860 : 520, maxWidth: '97vw', maxHeight: '90vh',
        overflowY: 'auto', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, fontFamily: FONT }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Loading spinner ───────────────────────────────────────────────────
export function Spinner({ text = 'Carregando...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: T.muted, fontFamily: FONT }}>
      <div style={{
        width: 32, height: 32, border: `3px solid ${T.border}`,
        borderTop: `3px solid ${T.amber}`, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontSize: 13 }}>{text}</span>
    </div>
  )
}

// ── Toast notifications ───────────────────────────────────────────────
let toastId = 0
const listeners = new Set()

export const toast = {
  _queue: [],
  success: (msg) => toast._emit({ id: ++toastId, msg, type: 'success' }),
  error:   (msg) => toast._emit({ id: ++toastId, msg, type: 'error'   }),
  _emit(t) {
    toast._queue = [...toast._queue, t]
    listeners.forEach(fn => fn(toast._queue))
    setTimeout(() => {
      toast._queue = toast._queue.filter(x => x.id !== t.id)
      listeners.forEach(fn => fn(toast._queue))
    }, 3500)
  },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    const fn = q => setToasts([...q])
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'success' ? T.green + '22' : T.red + '22',
          border: `1px solid ${t.type === 'success' ? T.green : T.red}44`,
          color: t.type === 'success' ? T.green : T.red,
          borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 700,
          fontFamily: FONT, backdropFilter: 'blur(8px)',
          animation: 'slideIn 0.2s ease',
        }}>
          {t.type === 'success' ? '✓ ' : '✕ '}{t.msg}
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────
export function KpiCard({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: '18px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ fontSize: 22, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: MONO, letterSpacing: -1 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 8, borderTop: `1px solid ${T.border}`, paddingTop: 6 }}>{sub}</div>}
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: active === t.id ? T.card : 'transparent',
            color: active === t.id ? T.amber : T.muted,
            border: active === t.id ? `1px solid ${T.border}` : '1px solid transparent',
            borderRadius: 7, padding: '7px 16px', fontSize: 13,
            fontWeight: active === t.id ? 700 : 400,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: FONT, transition: 'all 0.15s',
          }}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  )
}

// need useState for ToastContainer
import { useState, useEffect } from 'react'
