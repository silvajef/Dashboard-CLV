import { useMemo } from 'react'
import { KPI, SectionHead, Spinner, ErrorMsg } from '../components/UI'
import { fmtR, custoVeiculo, diasNoEstoque } from '../lib/helpers'

export default function Vendidos({ veiculos, loading, error, refetch }) {
  const vendidos = veiculos.filter(v => v.status === 'vendido')

  const s = useMemo(() => {
    const receita = vendidos.reduce((s,v)=>s+(v.valor_venda||0),0)
    const custos  = vendidos.reduce((s,v)=>s+(v.valor_estoque||0)+custoVeiculo(v.servicos),0)
    const lucro   = receita - custos
    return { receita, custos, lucro }
  }, [vendidos])

  if (loading) return <Spinner/>
  if (error)   return <ErrorMsg message={error} onRetry={refetch}/>

  return (
    <div>
      <SectionHead title="Veículos Vendidos" subtitle="Histórico completo de saídas do estoque"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        <KPI label="Total Vendidos"  value={vendidos.length}  icon="🏷" color="#a78bfa"/>
        <KPI label="Receita Total"   value={fmtR(s.receita)}  icon="💵" color="#22d3a0"/>
        <KPI label="Custo Total"     value={fmtR(s.custos)}   icon="📉" color="#f4485e"/>
        <KPI label="Lucro Líquido"   value={fmtR(s.lucro)}    icon="📈" color={s.lucro>=0?'#f59e0b':'#f4485e'}/>
      </div>
      {vendidos.length === 0
        ? <div style={{textAlign:'center',color:'#5a6480',padding:60}}>Nenhum veículo vendido registrado.</div>
        : vendidos.map(v => {
            const custoMnt = custoVeiculo(v.servicos)
            const lucro    = (v.valor_venda||0)-(v.valor_estoque||0)-custoMnt
            const dias     = diasNoEstoque(v)
            return (
              <div key={v.id} style={{background:'#12151e',border:'1px solid #1c2030',borderRadius:12,padding:18,marginBottom:10,borderLeft:'4px solid #a78bfa'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{fontSize:24}}>{v.tipo==='Pick-up'?'🛻':v.tipo?.includes('Caminhão')?'🚛':'🚐'}</span>
                    <div>
                      <div style={{fontWeight:700,fontSize:15}}>{v.modelo} <span style={{color:'#5a6480',fontWeight:400}}>— {v.placa}</span></div>
                      <div style={{fontSize:12,color:'#5a6480'}}>{v.tipo} · {v.ano} · Vendido em {v.data_venda} · {dias}d em estoque</div>
                      {v.comprador_nome && <div style={{fontSize:12,color:'#5a6480',marginTop:2}}>Comprador: <span style={{color:'#dde3f0',fontWeight:600}}>{v.comprador_nome}</span>{v.comprador_doc&&` (${v.comprador_doc})`}</div>}
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,textAlign:'center'}}>
                    {[['Estoque',fmtR(v.valor_estoque),'#5a6480'],['Venda',fmtR(v.valor_venda),'#22d3a0'],['Lucro',fmtR(lucro),lucro>=0?'#f59e0b':'#f4485e']].map(([l,val,c])=>(
                      <div key={l}><div style={{fontSize:10,color:'#5a6480',fontWeight:700}}>{l}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:c,fontSize:13}}>{val}</div></div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })
      }
    </div>
  )
}
