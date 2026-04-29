import { useState } from 'react'
import { useFleetData } from './hooks/useFleetData'
import { LoadingScreen, ErrorBanner } from './components/UI'
import Veiculos    from './pages/Veiculos'
import Vendidos    from './pages/Vendidos'
import Prestadores from './pages/Prestadores'
import Historico   from './pages/Historico'
import KPIs        from './pages/KPIs'
import { C } from './lib/constants'

const TABS = [
  { id: 'dashboard',   icon: '📊', label: 'Dashboard KPI' },
  { id: 'veiculos',    icon: '🚗', label: 'Estoque'       },
  { id: 'vendidos',    icon: '🏷', label: 'Vendidos'      },
  { id: 'prestadores', icon: '🔧', label: 'Prestadores'   },
  { id: 'historico',   icon: '📋', label: 'Histórico'     },
]

export default function App() {
  const [aba, setAba] = useState('dashboard')
  const fleet = useFleetData()

  if (fleet.loading) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${C.surface}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        body{background:${C.bg}}
        input[type=number]{-moz-appearance:textfield}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 32px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: C.amber, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚛</div>
            <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: -0.5 }}>
              Fleet<span style={{ color: C.amber }}>Control</span>
              <span style={{ fontSize: 10, color: C.muted, marginLeft: 6, fontWeight: 400 }}>v3.0</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setAba(t.id)} style={{
                background: aba === t.id ? C.amberDim : 'transparent',
                color: aba === t.id ? C.amber : C.muted,
                border: 'none', borderBottom: aba === t.id ? `2px solid ${C.amber}` : '2px solid transparent',
                padding: '0 16px', height: 60, fontSize: 13,
                fontWeight: aba === t.id ? 700 : 400, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s', fontFamily: "'Syne',sans-serif",
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {/* Indicador realtime */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: fleet.error ? C.red : C.green, boxShadow: `0 0 6px ${fleet.error ? C.red : C.green}` }} />
            <span style={{ fontSize: 11, color: C.muted }}>{fleet.error ? 'Erro' : 'Ao vivo'}</span>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px' }}>
        {fleet.error && <ErrorBanner message={fleet.error} onRetry={fleet.reload} />}

        {aba === 'dashboard'   && <KPIs        veiculos={fleet.veiculos} metas={fleet.metas} saveMetas={fleet.saveMetas} />}
        {aba === 'veiculos'    && <Veiculos     veiculos={fleet.veiculos} prestadores={fleet.prestadores} saveVeiculo={fleet.saveVeiculo} removeVeiculo={fleet.removeVeiculo} saveServico={fleet.saveServico} removeServico={fleet.removeServico} />}
        {aba === 'vendidos'    && <Vendidos     veiculos={fleet.veiculos} />}
        {aba === 'prestadores' && <Prestadores  prestadores={fleet.prestadores} veiculos={fleet.veiculos} savePrestador={fleet.savePrestador} removePrestador={fleet.removePrestador} />}
        {aba === 'historico'   && <Historico    veiculos={fleet.veiculos} prestadores={fleet.prestadores} />}
      </main>
    </div>
  )
}
