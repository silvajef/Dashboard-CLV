import { NavLink } from 'react-router-dom'

const NAV = [
  { to:'/',             icon:'📊', label:'Dashboard' },
  { to:'/estoque',      icon:'🚗', label:'Estoque'   },
  { to:'/vendidos',     icon:'🏷', label:'Vendidos'  },
  { to:'/prestadores',  icon:'🔧', label:'Prestadores'},
  { to:'/historico',    icon:'📋', label:'Histórico' },
  { to:'/kpis',         icon:'📈', label:'KPIs'      },
]

export default function Navbar() {
  return (
    <header style={{background:'#0e1018',borderBottom:'1px solid #1c2030',padding:'0 28px',position:'sticky',top:0,zIndex:100}}>
      <div style={{maxWidth:1400,margin:'0 auto',height:58,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,background:'#f59e0b',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🚛</div>
          <span style={{fontWeight:900,fontSize:16,letterSpacing:-0.5}}>Fleet<span style={{color:'#f59e0b'}}>Control</span></span>
          <span style={{fontSize:11,color:'#5a6480',marginLeft:4,borderLeft:'1px solid #1c2030',paddingLeft:10}}>v3.0</span>
        </div>

        {/* Nav */}
        <nav style={{display:'flex',gap:2}}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to==='/'} style={({isActive})=>({
              background: isActive ? '#f59e0b22' : 'transparent',
              color:      isActive ? '#f59e0b'   : '#5a6480',
              border: 'none',
              borderBottom: isActive ? '2px solid #f59e0b' : '2px solid transparent',
              padding: '0 14px',
              height: 54,
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              textDecoration: 'none',
              transition: 'all 0.15s',
            })}>
              {icon} {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
