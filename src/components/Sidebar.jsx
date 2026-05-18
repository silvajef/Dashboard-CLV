import { useState } from 'react'
import { APP_NAME, C } from '../lib/constants'
import Icon from './Icon'

const COLLAPSED_W = 60
const EXPANDED_W  = 220

// NavItem — single nav button with per-item hover state, accent rail, and
// badge corner-dot when collapsed. Token mapping: active→amber, hover→cardHi.
function NavItem({ item, active, expanded, onClick }) {
  const [hover, setHover] = useState(false)

  const bg        = active ? C.amberDim : hover ? C.cardHi  : 'transparent'
  const color     = active ? C.amber    : hover ? C.text     : C.muted
  const railColor = active ? C.amber    : hover ? C.borderHi : 'transparent'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={!expanded ? item.label : undefined}
      style={{
        position: 'relative',
        width: '100%', background: bg, border: 'none',
        color, borderRadius: 8,
        padding: expanded ? '9px 10px 9px 14px' : '9px 0',
        fontSize: 13, fontFamily: "'Syne', sans-serif",
        fontWeight: active ? 700 : 400,
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center',
        justifyContent: expanded ? 'flex-start' : 'center',
        gap: 10, height: 36, marginBottom: 2,
        transition: 'background 120ms ease, color 120ms ease, padding 200ms ease',
        overflow: 'hidden',
      }}
    >
      {/* left accent rail */}
      <span style={{
        position: 'absolute', left: 0, top: 8, bottom: 8, width: 2,
        background: railColor, borderRadius: 2,
        transition: 'background 120ms ease',
      }}/>

      {/* icon + optional badge corner-dot (collapsed only) */}
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={item.icon} size={16} strokeWidth={active ? 2 : 1.6}/>
        {item.badge != null && !expanded && (
          <span style={{
            position: 'absolute', top: -2, right: -3,
            width: 6, height: 6, borderRadius: '50%',
            background: C.amber, boxShadow: `0 0 0 2px ${C.surface}`,
          }}/>
        )}
      </span>

      {/* label */}
      <span style={{
        flex: 1, whiteSpace: 'nowrap',
        opacity: expanded ? 1 : 0,
        transform: expanded ? 'translateX(0)' : 'translateX(-4px)',
        transition: 'opacity 160ms ease, transform 200ms ease',
        pointerEvents: expanded ? 'auto' : 'none',
      }}>
        {item.label}
      </span>

      {/* numeric badge (expanded only) */}
      {item.badge != null && (
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: active ? C.amber : C.muted,
          background: active ? C.surface : C.cardHi,
          padding: '1px 6px', borderRadius: 999,
          border: `1px solid ${C.border}`,
          opacity: expanded ? 1 : 0,
          transition: 'opacity 160ms ease',
          pointerEvents: expanded ? 'auto' : 'none',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {item.badge}
        </span>
      )}
    </button>
  )
}

// SectionLabel — fades in/out with sidebar expansion
function SectionLabel({ label, expanded, paddingTop = 0 }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: C.faint,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: `${paddingTop}px 4px 6px`,
      opacity: expanded ? 1 : 0,
      transition: 'opacity 160ms ease',
      height: paddingTop ? 34 : 22,
      overflow: 'hidden',
    }}>
      {label}
    </div>
  )
}

// Sidebar — collapsible left nav (desktop only).
// Props: tabs, aba, setAba, perfil, session, badge, signOut, fleetError, role
export default function Sidebar({ tabs, aba, setAba, perfil, session, badge, signOut, fleetError, role }) {
  const [expanded, setExpanded] = useState(false)

  const workspaceTabs = tabs.filter(t => !['usuarios','configuracoes'].includes(t.id))
  const adminTabs     = tabs.filter(t =>  ['usuarios','configuracoes'].includes(t.id))

  const initials = (perfil?.nome || session?.user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const statusColor = fleetError ? C.red : C.green

  return (
    <nav
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        transition: `width 220ms cubic-bezier(0.4,0,0.2,1)`,
        background: C.surface, borderRight: `1px solid ${C.border}`,
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: expanded
          ? '0 16px 40px -20px rgba(0,0,0,0.4), 4px 0 16px -12px rgba(0,0,0,0.2)'
          : 'none',
      }}
    >
      {/* ── Logo ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: expanded ? '18px 14px' : '18px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
        transition: 'padding 220ms cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: C.blue, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 12, letterSpacing: '-0.5px', flexShrink: 0,
        }}>
          CLV
        </div>
        <div style={{
          opacity: expanded ? 1 : 0,
          transform: expanded ? 'translateX(0)' : 'translateX(-4px)',
          transition: 'opacity 160ms ease, transform 200ms ease',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: -0.5, color: C.text }}>{APP_NAME}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>Estoque · Análise</div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div style={{
        margin: '10px 8px 4px',
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: expanded ? '7px 10px' : '7px 0',
        display: 'flex', alignItems: 'center', justifyContent: expanded ? 'flex-start' : 'center',
        gap: 6, cursor: 'text', overflow: 'hidden',
        transition: 'padding 200ms ease',
        flexShrink: 0,
      }} title={!expanded ? 'Buscar veículo (⌘K)' : undefined}>
        <Icon name="search" size={14} style={{ color: C.faint, flexShrink: 0 }}/>
        <span style={{
          fontSize: 12, color: C.faint, flex: 1,
          opacity: expanded ? 1 : 0, transition: 'opacity 160ms ease',
          whiteSpace: 'nowrap', pointerEvents: expanded ? 'auto' : 'none',
        }}>
          Buscar veículo...
        </span>
        <span style={{
          fontSize: 9, color: C.faint,
          border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 5px',
          opacity: expanded ? 1 : 0, transition: 'opacity 160ms ease',
          pointerEvents: expanded ? 'auto' : 'none', flexShrink: 0,
        }}>
          ⌘K
        </span>
      </div>

      {/* ── Nav items ── */}
      <div style={{ flex: 1, padding: '4px 8px', overflowY: expanded ? 'auto' : 'hidden' }}>
        <SectionLabel label="Workspace" expanded={expanded}/>
        {workspaceTabs.map(t => (
          <NavItem key={t.id} item={t} active={aba === t.id} expanded={expanded} onClick={() => setAba(t.id)}/>
        ))}

        {adminTabs.length > 0 && (
          <>
            <SectionLabel label="Admin" expanded={expanded} paddingTop={14}/>
            {adminTabs.map(t => (
              <NavItem key={t.id} item={t} active={aba === t.id} expanded={expanded} onClick={() => setAba(t.id)}/>
            ))}
          </>
        )}
      </div>

      {/* ── Footer: status + user + logout ── */}
      <div style={{ padding: '8px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        {/* Status + user info (only when expanded) */}
        <div style={{
          opacity: expanded ? 1 : 0,
          transition: 'opacity 160ms ease',
          marginBottom: expanded ? 6 : 0,
          overflow: 'hidden',
          maxHeight: expanded ? 48 : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor, boxShadow: `0 0 5px ${statusColor}`, flexShrink: 0,
            }}/>
            <span style={{ fontSize: 10, color: C.muted, flex: 1 }}>
              {fleetError ? 'Erro' : 'Ao vivo'}
            </span>
            {badge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px',
                borderRadius: 20, background: `${badge.cor}20`, color: badge.cor,
              }}>
                {badge.label}
              </span>
            )}
          </div>
          <div style={{
            fontSize: 11, color: C.muted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {perfil?.nome || session?.user?.email}
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={signOut}
          title={!expanded ? 'Sair' : undefined}
          onMouseEnter={e => { e.currentTarget.style.background = C.cardHi }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          style={{
            width: '100%', background: 'none', border: `1px solid ${C.border}`,
            borderRadius: 7, padding: expanded ? '7px 10px' : '7px 0',
            color: C.muted, fontSize: 12, cursor: 'pointer',
            fontFamily: "'Syne', sans-serif",
            display: 'flex', alignItems: 'center',
            justifyContent: expanded ? 'flex-start' : 'center',
            gap: 7, transition: 'background 150ms, padding 200ms ease',
            overflow: 'hidden',
          }}
        >
          <Icon name="logout" size={14} style={{ flexShrink: 0 }}/>
          <span style={{
            opacity: expanded ? 1 : 0,
            transition: 'opacity 160ms ease',
            whiteSpace: 'nowrap',
          }}>
            Sair
          </span>
        </button>
      </div>
    </nav>
  )
}
