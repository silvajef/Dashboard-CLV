import { useState, useRef, useEffect, useMemo } from 'react'
import { useFleetData } from './hooks/useFleetData'
import { useBreakpoint } from './lib/responsive'
import { useAuth } from './hooks/useAuth'
import { LoadingScreen, ErrorBanner } from './components/UI'
import Sidebar from './components/Sidebar'
import Icon from './components/Icon'
import { APP_NAME, APP_VERSION, C, FONTS } from './lib/constants'
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
import CommandPalette from './components/CommandPalette'

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

  const TABS    = role === 'admin' ? [...TABS_BASE, TAB_USUARIOS, TAB_CONFIGURACOES] : TABS_BASE

  // useMemo deve ficar ANTES de qualquer return condicional (Rules of Hooks)
  const commands = useMemo(() => {
    const cmds = []
    TABS.forEach(t => cmds.push({
      id: 'go-' + t.id, icon: t.icon,
      label: 'Ir para ' + t.label,
      section: 'Navegação',
      action: () => setAba(t.id),
    }))
    fleet.veiculos.forEach(v => cmds.push({
      id: 'v-' + v.id, icon: 'truck',
      label: `${v.marca_nome || ''} ${v.modelo_nome || v.modelo || ''}`.trim(),
      hint: `${v.placa || ''} · ${v.tipo || ''}`,
      section: 'Veículos',
      action: () => { setAba('veiculos'); setAbrirVeiculoId(v.id) },
    }))
    return cmds
  }, [fleet.veiculos, aba, role, setAba])

  if (!fleet.loading) jaCarregou.current = true
  if (!jaCarregou.current && fleet.loading) return <LoadingScreen />

  // Navegação direta para o processo de um veículo a partir do KPI
  const irParaProcesso = (veiculoId) => {
    setAbrirVeiculoId(veiculoId)
    setAba('veiculos')
  }

  const abaAtual = TABS.find(t => t.id === aba) ? aba : 'dashboard'
  const badge   = ROLE_BADGE[role] || ROLE_BADGE.visualizador
  const SIDEBAR_COLLAPSED = 60

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text, fontFamily: FONTS.body }}>
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
        @keyframes clvShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes clvFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes clvSlideDown{from{transform:translateY(-12px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes clvSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
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

      <CommandPalette commands={commands}/>

      {/* ── BOTTOM NAV MOBILE ── */}
      {isMobile && <MobileBottomNav tabs={TABS} aba={abaAtual} setAba={setAba}/>}
    </div>
  )
}

const PRIMARY_IDS = ['dashboard', 'veiculos', 'anuncios', 'leads']

function MobileBottomNav({ tabs, aba, setAba }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const primary = tabs.filter(t => PRIMARY_IDS.includes(t.id))
  const more    = tabs.filter(t => !PRIMARY_IDS.includes(t.id))

  const navAba = (id) => { setAba(id); setDrawerOpen(false) }

  return (
    <>
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:99,
            animation:'clvFadeIn 200ms ease',
          }}/>
          <div style={{
            position:'fixed', left:0, right:0, bottom:56, zIndex:100,
            background:C.surface, borderTop:`1px solid ${C.border}`,
            borderRadius:'14px 14px 0 0', padding:16,
            boxShadow:'0 -8px 24px rgba(0,0,0,0.3)',
            paddingBottom:'calc(16px + env(safe-area-inset-bottom))',
            animation:'clvSlideUp 240ms cubic-bezier(0.4,0,0.2,1)',
          }}>
            <div style={{ width:36, height:4, background:C.border, borderRadius:2, margin:'0 auto 14px' }}/>
            <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:10, fontFamily: FONTS.body }}>Mais</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
              {more.map(item => {
                const isActive = aba === item.id
                return (
                  <button key={item.id} onClick={() => navAba(item.id)} style={{
                    background: isActive ? C.blueDim : C.card,
                    border:'none', borderRadius:10, padding:'12px 8px',
                    cursor:'pointer', display:'flex', flexDirection:'column',
                    alignItems:'center', gap:6,
                    color: isActive ? C.blue : C.muted,
                    fontFamily: FONTS.body,
                  }}>
                    <Icon name={item.icon} size={18} strokeWidth={isActive ? 2 : 1.6}/>
                    <span style={{ fontSize:10, fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      <nav style={{
        position:'fixed', bottom:0, left:0, right:0,
        background:C.surface, borderTop:`1px solid ${C.border}`,
        display:'flex', zIndex:100,
        paddingBottom:'env(safe-area-inset-bottom)',
      }}>
        {primary.map(t => {
          const isActive = aba === t.id
          return (
            <button key={t.id} onClick={() => navAba(t.id)} style={{
              flex:1, background:'none', border:'none',
              color: isActive ? C.blue : C.muted,
              padding:'10px 4px 8px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              fontFamily: FONTS.body,
              borderTop: isActive ? `2px solid ${C.blue}` : '2px solid transparent',
            }}>
              <Icon name={t.icon} size={18} strokeWidth={isActive ? 2 : 1.6}/>
              <span style={{ fontSize:9, fontWeight: isActive ? 700 : 400 }}>{t.label}</span>
            </button>
          )
        })}
        {more.length > 0 && (
          <button onClick={() => setDrawerOpen(o => !o)} style={{
            flex:1, background:'none', border:'none',
            color: drawerOpen ? C.blue : C.muted,
            padding:'10px 4px 8px', cursor:'pointer',
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            fontFamily: FONTS.body,
            borderTop: drawerOpen ? `2px solid ${C.blue}` : '2px solid transparent',
          }}>
            <Icon name={drawerOpen ? 'x' : 'list'} size={18} strokeWidth={drawerOpen ? 2 : 1.6}/>
            <span style={{ fontSize:9, fontWeight: drawerOpen ? 700 : 400 }}>{drawerOpen ? 'Fechar' : 'Mais'}</span>
          </button>
        )}
      </nav>
    </>
  )
}
