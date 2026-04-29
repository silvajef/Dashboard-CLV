import { C, fmtR, fmtN, diasNoEstoque, custoV } from '../lib/constants'
import { KPI, Grid } from '../components/UI'

export default function Vendidos({ veiculos }) {
  const vendidos = veiculos.filter(v => v.status === 'vendido')
  const receita  = vendidos.reduce((s,v)=>s+(v.valor_venda||0),0)
  const custos   = vendidos.reduce((s,v)=>s+(v.valor_estoque||0)+custoV(v),0)
  const lucro    = receita - custos

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>Veículos Vendidos</h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Histórico completo de saídas do estoque</p>
      </div>
      <Grid cols={4} gap={14} style={{ marginBottom: 24 }}>
        <KPI label="Total Vendidos"  value={vendidos.length}  icon="🏷" color="#a78bfa"/>
        <KPI label="Receita Total"   value={fmtR(receita)}    icon="💵" color={C.green}/>
        <KPI label="Custo Total"     value={fmtR(custos)}     icon="📉" color={C.red}/>
        <KPI label="Lucro Líquido"   value={fmtR(lucro)}      icon="📈" color={C.amber}/>
      </Grid>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {vendidos.map(v => {
          const mnt   = custoV(v)
          const l     = (v.valor_venda||0)-(v.valor_estoque||0)-mnt
          const corL  = l>=0?C.green:C.red
          return (
            <div key={v.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, borderLeft: '4px solid #a78bfa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{v.tipo==='Pick-up'?'🛻':v.tipo?.includes('Caminhão')?'🚛':'🚐'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{v.modelo} <span style={{ color: C.muted, fontWeight: 400 }}>— {v.placa}</span></div>
                    <div style={{ fontSize: 12, color: C.muted }}>{v.tipo} · {v.ano} · Vendido em {v.data_venda}</div>
                    {v.comprador_nome && <div style={{ fontSize: 12, color: C.muted }}>Comprador: <span style={{ color: C.text, fontWeight: 600 }}>{v.comprador_nome}</span>{v.comprador_doc && ` (${v.comprador_doc})`}</div>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, textAlign: 'center' }}>
                  {[['Estoque',fmtR(v.valor_estoque),C.muted],['Venda',fmtR(v.valor_venda),C.green],['Lucro',fmtR(l),corL]].map(([lb,val,c])=>(
                    <div key={lb}><div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{lb}</div><div style={{ fontWeight: 800, color: c, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>{val}</div></div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
        {!vendidos.length && <div style={{ textAlign: 'center', color: C.muted, padding: 50 }}>Nenhum veículo vendido registrado.</div>}
      </div>
    </div>
  )
}
