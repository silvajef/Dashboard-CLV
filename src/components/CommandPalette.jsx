// src/components/CommandPalette.jsx — ⌘K palette funcional
// Uso:
//   1. Render <CommandPalette commands={cmds} /> uma vez no App.jsx (próximo ao root)
//   2. Em qualquer lugar, dispare: window.dispatchEvent(new CustomEvent('clv:palette'))
//      OU pressione ⌘K / Ctrl+K (já registrado globalmente)
//
// `commands` é uma array de { id, label, hint?, icon, section, action }
// Veja ./CommandPalette.example.js para exemplo de como construir os comandos.

import { useState, useEffect, useMemo, useRef } from 'react'
import { C } from '../lib/constants'
import Icon from './Icon'

export default function CommandPalette({ commands = [] }) {
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [activeIdx, setActive]  = useState(0)
  const inputRef = useRef(null)

  // Global ⌘K / Ctrl+K listener + custom event
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    const onCustom = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('clv:palette', onCustom)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('clv:palette', onCustom)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
      setQuery('')
      setActive(0)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      (c.hint && c.hint.toLowerCase().includes(q))
    )
  }, [query, commands])

  const grouped = useMemo(() => {
    const order = []
    const map = {}
    filtered.forEach(c => {
      const s = c.section || 'Outros'
      if (!map[s]) { map[s] = []; order.push(s) }
      map[s].push(c)
    })
    return order.map(s => ({ section: s, items: map[s] }))
  }, [filtered])

  useEffect(() => { setActive(0) }, [query])

  const exec = (cmd) => {
    setOpen(false)
    cmd?.action?.()
  }

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(filtered.length - 1, i + 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    if (e.key === 'Enter')     { e.preventDefault(); exec(filtered[activeIdx]) }
  }

  if (!open) return null

  return (
    <div onClick={() => setOpen(false)} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh',
      animation: 'clvFadeIn 150ms ease',
      fontFamily: "'Syne', sans-serif",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 560, maxWidth: '90vw',
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
        boxShadow: '0 24px 48px -20px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        animation: 'clvSlideDown 200ms cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', borderBottom: `1px solid ${C.border}`,
        }}>
          <Icon name="search" size={16} style={{ color: C.muted }}/>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Buscar veículo, ação ou ir para…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', color: C.text,
              fontSize: 15, fontFamily: 'inherit',
            }}
          />
          <span style={kbdStyle()}>ESC</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 0' }}>
          {grouped.length === 0 ? (
            <div style={{ padding: '24px 18px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
              Nenhum resultado para “{query}”
            </div>
          ) : grouped.map(group => (
            <div key={group.section} style={{ marginBottom: 4 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: C.faint,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '8px 18px 4px',
              }}>{group.section}</div>
              {group.items.map(item => {
                const globalIdx = filtered.indexOf(item)
                const isActive = globalIdx === activeIdx
                return (
                  <div key={item.id}
                    onMouseEnter={() => setActive(globalIdx)}
                    onClick={() => exec(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 18px', cursor: 'pointer',
                      background: isActive ? C.blueDim : 'transparent',
                      borderLeft: `2px solid ${isActive ? C.blue : 'transparent'}`,
                    }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: isActive ? C.blue : C.card,
                      color: isActive ? '#fff' : C.muted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon name={item.icon} size={14} strokeWidth={isActive ? 2 : 1.6}/>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                      {item.hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{item.hint}</div>}
                    </div>
                    {isActive && (
                      <span style={{ ...kbdStyle(), color: C.blue, borderColor: `${C.blue}44` }}>↵</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 18px', borderTop: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 14,
          fontSize: 10, color: C.muted, background: C.card,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <kbd style={kbdStyle()}>↑</kbd><kbd style={kbdStyle()}>↓</kbd> navegar
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <kbd style={kbdStyle()}>↵</kbd> abrir
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>
      </div>
    </div>
  )
}

function kbdStyle() {
  return {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.muted,
    border: `1px solid ${C.border}`, padding: '0 4px',
    borderRadius: 3, background: C.surface, lineHeight: 1.4,
  }
}
