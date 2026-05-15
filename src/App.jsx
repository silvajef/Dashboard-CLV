import { useState, useRef, useEffect } from 'react'
import { useFleetData } from './hooks/useFleetData'
import { useBreakpoint } from './lib/responsive'
import { useAuth } from './hooks/useAuth'
import { LoadingScreen, ErrorBanner } from './components/UI'
import { APP_NAME, APP_VERSION, C } from './lib/constants'
import Veiculos    from './pages/Veiculos'
import PosVenda    from './pages/PosVenda'
import Prestadores from './pages/Prestadores'
import Historico   from './pages/Historico'
import KPIs        from './pages/KPIs'
import Login       from './pages/Login'
import Usuarios      from './pages/Usuarios'
import Anuncios      from './pages/Anuncios'
import Leads         from './pages/Leads'
import Configuracoes from './pages/Configuracoes'

const TABS_BASE = [
  { id:'dashboard',   icon:'📊', label:'KPIs'        },
  { id:'veiculos',    icon:'🚛', label:'Estoque'      },
  { id:'anuncios',    icon:'📣', label:'Anúncios'     },
  { id:'leads',       icon:'🎯', label:'Leads'        },
  { id:'posvenda',    icon:'🛡', label:'Pós-Venda'    },
  { id:'prestadores', icon:'🔧', label:'Prestadores'  },
  { id:'historico',   icon:'📋', label:'Histórico'    },
]

const TAB_USUARIOS      = { id:'usuarios',      icon:'👥', label:'Usuários'      }
const TAB_CONFIGURACOES = { id:'configuracoes', icon:'⚙️', label:'Config.'       }

const ROLE_BADGE = {
  admin:        { label:'Admin', cor:'#ef4444' },
  operador:     { label:'Op.',   cor:'#3b82f6' },
  visualizador: { label:'Viz.',  cor:'#64748b' },
}

export default function App() {
  const { session, loading: authLoading, perfil, role, signOut } = useAuth()
  const [aba, setAba] = useState('dashboard')
  const { isMobile, isTablet } = useBreakpoint()

  if (authLoading) return <LoadingScreen />
  if (!session)    return <Login />

  return (
    <AppAutenticado
      session={session} perfil={perfil} role={role} signOut={signOut}
      aba={aba} setAba={setAba}
      isMobile={isMobile} isTablet={isTablet}
    />
  )
}

function AppAutenticado({ session, perfil, role, signOut, aba, setAba, isMobile, isTablet }) {
  const fleet = useFleetData()
  const jaCarregou = useRef(false)

  // ── Todos os hooks ANTES de qualquer return condicional ──────────────────
  const [abrirVeiculoId, setAbrirVeiculoId] = useState(null)

  if (!fleet.loading) jaCarregou.current = true
  if (!jaCarregou.current && fleet.loading) return <LoadingScreen />

  // Navegação direta para o processo de um veículo a partir do KPI
  const irParaProcesso = (veiculoId) => {
    setAbrirVeiculoId(veiculoId)
    setAba('veiculos')
  }

  const TABS    = role === 'admin' ? [...TABS_BASE, TAB_USUARIOS, TAB_CONFIGURACOES] : TABS_BASE
  const abaAtual = TABS.find(t => t.id === aba) ? aba : 'dashboard'
  const badge   = ROLE_BADGE[role] || ROLE_BADGE.visualizador

  const sidebarW = isTablet ? 60 : 220

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

      {/* ── SIDEBAR DESKTOP / TABLET ── */}
      {!isMobile && (
        <nav style={{
          width: sidebarW, background:C.surface, borderRight:`1px solid ${C.border}`,
          position:'fixed', top:0, left:0, bottom:0, zIndex:100,
          display:'flex', flexDirection:'column', overflowY:'auto',
        }}>
          {/* Logo */}
          <div style={{ padding: isTablet ? '16px 10px' : '20px 16px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent: isTablet ? 'center' : 'flex-start' }}>
              <div style={{ width:36, height:36, background:C.blue, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff', flexShrink:0, letterSpacing:-0.5 }}>CLV</div>
              {!isTablet && (
                <div>
                  <div style={{ fontWeight:900, fontSize:14, letterSpacing:-0.5 }}>{APP_NAME}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>Estoque · Análise</div>
                </div>
              )}
            </div>
          </div>

          {/* Search (desktop only) */}
          {!isTablet && (
            <div style={{ padding:'10px 12px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', display:'flex', alignItems:'center', gap:6, cursor:'text' }}>
                <span style={{ color:C.faint, fontSize:13 }}>🔍</span>
                <span style={{ color:C.faint, fontSize:12, flex:1 }}>Buscar veículo...</span>
                <span style={{ color:C.faint, fontSize:9, border:`1px solid ${C.border}`, borderRadius:4, padding:'1px 5px' }}>⌘K</span>
              </div>
            </div>
          )}

          {/* Nav items */}
          <div style={{ flex:1, padding: isTablet ? '10px 6px' : '10px 8px', overflowY:'auto' }}>
            {!isTablet && (
              <div style={{ fontSize:10, fontWeight:700, color:C.faint, letterSpacing:'0.1em', textTransform:'uppercase', padding:'0 8px', marginBottom:6 }}>Workspace</div>
            )}
            {TABS.map(t => (
              <button key={t.id} onClick={() => setAba(t.id)}
                title={isTablet ? t.label : undefined}
                onMouseEnter={e => {
                  if (abaAtual !== t.id) e.currentTarget.style.background = C.cardHi
                }}
                onMouseLeave={e => {
                  if (abaAtual !== t.id) e.currentTarget.style.background = 'transparent'
                }}
                style={{
                  width:'100%', background: abaAtual===t.id ? C.amberDim : 'transparent',
                  color: abaAtual===t.id ? C.amber : C.muted,
                  border:'none', borderRadius:8,
                  padding: isTablet ? '10px 0' : '9px 10px',
                  fontSize:13, fontWeight: abaAtual===t.id ? 700 : 400,
                  cursor:'pointer', display:'flex', alignItems:'center',
                  justifyContent: isTablet ? 'center' : 'flex-start',
                  gap:10, marginBottom:2, textAlign:'left',
                  fontFamily:"'Syne',sans-serif", transition:'background 0.15s, color 0.15s',
                }}>
                <span style={{ fontSize:16, flexShrink:0, width: isTablet ? undefined : 20, textAlign:'center' }}>{t.icon}</span>
                {!isTablet && <span style={{ flex:1 }}>{t.label}</span>}
              </button>
            ))}
          </div>

          {/* Rodapé: status + usuário + sair */}
          <div style={{ padding: isTablet ? '10px 6px' : '12px 12px', borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
            {!isTablet && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:fleet.error?C.red:C.green, boxShadow:`0 0 5px ${fleet.error?C.red:C.green}` }}/>
                  <span style={{ fontSize:10, color:C.muted, flex:1 }}>{fleet.error ? 'Erro' : 'Ao vivo'}</span>
                  <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:`${badge.cor}20`, color:badge.cor }}>{badge.label}</span>
                </div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {perfil?.nome || session.user.email}
                </div>
              </>
            )}
            <button onClick={signOut}
              title={isTablet ? 'Sair' : undefined}
              onMouseEnter={e => { e.currentTarget.style.background = C.cardHi }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              style={{
                width:'100%', background:'none', border:`1px solid ${C.border}`,
                borderRadius:7, padding: isTablet ? '8px 0' : '6px 10px',
                color:C.muted, fontSize:12, cursor:'pointer',
                fontFamily:"'Syne',sans-serif", display:'flex',
                alignItems:'center', justifyContent:'center', gap:6,
                transition:'background 0.15s',
              }}>
              <span>🚪</span>{!isTablet && 'Sair'}
            </button>
          </div>
        </nav>
      )}

      {/* ── HEADER MOBILE ── */}
      {isMobile && (
        <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'12px 16px', position:'sticky', top:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, background:C.blue, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff' }}>CLV</div>
            <span style={{ fontWeight:900, fontSize:14, letterSpacing:-0.5 }}>{APP_NAME}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${badge.cor}20`, color:badge.cor }}>{badge.label}</span>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:fleet.error?C.red:C.green }}/>
              <span style={{ fontSize:10, color:C.muted }}>{fleet.error ? 'Offline' : 'Online'}</span>
            </div>
            <button onClick={signOut} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', padding:2 }}>🚪</button>
          </div>
        </header>
      )}

      {/* ── MAIN ── */}
      <main style={{ marginLeft: isMobile ? 0 : sidebarW, padding: isMobile ? '16px 12px 80px' : '28px 24px', minHeight:'100vh' }}>
        {fleet.error && <ErrorBanner message={fleet.error} onRetry={fleet.reload}/>}

        {abaAtual==='dashboard'   && <KPIs        veiculos={fleet.veiculos} metas={fleet.metas} saveMetas={fleet.saveMetas} processos={fleet.processos} onVerProcesso={irParaProcesso}/>}
        {abaAtual==='veiculos'    && <Veiculos     veiculos={fleet.veiculos} prestadores={fleet.prestadores} processos={fleet.processos}
                                                   saveVeiculo={fleet.saveVeiculo} removeVeiculo={fleet.removeVeiculo}
                                                   saveServico={fleet.saveServico} removeServico={fleet.removeServico}
                                                   saveProcesso={fleet.saveProcesso} concluirProcesso={fleet.concluirProcesso} cancelarProcesso={fleet.cancelarProcesso}
                                                   abrirVeiculoId={abrirVeiculoId} onAbrirVeiculoHandled={() => setAbrirVeiculoId(null)}/>}
        {abaAtual==='anuncios'    && <Anuncios     veiculos={fleet.veiculos}/>}
        {abaAtual==='leads'       && <Leads        veiculos={fleet.veiculos}/>}
        {abaAtual==='posvenda'    && <PosVenda     veiculos={fleet.veiculos} clientes={fleet.clientes} vendasRelacao={fleet.vendasRelacao}/>}
        {abaAtual==='prestadores' && <Prestadores  prestadores={fleet.prestadores} veiculos={fleet.veiculos} savePrestador={fleet.savePrestador} removePrestador={fleet.removePrestador}/>}
        {abaAtual==='historico'   && <Historico    veiculos={fleet.veiculos} prestadores={fleet.prestadores}/>}
        {abaAtual==='usuarios'      && <Usuarios />}
        {abaAtual==='configuracoes' && <Configuracoes />}
      </main>

      {/* ── BOTTOM NAV MOBILE ── */}
      {isMobile && (
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:C.surface, borderTop:`1px solid ${C.border}`, display:'flex', zIndex:100, paddingBottom:'env(safe-area-inset-bottom)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setAba(t.id)}
              style={{
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
