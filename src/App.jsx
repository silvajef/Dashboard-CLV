import { useState } from 'react'
import { useFleetData } from './hooks/useFleetData'
import { useBreakpoint } from './lib/responsive'
import { useAuth } from './hooks/useAuth'
import { LoadingScreen, ErrorBanner } from './components/UI'
import { APP_NAME, APP_VERSION, C } from './lib/constants'
import Veiculos    from './pages/Veiculos'
import Vendidos    from './pages/Vendidos'
import Prestadores from './pages/Prestadores'
import Historico   from './pages/Historico'
import KPIs        from './pages/KPIs'
import Login       from './pages/Login'
import Usuarios    from './pages/Usuarios'

const TABS_BASE = [
  { id:'dashboard',   icon:'📊', label:'KPIs'        },
  { id:'veiculos',    icon:'🚗', label:'Estoque'      },
  { id:'vendidos',    icon:'🏷', label:'Vendidos'     },
  { id:'prestadores', icon:'🔧', label:'Prestadores'  },
  { id:'historico',   icon:'📋', label:'Histórico'    },
]

const TAB_USUARIOS = { id:'usuarios', icon:'👥', label:'Usuários' }

const ROLE_BADGE = {
  admin:        { label:'Admin', cor:'#ef4444' },
  operador:     { label:'Op.',   cor:'#3b82f6' },
  visualizador: { label:'Viz.',  cor:'#64748b' },
}

export default function App() {
  const { session, loading: authLoading, perfil, role, signOut } = useAuth()
  const [aba, setAba] = useState('dashboard')
  const { isMobile, isTablet } = useBreakpoint()

  // 1. Auth ainda verificando → loading
  if (authLoading) return <LoadingScreen />

  // 2. Sem sessão → Login (useFleetData não importa aqui)
  if (!session) return <Login />

  // 3. Autenticado — agora sim carrega os dados
  return <AppAutenticado
    session={session} perfil={perfil} role={role} signOut={signOut}
    aba={aba} setAba={setAba}
    isMobile={isMobile} isTablet={isTablet}
  />
}

// Componente separado para garantir que useFleetData só monta após auth
function AppAutenticado({ session, perfil, role, signOut, aba, setAba, isMobile, isTablet }) {
  const fleet = useFleetData()

  if (fleet.loading) return <LoadingScreen />

  const TABS    = role === 'admin' ? [...TABS_BASE, TAB_USUARIOS] : TABS_BASE
  const abaAtual = TABS.find(t => t.id === aba) ? aba : 'dashboard'
  const badge   = ROLE_BADGE[role] || ROLE_BADGE.visualizador

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text, fontFamily:"'Syne','Segoe UI',sans-serif" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html{-webkit-text-size-adjust:100%}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${C.surface}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        body{background:${C.bg};overscroll-behavior:none}
        input[type=number]{-moz-appearance:textfield}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}
        button{-webkit-tap-highlight-color:transparent}
        select,input,textarea{-webkit-appearance:none}
      `}</style>

      {/* ── NAV DESKTOP / TABLET ── */}
      {!isMobile && (
        <nav style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'0 24px', position:'sticky', top:0, zIndex:100 }}>
          <div style={{ maxWidth:1400, margin:'0 auto', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>

            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, background:C.amber, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🚛</div>
              <div>
                <span style={{ fontWeight:900, fontSize:15, letterSpacing:-0.5 }}>{APP_NAME}</span>
                <span style={{ fontSize:10, color:C.muted, marginLeft:6 }}>v{APP_VERSION}</span>
              </div>
            </div>

            <div style={{ display:'flex', gap:2 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setAba(t.id)} style={{
                  background: abaAtual===t.id ? C.amberDim : 'transparent',
                  color: abaAtual===t.id ? C.amber : C.muted,
                  border: 'none',
                  borderBottom: abaAtual===t.id ? `2px solid ${C.amber}` : '2px solid transparent',
                  padding:'0 16px', height:58, fontSize:13,
                  fontWeight: abaAtual===t.id ? 700 : 400,
                  cursor:'pointer', display:'flex', alignItems:'center', gap:6,
                  fontFamily:"'Syne',sans-serif",
                }}>
                  {t.icon} {!isTablet || TABS.length <= 4 ? t.label : ''}
                </button>
              ))}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:fleet.error?C.red:C.green, boxShadow:`0 0 6px ${fleet.error?C.red:C.green}` }}/>
                <span style={{ fontSize:11, color:C.muted }}>{fleet.error ? 'Erro' : 'Ao vivo'}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, borderLeft:`1px solid ${C.border}`, paddingLeft:12 }}>
                <span style={{ fontSize:11, color:C.muted, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {perfil?.nome || session.user.email}
                </span>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${badge.cor}20`, color:badge.cor }}>
                  {badge.label}
                </span>
                <button onClick={signOut} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'4px 10px', color:C.muted, fontSize:12, cursor:'pointer', fontFamily:"'Syne',sans-serif" }}>
                  Sair
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* ── HEADER MOBILE ── */}
      {isMobile && (
        <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'12px 16px', position:'sticky', top:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, background:C.amber, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🚛</div>
            <span style={{ fontWeight:900, fontSize:14, letterSpacing:-0.5 }}>{APP_NAME}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${badge.cor}20`, color:badge.cor }}>
              {badge.label}
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:fleet.error?C.red:C.green }}/>
              <span style={{ fontSize:10, color:C.muted }}>{fleet.error ? 'Offline' : 'Online'}</span>
            </div>
            <button onClick={signOut} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', padding:2 }}>
              🚪
            </button>
          </div>
        </header>
      )}

      {/* ── MAIN ── */}
      <main style={{ maxWidth:1400, margin:'0 auto', padding: isMobile ? '16px 12px 80px' : '28px 24px' }}>
        {fleet.error && <ErrorBanner message={fleet.error} onRetry={fleet.reload}/>}
        {abaAtual==='dashboard'   && <KPIs        veiculos={fleet.veiculos} metas={fleet.metas} saveMetas={fleet.saveMetas}/>}
        {abaAtual==='veiculos'    && <Veiculos     veiculos={fleet.veiculos} prestadores={fleet.prestadores} saveVeiculo={fleet.saveVeiculo} removeVeiculo={fleet.removeVeiculo} saveServico={fleet.saveServico} removeServico={fleet.removeServico}/>}
        {abaAtual==='vendidos'    && <Vendidos     veiculos={fleet.veiculos}/>}
        {abaAtual==='prestadores' && <Prestadores  prestadores={fleet.prestadores} veiculos={fleet.veiculos} savePrestador={fleet.savePrestador} removePrestador={fleet.removePrestador}/>}
        {abaAtual==='historico'   && <Historico    veiculos={fleet.veiculos} prestadores={fleet.prestadores}/>}
        {abaAtual==='usuarios'    && <Usuarios />}
      </main>

      {/* ── BOTTOM NAV MOBILE ── */}
      {isMobile && (
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:C.surface, borderTop:`1px solid ${C.border}`, display:'flex', zIndex:100, paddingBottom:'env(safe-area-inset-bottom)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setAba(t.id)} style={{
              flex:1, background:'none', border:'none',
              color: abaAtual===t.id ? C.amber : C.muted,
              padding:'10px 4px 8px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              fontFamily:"'Syne',sans-serif",
              borderTop: abaAtual===t.id ? `2px solid ${C.amber}` : '2px solid transparent',
            }}>
              <span style={{ fontSize:18 }}>{t.icon}</span>
              <span style={{ fontSize:9, fontWeight: abaAtual===t.id ? 700 : 400 }}>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
