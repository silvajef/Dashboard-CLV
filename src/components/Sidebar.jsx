// src/components/Sidebar.jsx — drop-in corrigido
// Resolve 4 bugs identificados na implementação atual:
//   1. ícones sumindo na sidebar colapsada (label flex:1 empurrava o ícone)
//   2. título "Dashboard CLV" estourando (fontWeight 900 não existe em Syne; reduz para 700/13px)
//   3. accent laranja → azul (troca C.amber por C.blue em todos os estados active/badge)
//   4. avatar do usuário ausente — adiciona widget circular sempre visível
//
// Mantém TUDO mais: props, comportamento expand/collapse on hover, ícones, search, footer.

import { useState } from 'react'
import { APP_NAME, C } from '../lib/constants'
import Icon from './Icon'

const COLLAPSED_W = 60
const EXPANDED_W  = 220

// ─── NavItem ───────────────────────────────────────────────────────────────
// Per-item hover state, accent rail à esquerda, badge corner-dot no colapsado.
// FIX bug 1: label vira flex:0 + width:0 quando colapsada → ícone fica centralizado.
function NavItem({ item, active, expanded, onClick }) {
  const [hover, setHover] = useState(false)

  // C.blue (azul) substitui C.amber (laranja) — FIX bug 3
  const bg        = active ? C.blueDim : hover ? C.cardHi  : 'transparent'
  const color     = active ? C.blue    : hover ? C.text    : C.muted
  const railColor = active ? C.blue    : hover ? C.borderHi : 'transparent'

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
        padding: expanded ? '9px 10px 9px 14px' : 0,
        fontSize: 13, fontFamily: "'Syne', sans-serif",
        fontWeight: active ? 700 : 400,
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center',
        justifyContent: expanded ? 'flex-start' : 'center',
        gap: expanded ? 10 : 0,
        height: 36, marginBottom: 2,
        transition: 'background 120ms ease, color 120ms ease, padding 200ms ease, gap 200ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Trilho lateral esquerdo (active/hover indicator) */}
      <span style={{
        position: 'absolute', left: 0, top: 8, bottom: 8, width: 2,
        background: railColor, borderRadius: 2,
        transition: 'background 120ms ease',
      }}/>

      {/* ÍCONE — wrapper com tamanho fixo garante centro perfeito */}
      <span style={{
        position: 'relative',
        width: 24, height: 24,                  // FIX bug 1: tamanho fixo
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        color,
      }}>
        <Icon name={item.icon} size={16} strokeWidth={active ? 2 : 1.6}/>
        {/* Badge como dot quando colapsada */}
        {item.badge != null && !expanded && (
          <span style={{
            position: 'absolute', top: -2, right: -3,
            width: 6, height: 6, borderRadius: '50%',
            background: C.blue, boxShadow: `0 0 0 2px ${C.surface}`,
          }}/>
        )}
      </span>

      {/* LABEL — FIX bug 1: flex:0 + width:0 quando colapsada → não ocupa espaço */}
      <span style={{
        flex: expanded ? 1 : 0,                 // <-- antes era flex:1 sempre
        width: expanded ? 'auto' : 0,           // <-- e width 0 zera totalmente
        whiteSpace: 'nowrap',
        opacity: expanded ? 1 : 0,
        transform: expanded ? 'translateX(0)' : 'translateX(-4px)',
        transition: 'opacity 160ms ease, transform 200ms ease, flex 200ms ease, width 200ms ease',
        pointerEvents: expanded ? 'auto' : 'none',
        overflow: 'hidden',
      }}>
        {item.label}
      </span>

      {/* Badge numérico — só quando expandida */}
      {item.badge != null && (
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: active ? C.blue : C.muted,
          background: active ? C.surface : C.cardHi,
          padding: '1px 6px', borderRadius: 999,
          border: `1px solid ${C.border}`,
          opacity: expanded ? 1 : 0,
          width: expanded ? 'auto' : 0,
          overflow: 'hidden',
          transition: 'opacity 160ms ease, width 200ms ease',
          pointerEvents: expanded ? 'auto' : 'none',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {item.badge}
        </span>
      )}
    </button>
  )
}

// ─── SectionLabel ─────────────────────────────────────────────────────────
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

// ─── Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ tabs, aba, setAba, perfil, session, badge, signOut, fleetError, role }) {
  const [expanded, setExpanded] = useState(false)

  const workspaceTabs = tabs.filter(t => !['usuarios','configuracoes'].includes(t.id))
  const adminTabs     = tabs.filter(t =>  ['usuarios','configuracoes'].includes(t.id))

  const userName = perfil?.nome || session?.user?.email?.split('@')[0] || 'Usuário'
  const initials = userName.split(/[\s.@]/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U'

  const statusColor = fleetError ? C.red : C.green

  return (
    <nav
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
        background: C.surface, borderRight: `1px solid ${C.border}`,
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: expanded
          ? '0 16px 40px -20px rgba(0,0,0,0.4), 4px 0 16px -12px rgba(0,0,0,0.2)'
          : 'none',
        fontFamily: "'Syne', sans-serif",
      }}
    >
      {/* ── Logo ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: expanded ? 10 : 0,
        padding: expanded ? '18px 14px' : '18px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
        transition: 'padding 220ms cubic-bezier(0.4,0,0.2,1), gap 220ms ease',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: C.blue, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 12, letterSpacing: '-0.5px', flexShrink: 0,
          // FIX bug 2 (parcial): 800 em vez de 900 → Syne tem 800 nativo
        }}>
          CLV
        </div>
        <div style={{
          opacity: expanded ? 1 : 0,
          transform: expanded ? 'translateX(0)' : 'translateX(-4px)',
          transition: 'opacity 160ms ease, transform 200ms ease',
          whiteSpace: 'nowrap',
          minWidth: 0, overflow: 'hidden',
          flex: expanded ? 1 : 0,
          width: expanded ? 'auto' : 0,
        }}>
          {/* FIX bug 2: fontSize 13 + weight 700 cabe em ~134px disponíveis */}
          <div style={{
            fontWeight: 700, fontSize: 13, letterSpacing: -0.3,
            color: C.text, lineHeight: 1.1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {APP_NAME}
          </div>
          <div style={{
            fontSize: 10, color: C.muted, marginTop: 2, fontWeight: 400,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            Estoque · Análise
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('clv:palette'))}
        style={{
          margin: expanded ? '10px 8px 4px' : '10px 6px 4px',
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: expanded ? '7px 10px' : 0,
          height: 32,
          display: 'flex', alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          gap: expanded ? 6 : 0, cursor: 'pointer', overflow: 'hidden',
          transition: 'padding 200ms ease, margin 200ms ease, gap 200ms ease',
          flexShrink: 0, width: expanded ? 'calc(100% - 16px)' : 'calc(100% - 12px)',
          fontFamily: "'Syne', sans-serif",
        }}
        title={!expanded ? 'Buscar tudo (⌘K)' : undefined}>
        <span style={{
          width: 24, height: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.faint, flexShrink: 0,
        }}>
          <Icon name="search" size={14}/>
        </span>
        <span style={{
          fontSize: 12, color: C.faint,
          flex: expanded ? 1 : 0, width: expanded ? 'auto' : 0,
          opacity: expanded ? 1 : 0, transition: 'opacity 160ms ease, flex 200ms ease, width 200ms ease',
          whiteSpace: 'nowrap', overflow: 'hidden',
          pointerEvents: expanded ? 'auto' : 'none',
        }}>
          Buscar veículo...
        </span>
        <span style={{
          fontSize: 9, color: C.faint, fontFamily: "'JetBrains Mono', monospace",
          border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 5px',
          opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0, overflow: 'hidden',
          transition: 'opacity 160ms ease, width 200ms ease',
          pointerEvents: expanded ? 'auto' : 'none', flexShrink: 0,
        }}>
          ⌘K
        </span>
      </button>

      {/* ── Nav ── */}
      <div style={{
        flex: 1,
        padding: expanded ? '4px 8px' : '4px 6px',
        overflowY: expanded ? 'auto' : 'hidden',
        overflowX: 'hidden',
        transition: 'padding 200ms ease',
      }}>
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

      {/* ── Footer: AVATAR (sempre visível) + info expandida + logout ── */}
      <div style={{
        padding: expanded ? '10px 8px' : '10px 6px',
        borderTop: `1px solid ${C.border}`,
        flexShrink: 0,
        transition: 'padding 200ms ease',
      }}>
        {/* FIX bug 4: AVATAR em widget — círculo com iniciais SEMPRE visível */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: expanded ? 10 : 0,
          padding: expanded ? 6 : 0,
          background: expanded ? C.card : 'transparent',
          border: `1px solid ${expanded ? C.border : 'transparent'}`,
          borderRadius: 10,
          justifyContent: expanded ? 'flex-start' : 'center',
          marginBottom: 6,
          transition: 'padding 200ms ease, background 200ms ease, border-color 200ms ease, gap 200ms ease',
          overflow: 'hidden',
        }}>
          {/* Avatar — sempre */}
          <div style={{
            position: 'relative', flexShrink: 0,
            width: 32, height: 32, borderRadius: '50%',
            background: C.blue, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>
            {initials}
            <span style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 9, height: 9, borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 0 2px ${C.surface}`,
            }}/>
          </div>

          {/* Info textual — só expandida */}
          <div style={{
            flex: expanded ? 1 : 0, width: expanded ? 'auto' : 0,
            minWidth: 0,
            opacity: expanded ? 1 : 0,
            transition: 'opacity 160ms ease, flex 200ms ease, width 200ms ease',
            pointerEvents: expanded ? 'auto' : 'none',
            overflow: 'hidden',
          }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: C.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {userName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <span style={{
                fontSize: 9, color: C.muted, whiteSpace: 'nowrap',
              }}>
                {fleetError ? 'Erro · ' : 'Ao vivo · '}
              </span>
              {badge && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 4, background: `${badge.cor}20`, color: badge.cor,
                }}>
                  {badge.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={signOut}
          title={!expanded ? 'Sair' : undefined}
          onMouseEnter={e => { e.currentTarget.style.background = C.cardHi }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          style={{
            width: '100%', background: 'transparent',
            border: `1px solid ${C.border}`, borderRadius: 7,
            padding: expanded ? '7px 10px' : 0,
            height: expanded ? 'auto' : 32,
            color: C.muted, fontSize: 12, cursor: 'pointer',
            fontFamily: "'Syne', sans-serif",
            display: 'flex', alignItems: 'center',
            justifyContent: expanded ? 'flex-start' : 'center',
            gap: expanded ? 7 : 0,
            transition: 'background 150ms, padding 200ms ease, gap 200ms ease',
            overflow: 'hidden',
          }}
        >
          <span style={{
            width: 24, height: 24, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="logout" size={14}/>
          </span>
          <span style={{
            flex: expanded ? 1 : 0, width: expanded ? 'auto' : 0,
            textAlign: 'left',
            opacity: expanded ? 1 : 0,
            transition: 'opacity 160ms ease, width 200ms ease',
            whiteSpace: 'nowrap', overflow: 'hidden',
          }}>
            Sair
          </span>
        </button>
      </div>
    </nav>
  )
}
