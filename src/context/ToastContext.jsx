import { createContext, useContext, useState, useCallback } from 'react'
import { C } from '../lib/constants'

const ToastCtx = createContext(null)

const TOAST_CFG = {
  success: { color: C.green, icon: '✓' },
  error:   { color: C.red,   icon: '✕' },
  info:    { color: C.blue,  icon: 'ℹ' },
  warning: { color: C.amber, icon: '⚠' },
}

/** Notificação individual flutuante — desaparece após `duration` ms */
function ToastItem({ toast, onRemove }) {
  const cfg = TOAST_CFG[toast.type] || TOAST_CFG.info
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: C.surface, border: `1px solid ${cfg.color}44`,
      borderLeft: `3px solid ${cfg.color}`,
      borderRadius: 10, padding: '12px 16px',
      boxShadow: '0 4px 24px #0008',
      animation: 'toastIn 0.25s cubic-bezier(0.4,0,0.2,1)',
      minWidth: 260, maxWidth: 380,
    }}>
      <span style={{ fontSize: 15, color: cfg.color, fontWeight: 700, flexShrink: 0 }}>{cfg.icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 1.4 }}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{ background: 'none', border: 'none', color: C.faint, cursor: 'pointer', padding: '0 2px', fontSize: 14, flexShrink: 0 }}
      >✕</button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback(({ message, type = 'info', duration = 3000 }) => {
    const id = Date.now() + Math.random()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration)
  }, [])

  const removeToast = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), [])

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8,
          pointerEvents: 'none',
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <ToastItem toast={t} onRemove={removeToast} />
            </div>
          ))}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

/** Hook para disparar toasts: const { showToast } = useToast() */
export const useToast = () => useContext(ToastCtx)
