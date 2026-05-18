import { useState, useRef, useEffect } from 'react'
import { useFleetData } from './hooks/useFleetData'
import { useBreakpoint } from './lib/responsive'
import { useAuth } from './hooks/useAuth'
import { LoadingScreen, ErrorBanner } from './components/UI'
import Sidebar from './components/Sidebar'
import Icon from './components/Icon'
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
  { id:'dashboard',   icon:'dashboard',  label:'KPIs'        },
  { id:'veiculos',    icon:'truck',      label:'Estoque'      },
  { id:'anuncios',    icon:'megaphone',  label:'Anúncios'     },
  { id:'leads',       icon:'target',     label:'Leads'        },
  { id:'posvenda',    icon:'shield',     label:'Pós-Venda'    },
  { id:'prestadores', icon:'tools',      label:'Prestadores'  },
  { id:'historico',   icon:'list',       label:'Histórico'    },
]

const TAB_USUARIOS      = { id:'usuarios',      icon:'users',    label:'Usuários'      }
const TAB_CONFIGURACOES = { id:'configuracoes', icon:'settings', label:'Config.'       }

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
  // Sidebar uses fixed 60px — overlays content when expanded
  const SIDEBAR_COLLAPSED = 60

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
        <Sidebar
          tabs={TABS} aba={abaAtual} setAba={setAba}
          perfil={perfil} session={session} badge={badge}
          signOut={signOut} fleetError={!!fleet.error} role={role}
        />
      )}

      {/* ── HEADER MOBILE ── */}
      {isMobile && (
        <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'12px 16px', position:'sticky', top:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, background:C.blue, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' }}>CLV</div>
            <span style={{ fontWeight:700, fontSize:14, letterSpacing:-0.5 }}>{APP_NAME}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${badge.cor}20`, color:badge.cor }}>{badge.label}</span>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:fleet.error?C.red:C.green }}/>
              <span style={{ fontSize:10, color:C.muted }}>{fleet.error ? 'Offline' : 'Online'}</span>
            </div>
            <button onClick={signOut} style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:C.muted, display:'flex', alignItems:'center' }}>
              <Icon name="logout" size={18}/>
            </button>
          </div>
        </header>
      )}

      {/* ── MAIN — margem fixa de 60px (sidebar sobrepõe ao expandir) ── */}
      <main style={{ marginLeft: isMobile ? 0 : SIDEBAR_COLLAPSED, padding: isMobile ? '16px 12px 80px' : '28px 24px', minHeight:'100vh' }}>
        {fleet.error && <ErrorBanner message={fleet.error} onRetry={fleet.reload}/>}

        {abaAtual==='dashboard'   && <KPIs        veiculos={fleet.veiculos} metas={fleet.metas} saveMetas={fleet.saveMetas} processos={fleet.processos} onVerProcesso={irParaProcesso}/>}
        {abaAtual==='veiculos'    && <Veiculos     veiculos={fleet.veiculos} prestadores={fleet.prestadores} processos={fleet.processos}
                                                   saveVeiculo={fleet.saveVeiculo} removeVeiculo={fleet.removeVeiculo}
                                                   saveServico={fleet.saveServico} removeServico={fleet.removeServico}
                                                   saveProcesso={fleet.saveProcesso} concluirProcesso={fleet.concluirProcesso} cancelarProcesso={fleet.cancelarProcesso}
                                                   abrirVeiculoId={abrirVeiculoId} onAbrirVeiculoHandled={() => setAbrirVeiculoId(null)}/>}
        {abaAtual==='anuncios'    && <Anuncios     veiculos={fleet.veiculos}/>}
        {abaAtual==='leads'       && <Leads        veiculos={fleet.veiculos}/>}
        {abaAtual==='posvenda'    && <PosVenda     veiculos={fleet.veiculos} clientes={fleet.clientes} vendasRelacao={fleet.vendasRelacao}
                                                   saveVendaRelacao={fleet.saveVendaRelacao} saveCliente={fleet.saveCliente} removeCliente={fleet.removeCliente}
                                                   saveServico={fleet.saveServico} removeServico={fleet.removeServico} prestadores={fleet.prestadores}/>}
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
                color: abaAtual===t.id ? C.blue : C.muted,
                padding:'10px 4px 8px', cursor:'pointer',
                display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                fontFamily:"'Syne',sans-serif",
                borderTop: abaAtual===t.id ? `2px solid ${C.blue}` : '2px solid transparent',
              }}>
              <Icon name={t.icon} size={18} strokeWidth={abaAtual===t.id ? 2 : 1.6}/>
              <span style={{ fontSize:9, fontWeight: abaAtual===t.id ? 700 : 400 }}>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
