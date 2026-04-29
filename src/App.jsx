import { useState } from 'react'
import { useFleetData } from './hooks/useFleetData'
import { useBreakpoint } from './lib/responsive'
import { LoadingScreen, ErrorBanner } from './components/UI'
import { APP_NAME, APP_VERSION, C } from './lib/constants'
import Veiculos    from './pages/Veiculos'
import Vendidos    from './pages/Vendidos'
import Prestadores from './pages/Prestadores'
import Historico   from './pages/Historico'
import KPIs        from './pages/KPIs'

const TABS = [
  { id:'dashboard',   icon:'📊', label:'KPIs'         },
  { id:'veiculos',    icon:'🚗', label:'Estoque'       },
  { id:'vendidos',    icon:'🏷', label:'Vendidos'      },
  { id:'prestadores', icon:'🔧', label:'Prestadores'   },
  { id:'historico',   icon:'📋', label:'Histórico'     },
]

export default function App() {
  const [aba, setAba] = useState('dashboard')
  const fleet = useFleetData()
  const { isMobile, isTablet } = useBreakpoint()

  if (fleet.loading) return <LoadingScreen/>

  const compact = isMobile || isTablet

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
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setAba(t.id)} style={{ background:aba===t.id?C.amberDim:'transparent', color:aba===t.id?C.amber:C.muted, border:'none', borderBottom:aba===t.id?`2px solid ${C.amber}`:'2px solid transparent', padding:'0 16px', height:58, fontSize:13, fontWeight:aba===t.id?700:400, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:"'Syne',sans-serif" }}>
                  {t.icon} {!isTablet || TABS.length<=4 ? t.label : ''}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:fleet.error?C.red:C.green, boxShadow:`0 0 6px ${fleet.error?C.red:C.green}` }}/>
              <span style={{ fontSize:11, color:C.muted }}>{fleet.error?'Erro':'Ao vivo'}</span>
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
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:fleet.error?C.red:C.green }}/>
            <span style={{ fontSize:10, color:C.muted }}>{fleet.error?'Offline':'Online'}</span>
          </div>
        </header>
      )}

      {/* ── MAIN ── */}
      <main style={{ maxWidth:1400, margin:'0 auto', padding: isMobile ? '16px 12px 80px' : '28px 24px' }}>
        {fleet.error && <ErrorBanner message={fleet.error} onRetry={fleet.reload}/>}
        {aba==='dashboard'   && <KPIs        veiculos={fleet.veiculos} metas={fleet.metas} saveMetas={fleet.saveMetas}/>}
        {aba==='veiculos'    && <Veiculos     veiculos={fleet.veiculos} prestadores={fleet.prestadores} saveVeiculo={fleet.saveVeiculo} removeVeiculo={fleet.removeVeiculo} saveServico={fleet.saveServico} removeServico={fleet.removeServico}/>}
        {aba==='vendidos'    && <Vendidos     veiculos={fleet.veiculos}/>}
        {aba==='prestadores' && <Prestadores  prestadores={fleet.prestadores} veiculos={fleet.veiculos} savePrestador={fleet.savePrestador} removePrestador={fleet.removePrestador}/>}
        {aba==='historico'   && <Historico    veiculos={fleet.veiculos} prestadores={fleet.prestadores}/>}
      </main>

      {/* ── BOTTOM NAV MOBILE ── */}
      {isMobile && (
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:C.surface, borderTop:`1px solid ${C.border}`, display:'flex', zIndex:100, paddingBottom:'env(safe-area-inset-bottom)' }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setAba(t.id)} style={{ flex:1, background:'none', border:'none', color:aba===t.id?C.amber:C.muted, padding:'10px 4px 8px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, fontFamily:"'Syne',sans-serif", borderTop:aba===t.id?`2px solid ${C.amber}`:'2px solid transparent' }}>
              <span style={{ fontSize:18 }}>{t.icon}</span>
              <span style={{ fontSize:9, fontWeight:aba===t.id?700:400 }}>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
