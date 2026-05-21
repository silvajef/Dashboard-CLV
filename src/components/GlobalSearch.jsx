/**
 * GlobalSearch — overlay de busca global (⌘K / clique na sidebar)
 * Pesquisa veículos, clientes e prestadores em tempo real.
 */
import { useState, useEffect, useRef } from 'react'
import { C, STATUS_VEICULO_CFG } from '../lib/constants'

const TYPE_CFG = {
  veiculo:   { icon: '🚐', label: 'Veículo',    cor: C.blue   },
  prestador: { icon: '🔧', label: 'Prestador',   cor: C.orange },
  cliente:   { icon: '👤', label: 'Cliente',     cor: C.green  },
}

function buscar(query, veiculos, prestadores, clientes) {
  const q = query.toLowerCase()

  const vs = veiculos.filter(v =>
    v.placa?.toLowerCase().includes(q)      ||
    v.marca_nome?.toLowerCase().includes(q) ||
    v.modelo_nome?.toLowerCase().includes(q)||
    v.modelo?.toLowerCase().includes(q)     ||
    v.cor?.toLowerCase().includes(q)        ||
    v.ano_modelo?.toLowerCase().includes(q)
  ).slice(0, 6).map(v => ({
    type: 'veiculo', id: v.id,
    title: [v.marca_nome, v.modelo_nome || v.modelo].filter(Boolean).join(' ') || '—',
    sub: [v.placa, v.ano_modelo, STATUS_VEICULO_CFG[v.status]?.label].filter(Boolean).join(' · '),
  }))

  const ps = (prestadores || []).filter(p =>
    p.nome?.toLowerCase().includes(q) ||
    p.especialidade?.toLowerCase().includes(q) ||
    p.telefone?.includes(q)
  ).slice(0, 4).map(p => ({
    type: 'prestador', id: p.id,
    title: p.nome,
    sub: [p.especialidade, p.telefone].filter(Boolean).join(' · '),
  }))

  const cs = (clientes || []).filter(c =>
    c.nome?.toLowerCase().includes(q) ||
    c.cpf_cnpj?.includes(q)           ||
    c.telefone?.includes(q)
  ).slice(0, 4).map(c => ({
    type: 'cliente', id: c.id,
    title: c.nome,
    sub: [c.cpf_cnpj, c.telefone].filter(Boolean).join(' · '),
  }))

  return [...vs, ...ps, ...cs]
}

/* ── ResultRow ─────────────────────────────────────────────────────────────── */
function ResultRow({ result, onSelect }) {
  const [hover, setHover] = useState(false)
  const cfg = TYPE_CFG[result.type]
  return (
    <button
      onClick={() => onSelect(result)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', background: hover ? C.cardHi : 'transparent',
        border: 'none', cursor: 'pointer', padding: '10px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        textAlign: 'left', fontFamily: 'inherit', transition: 'background 100ms',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {result.title}
        </div>
        {result.sub && (
          <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {result.sub}
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.cor, background: `${cfg.cor}20`, padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>
        {cfg.label}
      </span>
    </button>
  )
}

/* ── GlobalSearch ──────────────────────────────────────────────────────────── */
export default function GlobalSearch({ open, onClose, onNavigate, veiculos, prestadores, clientes }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const q = query.trim()
  const results = q.length >= 2 ? buscar(q, veiculos || [], prestadores || [], clientes || []) : []

  const handleSelect = (result) => {
    onClose()
    if (result.type === 'veiculo')   onNavigate('veiculos',    { abrirVeiculoId: result.id })
    if (result.type === 'prestador') onNavigate('prestadores', {})
    if (result.type === 'cliente')   onNavigate('posvenda',    {})
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: '100%', maxWidth: 560, margin: '0 16px', boxShadow: '0 32px 80px #0008', overflow: 'hidden' }}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ color: C.muted, fontSize: 16, flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar veículos, clientes, prestadores..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 15, fontFamily: 'inherit' }}
          />
          <kbd style={{ fontSize: 10, color: C.faint, border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 6px', fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>
            ESC
          </kbd>
        </div>

        {/* Resultados */}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {q.length < 2 && (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🔍</div>
              Digite ao menos 2 caracteres — veículos, placas, clientes, prestadores...
            </div>
          )}
          {q.length >= 2 && results.length === 0 && (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
              Nenhum resultado para <b style={{ color: C.text }}>"{query}"</b>
            </div>
          )}
          {results.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              {results.map(r => (
                <ResultRow key={`${r.type}-${r.id}`} result={r} onSelect={handleSelect}/>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
