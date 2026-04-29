import { useState, useMemo } from 'react'
import { Card, KPI, GaugeBar, SectionHead, Grid, Btn } from '../components/UI'
import { C, fmtR, fmtPct, fmtDias, custoV, diasNoEstoque } from '../lib/constants'

const mesAno = iso => { const d = new Date(iso); return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` }
const mono = { fontFamily: "'JetBrains Mono',monospace" }

export default function KPIs({ veiculos, metas: metasDB, saveMetas }) {
  const [periodo, setPeriodo] = useState('total')
  const [secao, setSecao]     = useState('overview')
  const [editMetas, setEdit]  = useState(false)
  const [saving, setSaving]   = useState(false)
  const [metasLocal, setMetasLocal] = useState(null)

  const metas = metasLocal || metasDB || { vendas_mes:3, margem_min:8, dias_max_estoque:90, custo_max_pct:5 }
  const setM = (k,v) => setMetasLocal(p => ({ ...(p || metas), [k]: Number(v) }))

  const vPeriodo = useMemo(() => {
    if (periodo === 'total') return veiculos
    const lim = parseInt(periodo)
    return veiculos.filter(v => diasNoEstoque(v) <= lim || v.status !== 'vendido')
  }, [veiculos, periodo])

  const calc = useMemo(() => {
    const todos     = vPeriodo
    const ativos    = todos.filter(v => v.status !== 'vendido')
    const vendidos  = todos.filter(v => v.status === 'vendido')
    const hoje = new Date()

    const diasAtivos   = ativos.map(v => diasNoEstoque(v))
    const diasVend     = vendidos.map(v => diasNoEstoque(v))
    const mediaDiasAti = diasAtivos.length   ? diasAtivos.reduce((a,b)=>a+b,0)/diasAtivos.length : 0
    const mediaDiasVend= diasVend.length     ? diasVend.reduce((a,b)=>a+b,0)/diasVend.length : 0
    const parados60    = ativos.filter(v => diasNoEstoque(v) > 60)
    const parados90    = ativos.filter(v => diasNoEstoque(v) > 90)
    const taxaGiro     = todos.length > 0 ? (vendidos.length/todos.length)*100 : 0

    const receita      = vendidos.reduce((s,v)=>s+(v.valor_venda||0),0)
    const custoAquis   = vendidos.reduce((s,v)=>s+(v.valor_estoque||0),0)
    const custoMntVend = vendidos.reduce((s,v)=>s+custoV(v),0)
    const lucro        = receita - custoAquis - custoMntVend
    const margem       = receita > 0 ? (lucro/receita)*100 : 0
    const ticketMedio  = vendidos.length > 0 ? receita/vendidos.length : 0
    const roi          = custoAquis > 0 ? (lucro/custoAquis)*100 : 0

    const custoMntTotal  = todos.reduce((s,v)=>s+custoV(v),0)
    const custoMntAtivos = ativos.reduce((s,v)=>s+custoV(v),0)
    const valorEstTotal  = ativos.reduce((s,v)=>s+(v.valor_estoque||0),0)
    const indiceCusto    = valorEstTotal > 0 ? (custoMntAtivos/valorEstTotal)*100 : 0
    const custoMedioV    = ativos.length > 0 ? custoMntAtivos/ativos.length : 0

    const tipos = [...new Set(todos.map(v=>v.tipo))]
    const porTipo = tipos.map(tipo => {
      const vt = todos.filter(v=>v.tipo===tipo)
      const vv = vt.filter(v=>v.status==='vendido')
      const lucroT = vv.reduce((s,v)=>{const c=custoV(v);return s+(v.valor_venda||0)-(v.valor_estoque||0)-c},0)
      const recT   = vv.reduce((s,v)=>s+(v.valor_venda||0),0)
      const margemT= recT>0?(lucroT/recT)*100:0
      const diasT  = vt.map(v=>diasNoEstoque(v))
      const mediaDT= diasT.length?diasT.reduce((a,b)=>a+b,0)/diasT.length:0
      return { tipo, qtd:vt.length, vendidos:vv.length, lucro:lucroT, margem:margemT, mediaDias:mediaDT, custo:vt.reduce((s,v)=>s+custoV(v),0) }
    })

    const mesesMap = {}
    vendidos.forEach(v=>{
      const m = mesAno(v.data_venda)
      if (!mesesMap[m]) mesesMap[m]={mes:m,qtd:0,receita:0,lucro:0}
      mesesMap[m].qtd++; mesesMap[m].receita+=v.valor_venda||0
      mesesMap[m].lucro+=(v.valor_venda||0)-(v.valor_estoque||0)-custoV(v)
    })
    const mesesVenda = Object.values(mesesMap).sort((a,b)=>a.mes.localeCompare(b.mes))

    const rankingCusto = ativos.map(v=>({...v,diasEstoque:diasNoEstoque(v),custoTotal:custoV(v),pctCusto:v.valor_estoque>0?(custoV(v)/v.valor_estoque)*100:0})).sort((a,b)=>b.pctCusto-a.pctCusto)
    const rankingDias  = [...ativos].sort((a,b)=>diasNoEstoque(b)-diasNoEstoque(a))

    return { todos, ativos, vendidos, mediaDiasAti, mediaDiasVend, parados60, parados90, taxaGiro, receita, custoAquis, custoMntVend, lucro, margem, ticketMedio, roi, custoMntTotal, custoMntAtivos, valorEstTotal, indiceCusto, custoMedioV, porTipo, mesesVenda, rankingCusto, rankingDias }
  }, [vPeriodo])

  const mesAtual = useMemo(()=>{
    const m = mesAno(new Date().toISOString())
    return calc.mesesVenda.find(x=>x.mes===m)||{qtd:0,receita:0,lucro:0}
  },[calc])

  const navBtn = (id, label, icon) => (
    <button onClick={()=>setSecao(id)} style={{background:secao===id?C.amberDim:'transparent',color:secao===id?C.amber:C.muted,border:'none',borderBottom:secao===id?`2px solid ${C.amber}`:'2px solid transparent',padding:'0 14px',height:48,fontSize:12,fontWeight:secao===id?700:500,cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontFamily:"'Syne',sans-serif",transition:'all 0.15s'}}>
      {icon} {label}
    </button>
  )

  return (
    <div>
      {/* Controles */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h2 style={{margin:'0 0 4px',fontSize:22,fontWeight:900}}>Dashboard KPI</h2>
          <p style={{margin:0,color:C.muted,fontSize:13}}>Indicadores de performance do estoque</p>
        </div>
        <div style={{display:'flex',gap:3,background:C.surface,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>
          {[['30','30d'],['60','60d'],['90','90d'],['total','Total']].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriodo(v)} style={{background:periodo===v?C.amber:'transparent',color:periodo===v?'#000':C.muted,border:'none',borderRadius:6,padding:'5px 13px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:"'Syne',sans-serif"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-nav */}
      <div style={{display:'flex',gap:2,borderBottom:`1px solid ${C.border}`,marginBottom:24}}>
        {navBtn('overview','Visão Geral','⬡')}
        {navBtn('giro','Giro','↻')}
        {navBtn('rentabilidade','Rentabilidade','◈')}
        {navBtn('custos','Custos','⬡')}
        {navBtn('metas','Metas','◎')}
      </div>

      {/* ── VISÃO GERAL ── */}
      {secao==='overview' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
            {[
              {label:'Estoque Ativo',   value:calc.ativos.length,            icon:'🚛',color:C.blue},
              {label:'Prontos p/ Venda',value:calc.ativos.filter(v=>v.status==='pronto').length,icon:'✓',color:C.green},
              {label:'Em Manutenção',   value:calc.ativos.filter(v=>v.status==='manutencao').length,icon:'⚙',color:C.amber},
              {label:'Vendidos',        value:calc.vendidos.length,          icon:'🏷',color:'#a78bfa'},
              {label:'Taxa de Giro',    value:fmtPct(calc.taxaGiro),        icon:'↻',color:C.cyan},
            ].map(k=><KPI key={k.label} {...k}/>)}
          </div>
          <Grid cols={4} gap={12} style={{marginBottom:24}}>
            {[
              {label:'Valor em Estoque',value:fmtR(calc.valorEstTotal),  color:C.blue,  sub:'custo de aquisição ativo'},
              {label:'Custo Manutenção',value:fmtR(calc.custoMntAtivos), color:C.amber, sub:`índice: ${fmtPct(calc.indiceCusto)}`},
              {label:'Receita Vendas',  value:fmtR(calc.receita),         color:C.green, sub:`${calc.vendidos.length} vend.`},
              {label:'Lucro Líquido',   value:fmtR(calc.lucro),           color:calc.lucro>=0?C.green:C.red, sub:`margem: ${fmtPct(calc.margem)}`},
            ].map(k=>(
              <div key={k.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'16px 18px',borderLeft:`3px solid ${k.color}`}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:0.5,marginBottom:8}}>{k.label}</div>
                <div style={{...mono,fontSize:18,fontWeight:700,color:k.color}}>{k.value}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:6}}>{k.sub}</div>
              </div>
            ))}
          </Grid>
          <Grid cols={2} gap={16}>
            <Card>
              <SectionHead title="Performance por Tipo"/>
              {calc.porTipo.map(t=>{
                const cor=t.margem>=10?C.green:t.margem>=5?C.amber:C.red
                return(
                  <div key={t.tipo} style={{background:C.cardHi,borderRadius:9,padding:'12px 14px',marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontWeight:700,fontSize:13}}>{t.tipo}</span>
                      <span style={{...mono,fontWeight:800,color:cor}}>{fmtPct(t.margem)}</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,fontSize:11}}>
                      {[['Total',t.qtd+'u',C.text],['Vendidos',t.vendidos+'u','#a78bfa'],['Dias Méd.',fmtDias(t.mediaDias),t.mediaDias<60?C.green:t.mediaDias<90?C.amber:C.red]].map(([l,v,c])=>(
                        <div key={l} style={{textAlign:'center'}}><div style={{color:C.muted,marginBottom:2}}>{l}</div><div style={{...mono,fontWeight:700,color:c}}>{v}</div></div>
                      ))}
                    </div>
                    <div style={{marginTop:8}}><GaugeBar value={Math.max(0,t.margem)} max={25} color={cor} height={4}/></div>
                  </div>
                )
              })}
            </Card>
            <Card>
              <SectionHead title="Vendas por Mês"/>
              {!calc.mesesVenda.length
                ? <div style={{textAlign:'center',color:C.muted,padding:40}}>Sem vendas no período</div>
                : calc.mesesVenda.slice(-8).map(m=>{
                    const maxR=Math.max(...calc.mesesVenda.map(x=>x.receita),1)
                    return(
                      <div key={m.mes} style={{background:C.cardHi,borderRadius:9,padding:'10px 12px',marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                          <span style={{...mono,fontSize:12,fontWeight:700}}>{m.mes}</span>
                          <div style={{display:'flex',gap:10}}>
                            <span style={{fontSize:11,color:'#a78bfa'}}>{m.qtd}v</span>
                            <span style={{...mono,fontSize:11,fontWeight:700,color:m.lucro>=0?C.green:C.red}}>{fmtR(m.lucro)}</span>
                          </div>
                        </div>
                        <GaugeBar value={m.receita} max={maxR} color={C.blue} height={5}/>
                      </div>
                    )
                  })
              }
            </Card>
          </Grid>
        </div>
      )}

      {/* ── GIRO ── */}
      {secao==='giro' && (
        <div>
          <Grid cols={4} gap={12} style={{marginBottom:24}}>
            {[
              {label:'Dias Médios (ativos)',  value:fmtDias(calc.mediaDiasAti),  color:calc.mediaDiasAti<metas.dias_max_estoque?C.green:C.red},
              {label:'Dias Médios (vendidos)',value:fmtDias(calc.mediaDiasVend), color:C.cyan},
              {label:'Parados >60 dias',      value:calc.parados60.length,       color:calc.parados60.length>0?C.amber:C.green},
              {label:'Parados >90 dias',      value:calc.parados90.length,       color:calc.parados90.length>0?C.red:C.green},
            ].map(k=>(
              <div key={k.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'18px 20px',borderTop:`3px solid ${k.color}`}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:0.5,marginBottom:8}}>{k.label}</div>
                <div style={{...mono,fontSize:28,fontWeight:700,color:k.color}}>{k.value}</div>
              </div>
            ))}
          </Grid>
          <Grid cols={2} gap={16}>
            <Card>
              <SectionHead title="🏆 Mais Tempo em Estoque"/>
              {calc.rankingDias.map((v,i)=>{
                const d=diasNoEstoque(v)
                const cor=d<30?C.green:d<60?C.cyan:d<90?C.amber:C.red
                const maxD=diasNoEstoque(calc.rankingDias[0]||v)+1
                return(
                  <div key={v.id} style={{background:C.cardHi,borderRadius:9,padding:'11px 14px',marginBottom:6,borderLeft:`3px solid ${cor}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <div><span style={{...mono,fontSize:11,color:C.muted,marginRight:6}}>#{i+1}</span><span style={{fontWeight:700,fontSize:13}}>{v.modelo}</span><span style={{fontSize:11,color:C.muted,marginLeft:6}}>{v.placa}</span></div>
                      <span style={{...mono,fontWeight:800,color:cor}}>{fmtDias(d)}</span>
                    </div>
                    <GaugeBar value={d} max={maxD} color={cor} height={4}/>
                    <div style={{fontSize:10,color:C.muted,marginTop:4}}>{d>90?'🔴 Crítico':d>60?'🟡 Atenção':'🟢 Normal'}</div>
                  </div>
                )
              })}
            </Card>
            <Card>
              <SectionHead title="Distribuição por Faixa"/>
              {[{label:'0–30 dias',min:0,max:30,color:C.green},{label:'31–60 dias',min:31,max:60,color:C.cyan},{label:'61–90 dias',min:61,max:90,color:C.amber},{label:'> 90 dias',min:91,max:9999,color:C.red}].map(f=>{
                const qtd=calc.ativos.filter(v=>{const d=diasNoEstoque(v);return d>=f.min&&d<=f.max}).length
                const pct=calc.ativos.length>0?(qtd/calc.ativos.length)*100:0
                return(
                  <div key={f.label} style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontWeight:600,fontSize:13}}>{f.label}</span>
                      <span style={{...mono,fontWeight:700,color:f.color}}>{qtd}v <span style={{color:C.muted,fontWeight:400,fontSize:11}}>({fmtPct(pct)})</span></span>
                    </div>
                    <GaugeBar value={qtd} max={Math.max(calc.ativos.length,1)} color={f.color} height={10}/>
                  </div>
                )
              })}
            </Card>
          </Grid>
        </div>
      )}

      {/* ── RENTABILIDADE ── */}
      {secao==='rentabilidade' && (
        <div>
          <Grid cols={5} gap={12} style={{marginBottom:24}}>
            {[
              {label:'Receita Total',   value:fmtR(calc.receita),       color:C.blue},
              {label:'Custo Aquisição', value:fmtR(calc.custoAquis),    color:C.muted},
              {label:'Custo Manutenção',value:fmtR(calc.custoMntVend),  color:C.amber},
              {label:'Lucro Líquido',   value:fmtR(calc.lucro),         color:calc.lucro>=0?C.green:C.red},
              {label:'Margem Bruta',    value:fmtPct(calc.margem),      color:calc.margem>=(metas.margem_min||8)?C.green:C.red},
            ].map(k=>(
              <div key={k.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'16px 18px',borderTop:`3px solid ${k.color}`}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:8}}>{k.label}</div>
                <div style={{...mono,fontSize:18,fontWeight:700,color:k.color}}>{k.value}</div>
              </div>
            ))}
          </Grid>
          <Grid cols={2} gap={16} style={{marginBottom:16}}>
            <Card>
              <SectionHead title="Composição do Resultado"/>
              {[
                {label:'Receita',          value:calc.receita,      positive:true,  color:C.green},
                {label:'(-) Custo Aquis.', value:-calc.custoAquis,  positive:false, color:C.red},
                {label:'(-) Custo Mnt.',   value:-calc.custoMntVend,positive:false, color:C.amber},
                {label:'= Lucro',          value:calc.lucro,        positive:calc.lucro>=0, color:calc.lucro>=0?C.cyan:C.red, bold:true},
              ].map((r,i)=>(
                <div key={r.label} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:r.bold?800:500,color:r.bold?C.text:C.muted}}>{r.label}</span>
                    <span style={{...mono,fontSize:13,fontWeight:700,color:r.color}}>{fmtR(Math.abs(r.value))}</span>
                  </div>
                  <GaugeBar value={Math.abs(r.value)} max={Math.max(calc.receita,1)} color={r.color} height={r.bold?8:5}/>
                </div>
              ))}
              <Grid cols={2} gap={10} style={{marginTop:16}}>
                {[['Ticket Médio',fmtR(calc.ticketMedio),C.blue],['ROI',fmtPct(calc.roi),calc.roi>=0?C.green:C.red]].map(([l,v,c])=>(
                  <div key={l} style={{background:C.cardHi,borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
                    <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:4}}>{l}</div>
                    <div style={{...mono,fontWeight:700,color:c,fontSize:14}}>{v}</div>
                  </div>
                ))}
              </Grid>
            </Card>
            <Card>
              <SectionHead title="Margem por Tipo"/>
              {calc.porTipo.map(t=>{
                const cor=t.margem>=15?C.green:t.margem>=8?C.cyan:t.margem>=0?C.amber:C.red
                return(
                  <div key={t.tipo} style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <div><span style={{fontWeight:700,fontSize:13}}>{t.tipo}</span><span style={{fontSize:11,color:C.muted,marginLeft:8}}>{t.vendidos}v</span></div>
                      <span style={{...mono,fontWeight:800,fontSize:15,color:cor}}>{fmtPct(t.margem)}</span>
                    </div>
                    <GaugeBar value={Math.max(0,t.margem)} max={25} color={cor} height={8}/>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,color:C.muted}}>
                      <span>Lucro: {fmtR(t.lucro)}</span><span>Custo mnt: {fmtR(t.custo)}</span>
                    </div>
                  </div>
                )
              })}
            </Card>
          </Grid>
          <Card>
            <SectionHead title="Detalhe por Veículo Vendido"/>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr>{['Modelo','Placa','Aquis.','Mnt.','Venda','Lucro','Margem','Dias'].map(h=>(
                  <th key={h} style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:0.5,padding:'8px 10px',textAlign:['Modelo','Placa'].includes(h)?'left':'right',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {calc.vendidos.map(v=>{
                  const mnt=custoV(v); const lucro=(v.valor_venda||0)-(v.valor_estoque||0)-mnt
                  const mg=v.valor_venda>0?(lucro/v.valor_venda)*100:0
                  const cor=mg>=10?C.green:mg>=5?C.amber:C.red
                  return(
                    <tr key={v.id} style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'9px 10px',fontWeight:700}}>{v.modelo}</td>
                      <td style={{padding:'9px 10px',color:C.muted,...mono}}>{v.placa}</td>
                      {[fmtR(v.valor_estoque),fmtR(mnt),fmtR(v.valor_venda)].map((val,i)=>(
                        <td key={i} style={{padding:'9px 10px',textAlign:'right',...mono}}>{val}</td>
                      ))}
                      <td style={{padding:'9px 10px',textAlign:'right',...mono,fontWeight:700,color:cor}}>{fmtR(lucro)}</td>
                      <td style={{padding:'9px 10px',textAlign:'right',...mono,fontWeight:700,color:cor}}>{fmtPct(mg)}</td>
                      <td style={{padding:'9px 10px',textAlign:'right',...mono}}>{fmtDias(diasNoEstoque(v))}</td>
                    </tr>
                  )
                })}
                {!calc.vendidos.length&&<tr><td colSpan={8} style={{textAlign:'center',color:C.muted,padding:30}}>Sem vendas no período</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── CUSTOS ── */}
      {secao==='custos' && (
        <div>
          <Grid cols={4} gap={12} style={{marginBottom:24}}>
            {[
              {label:'Custo Total (todos)',   value:fmtR(calc.custoMntTotal),  color:C.amber},
              {label:'Custo Estoque Ativo',   value:fmtR(calc.custoMntAtivos), color:C.orange||'#fb923c'},
              {label:'Índice Custo/Estoque',  value:fmtPct(calc.indiceCusto),  color:calc.indiceCusto<(metas.custo_max_pct||5)?C.green:C.red},
              {label:'Custo Médio/Veículo',   value:fmtR(calc.custoMedioV),    color:C.cyan},
            ].map(k=>(
              <div key={k.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'16px 18px',borderTop:`3px solid ${k.color}`}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:8}}>{k.label}</div>
                <div style={{...mono,fontSize:20,fontWeight:700,color:k.color}}>{k.value}</div>
              </div>
            ))}
          </Grid>
          <Grid cols={2} gap={16}>
            <Card>
              <SectionHead title="🔺 Ranking Custo/Valor"/>
              {calc.rankingCusto.map((v,i)=>{
                const cor=v.pctCusto<3?C.green:v.pctCusto<(metas.custo_max_pct||5)?C.amber:C.red
                return(
                  <div key={v.id} style={{background:C.cardHi,borderRadius:9,padding:'11px 14px',marginBottom:6,borderLeft:`3px solid ${cor}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <div><span style={{...mono,fontSize:11,color:C.muted,marginRight:6}}>#{i+1}</span><span style={{fontWeight:700,fontSize:13}}>{v.modelo}</span><span style={{fontSize:11,color:C.muted,marginLeft:6}}>{v.placa}</span></div>
                      <span style={{...mono,fontWeight:800,color:cor}}>{fmtPct(v.pctCusto)}</span>
                    </div>
                    <GaugeBar value={v.pctCusto} max={Math.max((calc.rankingCusto[0]?.pctCusto||1),(metas.custo_max_pct||5)*2)} color={cor} height={5}/>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,color:C.muted}}>
                      <span>Custo: {fmtR(v.custoTotal)}</span><span>Est: {fmtR(v.valor_estoque)}</span>
                    </div>
                  </div>
                )
              })}
            </Card>
            <Card>
              <SectionHead title="Custo por Tipo"/>
              {calc.porTipo.map(t=>{
                const maxC=Math.max(...calc.porTipo.map(x=>x.custo),1)
                const cor=t.custo/maxC<0.4?C.green:t.custo/maxC<0.7?C.amber:C.red
                return(
                  <div key={t.tipo} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontWeight:600,fontSize:13}}>{t.tipo} ({t.qtd}v)</span>
                      <span style={{...mono,fontWeight:700,color:cor}}>{fmtR(t.custo)}</span>
                    </div>
                    <GaugeBar value={t.custo} max={maxC} color={cor} height={8}/>
                    <div style={{fontSize:10,color:C.muted,marginTop:3}}>Média: {fmtR(t.qtd>0?t.custo/t.qtd:0)}</div>
                  </div>
                )
              })}
            </Card>
          </Grid>
        </div>
      )}

      {/* ── METAS ── */}
      {secao==='metas' && (
        <div>
          <SectionHead
            title="Painel de Metas"
            subtitle="Defina e acompanhe seus indicadores-alvo"
            action={
              <div style={{display:'flex',gap:8}}>
                {editMetas && <Btn variant="secondary" small onClick={()=>{setEdit(false);setMetasLocal(null)}}>Cancelar</Btn>}
                <Btn variant={editMetas?'success':'ghost'} small onClick={async()=>{
                  if(editMetas){
                    try{setSaving(true);await saveMetas(metasLocal||metas);setEdit(false)}
                    catch(e){console.error(e)}finally{setSaving(false)}
                  } else {
                    setMetasLocal({...metas});setEdit(true)
                  }
                }}>
                  {saving?'Salvando...':editMetas?'✓ Salvar':'✏️ Editar Metas'}
                </Btn>
              </div>
            }
          />
          {editMetas && (
            <div style={{background:C.card,border:`1px solid #f59e0b44`,borderRadius:12,padding:22,marginBottom:24,background:'#f59e0b08'}}>
              <div style={{fontSize:10,color:C.amber,fontWeight:700,letterSpacing:1,marginBottom:16}}>⚙ CONFIGURAR METAS</div>
              <Grid cols={4} gap={16}>
                {[
                  {key:'vendas_mes',     label:'Vendas por Mês (un.)'},
                  {key:'margem_min',     label:'Margem Mínima (%)'},
                  {key:'dias_max_estoque',label:'Dias Máx. Estoque'},
                  {key:'custo_max_pct',  label:'Custo Mnt. Máx. (%)'},
                ].map(m=>(
                  <div key={m.key}>
                    <label style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:0.5,display:'block',marginBottom:8}}>{m.label}</label>
                    <input type="number" value={(metasLocal||metas)[m.key]||''} onChange={e=>setM(m.key,e.target.value)}
                      style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,padding:'10px 12px',fontSize:18,width:'100%',outline:'none',fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}/>
                  </div>
                ))}
              </Grid>
            </div>
          )}
          <Grid cols={2} gap={14} style={{marginBottom:24}}>
            {[
              {label:'Vendas no Mês',         atual:mesAtual.qtd,            meta:metas.vendas_mes||3,          fmt:v=>`${Math.round(v)}v`,  invert:false},
              {label:'Margem Bruta',           atual:calc.margem,             meta:metas.margem_min||8,          fmt:fmtPct,                   invert:false},
              {label:'Dias Médios em Estoque', atual:calc.mediaDiasAti,       meta:metas.dias_max_estoque||90,   fmt:fmtDias,                  invert:true},
              {label:'Índice Custo/Valor',     atual:calc.indiceCusto,        meta:metas.custo_max_pct||5,       fmt:fmtPct,                   invert:true},
            ].map(row=>{
              const ok=row.invert?row.atual<=row.meta:row.atual>=row.meta
              const warn=row.invert?row.atual<=row.meta*1.3:row.atual>=row.meta*0.7
              const cor=ok?C.green:warn?C.amber:C.red
              return(
                <div key={row.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'16px 18px',borderTop:`3px solid ${cor}`}}>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:8}}>{row.label}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:10}}>
                    <span style={{...mono,fontSize:24,fontWeight:800,color:cor}}>{row.fmt(row.atual)}</span>
                    <span style={{fontSize:12,color:C.muted}}>/ meta {row.fmt(row.meta)}</span>
                  </div>
                  <GaugeBar value={row.invert?Math.max(0,row.meta*2-row.atual):row.atual} max={row.invert?row.meta*2:Math.max(row.meta*1.2,1)} color={cor}/>
                  <div style={{fontSize:11,color:cor,fontWeight:700,marginTop:6}}>{ok?'✓ Meta atingida':warn?'~ Próximo da meta':'✗ Abaixo da meta'}</div>
                </div>
              )
            })}
          </Grid>
          <Card>
            <SectionHead title="Scorecard Geral"/>
            {[
              {label:'Vendas mensais',   atual:mesAtual.qtd,       meta:metas.vendas_mes||3,        fmt:v=>`${v}v`,   invert:false},
              {label:'Margem bruta',     atual:calc.margem,        meta:metas.margem_min||8,        fmt:fmtPct,       invert:false},
              {label:'Tempo em estoque', atual:calc.mediaDiasAti,  meta:metas.dias_max_estoque||90, fmt:fmtDias,      invert:true},
              {label:'Custo/valor',      atual:calc.indiceCusto,   meta:metas.custo_max_pct||5,     fmt:fmtPct,       invert:true},
              {label:'Parados >90 dias', atual:calc.parados90.length,meta:0,                        fmt:v=>`${v}v`,  invert:true},
              {label:'ROI do estoque',   atual:calc.roi,           meta:10,                          fmt:fmtPct,      invert:false},
            ].map(row=>{
              const ok=row.invert?row.atual<=row.meta:row.atual>=row.meta
              const warn=row.invert?row.atual<=row.meta*1.3:row.atual>=row.meta*0.7
              const cor=ok?C.green:warn?C.amber:C.red
              return(
                <div key={row.label} style={{background:C.cardHi,borderRadius:9,padding:'12px 16px',marginBottom:6,display:'flex',alignItems:'center',justifyContent:'space-between',border:`1px solid ${cor}22`}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:28,height:28,borderRadius:7,background:cor+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:cor}}>{ok?'✓':warn?'~':'✗'}</div>
                    <span style={{fontWeight:600,fontSize:13}}>{row.label}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:16}}>
                    <span style={{...mono,fontSize:16,fontWeight:800,color:cor}}>{row.fmt(row.atual)}</span>
                    <div style={{width:80}}><GaugeBar value={row.invert?Math.max(0,row.meta*2-row.atual):row.atual} max={row.invert?row.meta*2:Math.max(row.meta*1.5,1)} color={cor} height={6}/></div>
                  </div>
                </div>
              )
            })}
            {(()=>{
              const rows=[{a:mesAtual.qtd,m:metas.vendas_mes||3,i:false},{a:calc.margem,m:metas.margem_min||8,i:false},{a:calc.mediaDiasAti,m:metas.dias_max_estoque||90,i:true},{a:calc.indiceCusto,m:metas.custo_max_pct||5,i:true},{a:calc.parados90.length,m:0,i:true},{a:calc.roi,m:10,i:false}]
              const ok=rows.filter(r=>r.i?r.a<=r.m:r.a>=r.m).length
              const pct=(ok/rows.length)*100
              const cor=pct>=80?C.green:pct>=50?C.amber:C.red
              return(
                <div style={{marginTop:16,padding:'14px 18px',background:C.subtle||'#242a3e',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:0.5,marginBottom:4}}>SCORE GERAL</div><div style={{fontSize:12,color:C.muted}}>{ok} de {rows.length} indicadores atingidos</div></div>
                  <span style={{...mono,fontSize:36,fontWeight:800,color:cor}}>{Math.round(pct)}%</span>
                </div>
              )
            })()}
          </Card>
        </div>
      )}
    </div>
  )
}
