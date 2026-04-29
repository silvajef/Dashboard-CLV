import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, KPI, SectionHead, GaugeBar, Spinner, ErrorMsg } from '../components/UI'
import { Badge } from '../components/UI'
import { STATUS_VEICULO_CFG } from '../lib/constants'
import { fmtR, fmtPct, custoVeiculo, diasNoEstoque, mesAno } from '../lib/helpers'

export default function Dashboard({ veiculos, loading, error, refetch }) {
  const navigate = useNavigate()

  const s = useMemo(() => {
    const ativos   = veiculos.filter(v => v.status !== 'vendido')
    const vendidos = veiculos.filter(v => v.status === 'vendido')
    const custoMntAtivos = ativos.reduce((s,v) => s + custoVeiculo(v.servicos), 0)
    const valorEstoque   = ativos.reduce((s,v) => s + (v.valor_estoque||0), 0)
    const receita  = vendidos.reduce((s,v) => s + (v.valor_venda||0), 0)
    const custoTotal = vendidos.reduce((s,v) => s + (v.valor_estoque||0) + custoVeiculo(v.servicos), 0)
    const lucro    = receita - custoTotal
    const margem   = receita > 0 ? (lucro/receita)*100 : 0
    const porStatus = Object.keys(STATUS_VEICULO_CFG).reduce((a,k) => ({...a,[k]:veiculos.filter(v=>v.status===k).length}),{})

    // Vendas por mês
    const mesesMap = {}
    vendidos.forEach(v => {
      if (!v.data_venda) return
      const m = mesAno(v.data_venda)
      if (!mesesMap[m]) mesesMap[m] = { mes:m, qtd:0, lucro:0 }
      mesesMap[m].qtd++
      mesesMap[m].lucro += (v.valor_venda||0)-(v.valor_estoque||0)-custoVeiculo(v.servicos)
    })
    const mesesVenda = Object.values(mesesMap).sort((a,b)=>a.mes.localeCompare(b.mes)).slice(-6)

    return { ativos:ativos.length, vendidos:vendidos.length,
      pronto:porStatus.pronto||0, manutencao:porStatus.manutencao||0, pendente:porStatus.pendente||0,
      custoMntAtivos, valorEstoque, receita, lucro, margem, porStatus, mesesVenda }
  }, [veiculos])

  if (loading) return <Spinner/>
  if (error)   return <ErrorMsg message={error} onRetry={refetch}/>

  const alertas = veiculos.filter(v => v.status === 'manutencao' || v.status === 'pendente')

  return (
    <div>
      <SectionHead title="Visão Geral" subtitle={`${veiculos.length} veículos cadastrados`}/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <KPI label="Estoque Ativo"    value={s.ativos}     icon="🚛" color="#4f8ef7" sub={`Valor: ${fmtR(s.valorEstoque)}`}/>
        <KPI label="Prontos p/ Venda" value={s.pronto}     icon="✅" color="#22d3a0" sub="Disponíveis agora"/>
        <KPI label="Em Manutenção"    value={s.manutencao} icon="⚙️" color="#f59e0b" sub={`+ ${s.pendente} pendentes`}/>
        <KPI label="Vendidos"         value={s.vendidos}   icon="🏷" color="#a78bfa" sub={`Lucro: ${fmtR(s.lucro)}`}/>
        <KPI label="Margem Média"     value={fmtPct(s.margem)} icon="📈" color={s.margem>=8?'#22d3a0':'#f4485e'} sub="sobre vendas realizadas"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:20}}>
        {/* Alertas */}
        <Card>
          <SectionHead title="⚠️ Alertas Prioritários" subtitle={`${alertas.length} veículo(s) requerem atenção`}/>
          {alertas.length === 0
            ? <div style={{textAlign:'center',color:'#22d3a0',padding:'20px 0',fontWeight:700}}>✓ Nenhum alerta no momento</div>
            : alertas.map(v => (
                <div key={v.id} onClick={()=>navigate(`/estoque/${v.id}`)}
                  style={{background:'#171c28',border:`1px solid ${STATUS_VEICULO_CFG[v.status].color}33`,borderRadius:9,padding:'12px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{v.modelo} — {v.placa}</div>
                    <div style={{fontSize:12,color:'#5a6480'}}>{v.tipo} · {v.ano} · {(v.km||0).toLocaleString('pt-BR')} km</div>
                  </div>
                  <Badge status={v.status} cfg={STATUS_VEICULO_CFG}/>
                </div>
              ))
          }
        </Card>

        {/* Meses */}
        <Card>
          <SectionHead title="Vendas Recentes" subtitle="Por mês"/>
          {s.mesesVenda.length === 0
            ? <div style={{color:'#5a6480',fontSize:13,textAlign:'center',padding:'20px 0'}}>Sem vendas registradas</div>
            : s.mesesVenda.map(m => {
                const maxL = Math.max(...s.mesesVenda.map(x=>Math.abs(x.lucro)),1)
                return (
                  <div key={m.mes} style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:13}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{m.mes}</span>
                      <div style={{display:'flex',gap:10}}>
                        <span style={{color:'#a78bfa'}}>{m.qtd}v</span>
                        <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:m.lucro>=0?'#22d3a0':'#f4485e'}}>{fmtR(m.lucro)}</span>
                      </div>
                    </div>
                    <GaugeBar value={Math.abs(m.lucro)} max={maxL} color={m.lucro>=0?'#4f8ef7':'#f4485e'} height={5}/>
                  </div>
                )
              })
          }
        </Card>
      </div>

      {/* Distribuição status */}
      <Card>
        <SectionHead title="Distribuição por Status"/>
        {Object.entries(STATUS_VEICULO_CFG).map(([k,cfg]) => {
          const count = s.porStatus[k]||0
          const pct   = veiculos.length > 0 ? (count/veiculos.length)*100 : 0
          return (
            <div key={k} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:13}}>
                <span style={{color:cfg.color,fontWeight:600}}>{cfg.icon} {cfg.label}</span>
                <span style={{color:'#5a6480'}}>{count} ({pct.toFixed(0)}%)</span>
              </div>
              <GaugeBar value={count} max={Math.max(veiculos.length,1)} color={cfg.color} height={7}/>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
