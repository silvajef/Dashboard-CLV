import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import KPIs from './pages/KPIs'
import Veiculos from './pages/Veiculos'
import Vendidos from './pages/Vendidos'
import Prestadores from './pages/Prestadores'
import Historico from './pages/Historico'
import Usuarios from './pages/Usuarios'
import { useFleetData } from './hooks/useFleetData'
import { useBreakpoint } from './lib/responsive'

// ─── Itens de navegação ───────────────────────────────────────────────────────
// A página "Usuários" só aparece na nav se o role for admin
const NAV_BASE = [
  { id: 'kpis',        label: 'Dashboard',   icon: '📊', roles: ['admin','operador','visualizador'] },
  { id: 'veiculos',    label: 'Estoque',      icon: '🚛', roles: ['admin','operador','visualizador'] },
  { id: 'vendidos',    label: 'Vendidos',     icon: '✅', roles: ['admin','operador','visualizador'] },
  { id: 'prestadores', label: 'Prestadores',  icon: '🔧', roles: ['admin','operador','visualizador'] },
  { id: 'historico',   label: 'Histórico',    icon: '📋', roles: ['admin','operador','visualizador'] },
  { id: 'usuarios',    label: 'Usuários',     icon: '👥', roles: ['admin'] },
]

const C = {
  bg:      '#0f1117',
  surface: '#1a1d27',
  border:  '#2a2d3a',
  accent:  '#3b82f6',
  text:    '#e2e8f0',
  muted:   '#64748b',
  nav:     '#13161f',
  danger:  '#ef4444',
}

const ROLE_BADGE = {
  admin:        { label: 'Admin',  cor: C.danger  },
  operador:     { label: 'Op.',    cor: C.accent   },
  visualizador: { label: 'Viz.',   cor: C.muted    },
}

export default function App() {
  const { session, loading, perfil, role, signOut } = useAuth()
  const [pagina, setPagina] = useState('kpis')
  const bp = useBreakpoint()
  const fleet = useFleetData(!!session)

  // ── Aguardando verificação de sessão ─────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: C.muted, fontSize: 14, fontFamily: "'Syne', sans-serif" }}>
          Carregando...
        </span>
      </div>
    )
  }

  // ── Sem sessão → Login ────────────────────────────────────────────────────
  if (!session) return <Login />

  // ── Itens de nav visíveis para o role atual ───────────────────────────────
  const navItems = NAV_BASE.filter(item => item.roles.includes(role))

  // Garante que a página atual seja visível para o role
  const paginaAtual = navItems.find(i => i.id === pagina) ? pagina : navItems[0]?.id || 'kpis'

  const fleetProps = { data: fleet.data, actions: fleet.actions, loading: fleet.loading }

  function renderPagina() {
    switch (paginaAtual) {
      case 'kpis':        return <KPIs        {...fleetProps} />
      case 'veiculos':    return <Veiculos    {...fleetProps} />
      case 'vendidos':    return <Vendidos    {...fleetProps} />
      case 'prestadores': return <Prestadores {...fleetProps} />
      case 'historico':   return <Historico   {...fleetProps} />
      case 'usuarios':    return <Usuarios />
      default:            return <KPIs        {...fleetProps} />
    }
  }

  const badgeRole = ROLE_BADGE[role] || ROLE_BADGE.visualizador
  const isDesktop = bp === 'desktop'
  const isMobile  = bp === 'mobile'

  // ── Layout Desktop/Tablet ─────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: C.bg,
        fontFamily: "'Syne', sans-serif" }}>

        {/* Sidebar */}
        <aside style={s.sidebar}>
          <div style={s.sidebarLogo}>
            <span style={{ fontSize: 22 }}>🚛</span>
            {isDesktop && <span style={s.logoText}>CLV</span>}
          </div>

          <nav style={s.sidebarNav}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setPagina(item.id)}
                style={paginaAtual === item.id ? {...s.navItem, ...s.navItemAtivo} : s.navItem}
                title={!isDesktop ? item.label : undefined}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {isDesktop && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          <div style={s.sidebarFooter}>
            {isDesktop && (
              <>
                <p style={s.perfilNome}>{perfil?.nome || session.user.email}</p>
                <span style={{ ...s.badgeRole, background: `${badgeRole.cor}20`, color: badgeRole.cor }}>
                  {badgeRole.label}
                </span>
              </>
            )}
            <button onClick={signOut} style={s.btnLogout} title="Sair">
              <span>🚪</span>
              {isDesktop && <span>Sair</span>}
            </button>
          </div>
        </aside>

        {/* Conteúdo */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          {renderPagina()}
        </main>
      </div>
    )
  }

  // ── Layout Mobile ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: C.bg, fontFamily: "'Syne', sans-serif" }}>

      <header style={s.mobileHeader}>
        <span style={{ fontSize: 18 }}>🚛</span>
        <span style={s.mobileTitulo}>
          {navItems.find(i => i.id === paginaAtual)?.label || 'CLV'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...s.badgeRole, background: `${badgeRole.cor}20`, color: badgeRole.cor, fontSize: 10 }}>
            {badgeRole.label}
          </span>
          <button onClick={signOut} style={{ background: 'none', border: 'none',
            fontSize: 18, cursor: 'pointer', padding: 4 }} title="Sair">
            🚪
          </button>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'auto', paddingBottom: 66 }}>
        {renderPagina()}
      </main>

      <nav style={s.bottomNav}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setPagina(item.id)}
            style={paginaAtual === item.id
              ? {...s.bottomItem, ...s.bottomItemAtivo}
              : s.bottomItem}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.03em' }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  sidebar: {
    width: 220, minWidth: 220,
    background: C.nav, borderRight: `1px solid ${C.border}`,
    display: 'flex', flexDirection: 'column',
    padding: '20px 0', position: 'sticky', top: 0, height: '100vh',
  },
  sidebarLogo: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 20px 24px', borderBottom: `1px solid ${C.border}`, marginBottom: 16,
  },
  logoText: { fontWeight: 800, fontSize: 20, color: C.text, letterSpacing: '0.05em' },
  sidebarNav: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8,
    border: 'none', background: 'transparent',
    color: C.muted, fontSize: 13, fontWeight: 500,
    fontFamily: "'Syne', sans-serif", cursor: 'pointer',
    textAlign: 'left', width: '100%', transition: 'all 0.15s',
  },
  navItemAtivo: { background: `${C.accent}15`, color: C.accent, fontWeight: 700 },
  sidebarFooter: {
    padding: '14px 12px 0', borderTop: `1px solid ${C.border}`, marginTop: 8,
  },
  perfilNome: {
    fontSize: 12, color: C.text, fontWeight: 600,
    margin: '0 0 4px 4px', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
  },
  badgeRole: {
    fontSize: 10, fontWeight: 800, padding: '2px 8px',
    borderRadius: 20, marginLeft: 4, letterSpacing: '0.05em',
  },
  btnLogout: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', marginTop: 10, borderRadius: 8,
    border: 'none', background: 'transparent', color: C.muted,
    fontSize: 13, fontFamily: "'Syne', sans-serif", cursor: 'pointer', width: '100%',
  },

  // Mobile
  mobileHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: C.nav,
    borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 100,
  },
  mobileTitulo: { fontWeight: 700, fontSize: 16, color: C.text },
  bottomNav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    display: 'flex', background: C.nav,
    borderTop: `1px solid ${C.border}`, zIndex: 100,
  },
  bottomItem: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '8px 4px', border: 'none', background: 'transparent',
    color: C.muted, cursor: 'pointer', fontFamily: "'Syne', sans-serif",
  },
  bottomItemAtivo: { color: C.accent },
}
