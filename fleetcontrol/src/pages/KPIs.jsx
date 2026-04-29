import { useState, useMemo } from 'react'
import { Card, KPI, SectionHead, GaugeBar, Spinner, ErrorMsg, Btn } from '../components/UI'
import { fmtR, fmtPct, fmtDias, custoVeiculo, diasNoEstoque, mesAno } from '../lib/helpers'
import { METAS_DEFAULT } from '../lib/constants'

const C = { amber:'#f59e0b', green:'#22d3a0', red:'#f4485e', blue:'#4f8ef7', purple:'#a78bfa', cyan:'#22d4dd', orange:'#fb923c', muted:'#5a6480', text:'#dde3f0', border:'#1c2030', card:'#12151e', cardHi:'#171c28', surface:'#0e1018' }
const mono = { fontFamily:"'JetBrains Mono',monospace" }
const lbl  = { fontSize:10, fontWeight:700, letterSpacing:1.2, color:C.muted, textTransform:'uppercase' }

function MetaGauge({ label, atual, meta, fmt=v=>v, invert=false }) {
  const ok   = invert ? atual <= meta : atual >= meta
  const warn = invert ? atual <= meta*1.3 : atual >= meta*0.7
  const cor  = ok ? C.green : warn ? C.amber : C.red
  const pct  = meta > 0 ? Math.min(100,(invert ? Math.max(0,meta*2-atual) : atual) / (invert?meta*2:meta*1.2)*100) : 0
  return (
    <div style={{background:C.cardHi,borderRadius:10,padding:'14px 16px',border:`1px solid ${C.border}`}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span style={lbl}>{label}</span>
        <span style={{fontSize:10,color:cor,fontWeight:700,...mono}}>{ok?'✓ Meta':'✗ Meta'}</span>
      </div>
      <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:10}}>
        <span style={{fontSize:22,fontWeight:800,color:cor,...mono}}>{fmt(atual)}</span>
        <span style={{fontSize:12,color:C.muted}}>/ meta {fmt(meta)}</span>
      </div>
      <GaugeBar value={pct} max={100} color={cor} height={6}/>
    </div>
  )
}

export default function KPIs({ veiculos, loading, error, refetch, metas, saveMetas }) {
  const [secao,    setSecao]    = useState('overview')
  const [periodo,  setPeriodo]  = useState('total')
  const [editMetas,setEditMetas]= useState(false)
  const [metasTemp,setMetasTemp]= useState(metas)
  const [saving,   setSaving]   = useState(false)

  const calc = useMemo(() => {
    const todos     = veiculos
    const ativos    = todos.filter(v => v.status !== 'vendido')
    const vendidos  = todos.filter(v => v.status === 'vendido')

    const diasAtivos   = ativos.map(v => diasNoEstoque(v))
    const mediaDiasAtivos   = diasAtivos.length ? diasAtivos.reduce((a,b)=>a+b,0)/diasAtivos.length : 0
    const diasVendidos = vendidos.map(v => diasNoEstoque(v))
    const mediaDiasVendidos = diasVendidos.length ? diasVendidos.reduce((a,b)=>a+b,0)/diasVendidos.length : 0
    const parados60  = ativos.filter(v => diasNoEstoque(v) > 60)
    const parados90  = ativos.filter(v => diasNoEstoque(v) > 90)
    const taxaGiro   = todos.length > 0 ? (vendidos.length/todos.length)*100 : 0

    const receita    = vendidos.reduce((s,v)=>s+(v.valor_venda||0),0)
    const custoAquis = vendidos.reduce((s,v)=>s+(v.valor_estoque||0),0)
    const custoMntVend = vendidos.reduce((s,v)=>s+custoVeiculo(v.servicos),0)
    const lucro      = receita - custoAquis - custoMntVend
    const margem     = receita > 0 ? (lucro/receita)*100 : 0
    const ticketMedio= vendidos.length > 0 ? receita/vendidos.length : 0
    const roiEstoque = custoAquis > 0 ? (lucro/custoAquis)*100 : 0

    const custoMntAtivos   = ativos.reduce((s,v)=>s+custoVeiculo(v.servicos),0)
    const valorEstoqueTotal = ativos.reduce((s,v)=>s+(v.valor_estoque||0),0)
    const indiceCusto       = valorEstoqueTotal > 0 ? (custoMntAtivos/valorEstoqueTotal)*100 : 0

    const tipos = [...new Set(todos.map(v=>v.tipo))]
    const porTipo = tipos.map(tipo => {
      const vt = todos.filter(v=>v.tipo===tipo)
      const vv = vt.filter(v=>v.status==='vendido')
      const lucroT  = vv.reduce((s,v)=>(s+(v.valor_venda||0)-(v.valor_estoque||0)-custoVeiculo(v.servicos)),0)
      const receitaT= vv.reduce((s,v)=>s+(v.valor_venda||0),0)
      const margemT = receitaT>0?(lucroT/receitaT)*100:0
      const diasT   = vt.map(v=>diasNoEstoque(v))
      const mediaDT = diasT.length?diasT.reduce((a,b)=>a+b,0)/diasT.length:0
      const custoT  = vt.reduce((s,v)=>s+custoVeiculo(v.servicos),0)
      return { tipo, qtd:vt.length, vendidos:vv.length, lucro:lucroT, margem:margemT, mediaDias:mediaDT, custo:custoT }
    })

    const mesesMap = {}
    vendidos.forEach(v => {
      if (!v.data_venda) return
      const m = mesAno(v.data_venda)
      if (!mesesMap[m]) mesesMap[m] = { mes:m, qtd:0, lucro:0, receita:0 }
      mesesMap[m].qtd++
      mesesMap[m].lucro   += (v.valor_venda||0)-(v.valor_estoque||0)-custoVeiculo(v.servicos)
      mesesMap[m].receita += (v.valor_venda||0)
    })
    const mesesVenda = Object.values(mesesMap).sort((a,b)=>a.mes.localeCompare(b.mes))

    const rankingCusto = ativos.map(v=>({...v,diasEstoque:diasNoEstoque(v),custoTotal:custoVeiculo(v.servicos),pctCusto:v.valor_estoque>0?(custoVeiculo(v.servicos)/v.valor_estoque)*100:0})).sort((a,b)=>b.pctCusto-a.pctCusto)
    const rankingDias  = [...ativos].sort((a,b)=>diasNoEstoque(b)-diasNoEstoque(a))

    const hoje = new Date()
    const mesCorrente = `${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`
    const vendidosMes = mesesMap[mesCorrente]||{ qtd:0, lucro:0 }

    return { todos, ativos, vendidos, mediaDiasAtivos, mediaDiasVendidos, parados60, parados90, taxaGiro,
      receita, custoAquis, custoMntVend, lucro, margem, ticketMedio, roiEstoque,
      custoMntAtivos, valorEstoqueTotal, indiceCusto, porTipo, mesesVenda, rankingCusto, rankingDias, vendidosMes }
  }, [veiculos])

  const handleSaveMetas = async () => {
    setSaving(true)
    try { await saveMetas(metasTemp); setEditMetas(false) } catch(e) { console.error(e) }
    setSaving(false)
  }

  if (loading) return <Spinner/>
  if (error)   return <ErrorMsg message={error} onRetry={refetch}/>

  const SECOES = [
    {id:'overview',      label:'Visão Geral',   icon:'⬡'},
    {id:'giro',          label:'Giro',           icon:'↻'},
    {id:'rentabilidade', label:'Rentabilidade',  icon:'◈'},
    {id:'custos',        label:'Custos',         icon:'⬡'},
    {id:'metas',         label:'Metas',          icon:'◎'},
  ]

  return (
    <div>
      {/* Sub-nav + Período */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div style={{display:'flex',gap:2,background:'#0e1018',borderRadius:9,padding:3,border:'1px solid #1c2030'}}>
          {SECOES.map(s=>(
            <button key={s.id} onClick={()=>setSecao(s.id)}
              style={{background:secao===s.id?'#f59e0b22':'transparent',color:secao===s.id?'#f59e0b':'#5a6480',border:secao===s.id?'1px solid #1c2030':'1px solid transparent',borderRadius:7,padding:'6px 14px',fontSize:12,fontWeight:secao===s.id?700:500,cursor:'pointer'}}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:3,background:'#12151e',borderRadius:8,padding:3,border:'1px solid #1c2030'}}>
          {[['30','30d'],['60','60d'],['90','90d'],['total','Total']].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriodo(v)} style={{background:periodo===v?'#f59e0b':'transparent',color:periodo===v?'#000':'#5a6480',border:'none',borderRadius:6,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── VISÃO GERAL ── */}
      {secao==='overview' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
            <KPI label="Estoque Ativo"  value={calc.ativos.length}     icon="🚛" color={C.blue}   sub={`Valor: ${fmtR(calc.valorEstoqueTotal)}`}/>
            <KPI label="Prontos p/ Venda" value={veiculos.filter(v=>v.status==='pronto').length} icon="✅" color={C.green}/>
            <KPI label="Vendidos"       value={calc.vendidos.length}   icon="🏷" color={C.purple} sub={`Lucro: ${fmtR(calc.lucro)}`}/>
            <KPI label="Taxa de Giro"   value={fmtPct(calc.taxaGiro)}  icon="↻" color={C.cyan}/>
            <KPI label="Margem Média"   value={fmtPct(calc.margem)}    icon="📈" color={calc.margem>=metas.margem_min?C.green:C.red}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
            <Card>
              <SectionHead title="Performance por Tipo"/>
              {calc.porTipo.map(t=>(
                <div key={t.tipo} style={{background:C.cardHi,borderRadius:9,padding:'12px 14px',marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontWeight:700,fontSize:13}}>{t.tipo}</span>
                    <span style={{...mono,fontSize:13,fontWeight:700,color:t.margem>=10?C.green:t.margem>=5?C.amber:C.red}}>{fmtPct(t.margem)}</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:6}}>
                    {[['Total',t.qtd+'u',C.text],['Vendidos',t.vendidos+'u',C.purple],['Dias Méd.',fmtDias(t.mediaDias),t.mediaDias<60?C.green:t.mediaDias<90?C.amber:C.red],['Custo Mnt',fmtR(t.custo),C.amber]].map(([l,v,c])=>(
                      <div key={l} style={{textAlign:'center'}}>
                        <div style={{fontSize:9,color:C.muted,fontWeight:700,marginBottom:2}}>{l}</div>
                        <div style={{...mono,fontSize:12,fontWeight:700,color:c}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <GaugeBar value={t.margem} max={25} color={t.margem>=10?C.green:t.margem>=5?C.amber:C.red} height={4}/>
                </div>
              ))}
            </Card>
            <Card>
              <SectionHead title="Vendas por Mês"/>
              {calc.mesesVenda.slice(-6).map(m=>{
                const maxR = Math.max(...calc.mesesVenda.map(x=>x.receita),1)
                return(
                  <div key={m.mes} style={{background:C.cardHi,borderRadius:9,padding:'10px 12px',marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{...mono,fontSize:12,fontWeight:700}}>{m.mes}</span>
                      <div style={{display:'flex',gap:10}}>
                        <span style={{fontSize:11,color:C.purple}}>{m.qtd}v</span>
                        <span style={{...mono,fontSize:11,fontWeight:700,color:m.lucro>=0?C.green:C.red}}>{fmtR(m.lucro)}</span>
                      </div>
                    </div>
                    <GaugeBar value={m.receita} max={maxR} color={C.blue} height={5}/>
                  </div>
                )
              })}
              {calc.mesesVenda.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:'center',padding:'20px 0'}}>Sem vendas</div>}
            </Card>
          </div>
        </div>
      )}

      {/* ── GIRO ── */}
      {secao==='giro' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
            <KPI label="Dias Médios (ativos)"   value={fmtDias(calc.mediaDiasAtivos)}   icon="📅" color={calc.mediaDiasAtivos<metas.dias_max_estoque?C.green:C.red}/>
            <KPI label="Dias Médios (vendidos)"  value={fmtDias(calc.mediaDiasVendidos)} icon="✅" color={C.cyan}/>
            <KPI label="Parados >60 dias"        value={calc.parados60.length}            icon="🟡" color={calc.parados60.length>0?C.amber:C.green}/>
            <KPI label="Parados >90 dias"        value={calc.parados90.length}            icon="🔴" color={calc.parados90.length>0?C.red:C.green}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <Card>
              <SectionHead title="Ranking — Mais Tempo Parado"/>
              {calc.rankingDias.map((v,i)=>{
                const d=diasNoEstoque(v), cor=d<30?C.green:d<60?C.cyan:d<90?C.amber:C.red
                const maxD=diasNoEstoque(calc.rankingDias[0]||{data_entrada:new Date().toISOString().split('T')[0]})
                return(
                  <div key={v.id} style={{background:C.cardHi,borderRadius:9,padding:'10px 14px',marginBottom:6,borderLeft:`3px solid ${cor}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <div><span style={{...mono,fontSize:11,color:C.muted,marginRight:6}}>#{i+1}</span><span style={{fontWeight:700,fontSize:13}}>{v.modelo}</span><span style={{fontSize:11,color:C.muted,marginLeft:6}}>{v.placa}</span></div>
                      <span style={{...mono,fontWeight:800,fontSize:14,color:cor}}>{fmtDias(d)}</span>
                    </div>
                    <GaugeBar value={d} max={Math.max(maxD,1)} color={cor} height={4}/>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,color:C.muted}}>
                      <span>{v.tipo} · {v.ano}</span><span>{d>90?'🔴':d>60?'🟡':'🟢'}</span>
                    </div>
                  </div>
                )
              })}
              {calc.rankingDias.length===0&&<div style={{color:C.muted,textAlign:'center',padding:30}}>Sem veículos ativos</div>}
            </Card>
            <Card>
              <SectionHead title="Distribuição por Faixa de Tempo"/>
              {[{label:'0–30 dias',min:0,max:30,color:C.green},{label:'31–60 dias',min:31,max:60,color:C.cyan},{label:'61–90 dias',min:61,max:90,color:C.amber},{label:'> 90 dias',min:91,max:9999,color:C.red}].map(f=>{
                const qtd=calc.ativos.filter(v=>{const d=diasNoEstoque(v);return d>=f.min&&d<=f.max}).length
                const pct=calc.ativos.length>0?(qtd/calc.ativos.length)*100:0
                return(
                  <div key={f.label} style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontWeight:600,fontSize:13}}>{f.label}</span>
                      <div style={{display:'flex',gap:10}}><span style={{...mono,fontWeight:700,color:f.color}}>{qtd}v</span><span style={{fontSize:11,color:C.muted}}>{fmtPct(pct)}</span></div>
                    </div>
                    <GaugeBar value={qtd} max={Math.max(calc.ativos.length,1)} color={f.color} height={10}/>
                  </div>
                )
              })}
            </Card>
          </div>
        </div>
      )}

      {/* ── RENTABILIDADE ── */}
      {secao==='rentabilidade' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24}}>
            {[['Receita',fmtR(calc.receita),C.blue],['Custo Aquisição',fmtR(calc.custoAquis),C.muted],['Custo Mnt.',fmtR(calc.custoMntVend),C.amber],['Lucro',fmtR(calc.lucro),calc.lucro>=0?C.green:C.red],['Margem',fmtPct(calc.margem),calc.margem>=(metas.margem_min||8)?C.green:C.red]].map(([l,v,c])=>(
              <div key={l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'16px 18px',borderTop:`3px solid ${c}`}}>
                <div style={lbl}>{l}</div>
                <div style={{...mono,fontSize:18,fontWeight:700,color:c,marginTop:8}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <Card>
              <SectionHead title="Composição do Resultado"/>
              {[['Receita de Vendas',calc.receita,true,C.green],['(-) Custo Aquisição',-calc.custoAquis,false,C.red],['(-) Custo Manutenção',-calc.custoMntVend,false,C.amber],['= Lucro Líquido',calc.lucro,calc.lucro>=0,calc.lucro>=0?C.cyan:C.red]].map((r,i)=>(
                <div key={r[0]} style={{marginBottom:12,paddingBottom:i===2?12:0,borderBottom:i===2?`1px solid ${C.border}`:'none'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:i===3?800:500,color:i===3?C.text:C.muted}}>{r[0]}</span>
                    <span style={{...mono,fontSize:13,fontWeight:700,color:r[3]}}>{r[2]?'+':''}{fmtR(Math.abs(r[1]))}</span>
                  </div>
                  <GaugeBar value={Math.abs(r[1])} max={Math.max(calc.receita,1)} color={r[3]} height={i===3?8:5}/>
                </div>
              ))}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:16}}>
                {[['Ticket Médio',fmtR(calc.ticketMedio),C.blue],['ROI Estoque',fmtPct(calc.roiEstoque),calc.roiEstoque>=10?C.green:C.red]].map(([l,v,c])=>(
                  <div key={l} style={{background:C.cardHi,borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
                    <div style={lbl}>{l}</div>
                    <div style={{...mono,fontWeight:700,color:c,fontSize:14,marginTop:4}}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <SectionHead title="Margem por Tipo de Veículo"/>
              {calc.porTipo.map(t=>{
                const cor=t.margem>=15?C.green:t.margem>=8?C.cyan:t.margem>=0?C.amber:C.red
                return(
                  <div key={t.tipo} style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <div><span style={{fontWeight:700,fontSize:13}}>{t.tipo}</span><span style={{fontSize:11,color:C.muted,marginLeft:8}}>{t.vendidos}v vendidos</span></div>
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
          </div>
        </div>
      )}

      {/* ── CUSTOS ── */}
      {secao==='custos' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
            <KPI label="Custo Mnt. (ativos)" value={fmtR(calc.custoMntAtivos)}  icon="⚙️" color={C.amber}/>
            <KPI label="Índice Custo/Estoque" value={fmtPct(calc.indiceCusto)}   icon="📊" color={calc.indiceCusto<(metas.custo_max_pct||5)?C.green:C.red}/>
            <KPI label="Custo Médio/Veículo"  value={fmtR(calc.ativos.length>0?calc.custoMntAtivos/calc.ativos.length:0)} icon="🔧" color={C.cyan}/>
            <KPI label="Parados Críticos"     value={calc.parados90.length}       icon="🔴" color={calc.parados90.length>0?C.red:C.green}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <Card>
              <SectionHead title="Ranking — Maior % Custo/Valor" subtitle="Veículos ativos que mais consomem"/>
              {calc.rankingCusto.map((v,i)=>{
                const cor=v.pctCusto<3?C.green:v.pctCusto<(metas.custo_max_pct||5)?C.amber:C.red
                const maxP=Math.max(calc.rankingCusto[0]?.pctCusto||1,(metas.custo_max_pct||5)*2)
                return(
                  <div key={v.id} style={{background:C.cardHi,borderRadius:9,padding:'10px 14px',marginBottom:6,borderLeft:`3px solid ${cor}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <div><span style={{...mono,fontSize:11,color:C.muted,marginRight:6}}>#{i+1}</span><span style={{fontWeight:700,fontSize:13}}>{v.modelo}</span><span style={{fontSize:11,color:C.muted,marginLeft:6}}>{v.placa}</span></div>
                      <div style={{display:'flex',gap:10,alignItems:'center'}}>
                        <span style={{fontSize:11,color:C.muted}}>{fmtR(v.custoTotal)}</span>
                        <span style={{...mono,fontWeight:800,fontSize:14,color:cor}}>{fmtPct(v.pctCusto)}</span>
                      </div>
                    </div>
                    <GaugeBar value={v.pctCusto} max={maxP} color={cor} height={5}/>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,color:C.muted}}>
                      <span>Estoque: {fmtR(v.valor_estoque)}</span><span>{fmtDias(v.diasEstoque)} em estoque</span>
                    </div>
                  </div>
                )
              })}
              {calc.rankingCusto.length===0&&<div style={{color:C.muted,textAlign:'center',padding:30}}>Sem veículos ativos</div>}
            </Card>
            <Card>
              <SectionHead title="Custo por Tipo"/>
              {calc.porTipo.map(t=>{
                const maxC=Math.max(...calc.porTipo.map(x=>x.custo),1)
                const cor=t.custo/maxC<0.4?C.green:t.custo/maxC<0.7?C.amber:C.red
                return(
                  <div key={t.tipo} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontWeight:600,fontSize:13}}>{t.tipo} <span style={{color:C.muted,fontWeight:400}}>({t.qtd}v)</span></span>
                      <span style={{...mono,fontWeight:700,color:cor}}>{fmtR(t.custo)}</span>
                    </div>
                    <GaugeBar value={t.custo} max={maxC} color={cor} height={8}/>
                    <div style={{fontSize:10,color:C.muted,marginTop:3}}>Média/veículo: {fmtR(t.qtd>0?t.custo/t.qtd:0)}</div>
                  </div>
                )
              })}
            </Card>
          </div>
        </div>
      )}

      {/* ── METAS ── */}
      {secao==='metas' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
            <SectionHead title="Painel de Metas" subtitle="Defina e acompanhe seus indicadores-alvo"/>
            <Btn onClick={()=>{setEditMetas(!editMetas);setMetasTemp(metas)}}>{editMetas?'✕ Cancelar':'✏️ Editar Metas'}</Btn>
          </div>

          {editMetas && (
            <Card style={{marginBottom:24,border:`1px solid #f59e0b44`,background:'#f59e0b08'}}>
              <div style={{...lbl,color:'#f59e0b',marginBottom:16}}>⚙ Configurar Metas</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
                {[{k:'vendas_mes',l:'Vendas/Mês (un.)'},{k:'margem_min',l:'Margem Mínima (%)'},{k:'dias_max_estoque',l:'Dias Máx. Estoque'},{k:'custo_max_pct',l:'Custo Mnt. Máx. (%)'}].map(m=>(
                  <div key={m.k}>
                    <div style={{...lbl,marginBottom:8}}>{m.l}</div>
                    <input type="number" value={metasTemp[m.k]||''} onChange={e=>setMetasTemp(p=>({...p,[m.k]:Number(e.target.value)}))}
                      style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,padding:'10px 12px',fontSize:18,width:'100%',outline:'none',...mono,fontWeight:700}}/>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:10,marginTop:16}}>
                <Btn onClick={handleSaveMetas} disabled={saving}>{saving?'Salvando...':'Salvar Metas'}</Btn>
                <Btn variant="secondary" onClick={()=>setEditMetas(false)}>Cancelar</Btn>
              </div>
            </Card>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14,marginBottom:24}}>
            <MetaGauge label="Vendas no Mês Atual" atual={calc.vendidosMes.qtd}   meta={metas.vendas_mes||3}        fmt={v=>`${Math.round(v)} vend.`}/>
            <MetaGauge label="Margem Bruta"         atual={calc.margem}            meta={metas.margem_min||8}        fmt={fmtPct}/>
            <MetaGauge label="Dias Médios Estoque"  atual={calc.mediaDiasAtivos}   meta={metas.dias_max_estoque||90} fmt={fmtDias} invert/>
            <MetaGauge label="Índice Custo/Valor"   atual={calc.indiceCusto}       meta={metas.custo_max_pct||5}     fmt={fmtPct}  invert/>
          </div>

          <Card>
            <SectionHead title="Scorecard Geral"/>
            {[
              {l:'Vendas mensais',   a:calc.vendidosMes.qtd,      m:metas.vendas_mes||3,        fmt:v=>`${v} vend.`, inv:false, det:`Meta: ${metas.vendas_mes||3}/mês`},
              {l:'Margem bruta',     a:calc.margem,               m:metas.margem_min||8,        fmt:fmtPct,         inv:false, det:`Meta ≥ ${metas.margem_min||8}%`},
              {l:'Tempo de estoque', a:calc.mediaDiasAtivos,      m:metas.dias_max_estoque||90, fmt:fmtDias,        inv:true,  det:`Meta ≤ ${metas.dias_max_estoque||90} dias`},
              {l:'Custo/valor (%)',  a:calc.indiceCusto,          m:metas.custo_max_pct||5,     fmt:fmtPct,         inv:true,  det:`Meta ≤ ${metas.custo_max_pct||5}%`},
              {l:'Parados >90d',     a:calc.parados90.length,     m:0,                           fmt:v=>`${v}v`,    inv:true,  det:'Meta: 0 veículos'},
              {l:'ROI do Estoque',   a:calc.roiEstoque,           m:10,                          fmt:fmtPct,        inv:false, det:'Meta ≥ 10%'},
            ].map(row=>{
              const ok=row.inv?row.a<=row.m:row.a>=row.m
              const warn=row.inv?row.a<=row.m*1.3:row.a>=row.m*0.7
              const cor=ok?C.green:warn?C.amber:C.red
              return(
                <div key={row.l} style={{background:C.cardHi,borderRadius:9,padding:'12px 16px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between',border:`1px solid ${cor}22`}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:28,height:28,borderRadius:7,background:cor+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:cor}}>{ok?'✓':warn?'~':'✗'}</div>
                    <div><div style={{fontWeight:600,fontSize:13}}>{row.l}</div><div style={{fontSize:11,color:C.muted}}>{row.det}</div></div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:16}}>
                    <span style={{...mono,fontSize:16,fontWeight:800,color:cor}}>{row.fmt(row.a)}</span>
                    <div style={{width:80}}><GaugeBar value={row.inv?Math.max(0,row.m*2-row.a):row.a} max={row.inv?row.m*2:Math.max(row.m*1.5,1)} color={cor} height={6}/></div>
                  </div>
                </div>
              )
            })}
            {/* Score */}
            {(()=>{
              const rows=[
                {a:calc.vendidosMes.qtd,m:metas.vendas_mes||3,inv:false},
                {a:calc.margem,m:metas.margem_min||8,inv:false},
                {a:calc.mediaDiasAtivos,m:metas.dias_max_estoque||90,inv:true},
                {a:calc.indiceCusto,m:metas.custo_max_pct||5,inv:true},
                {a:calc.parados90.length,m:0,inv:true},
                {a:calc.roiEstoque,m:10,inv:false},
              ]
              const ok=rows.filter(r=>r.inv?r.a<=r.m:r.a>=r.m).length
              const pct=(ok/rows.length)*100
              const cor=pct>=80?C.green:pct>=50?C.amber:C.red
              return(
                <div style={{marginTop:20,padding:'16px 18px',background:'#242a3e',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{...lbl,marginBottom:4}}>Score Geral de Metas</div>
                    <div style={{fontSize:12,color:C.muted}}>{ok} de {rows.length} indicadores atingidos</div>
                  </div>
                  <div style={{...mono,fontSize:36,fontWeight:800,color:cor}}>{Math.round(pct)}%</div>
                </div>
              )
            })()}
          </Card>
        </div>
      )}
    </div>
  )
}
