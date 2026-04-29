import { SectionHead, Badge, Spinner, ErrorMsg } from '../components/UI'
import { STATUS_SERV_CFG } from '../lib/constants'
import { fmtR } from '../lib/helpers'

export default function Historico({ veiculos, prestadores, loading, error, refetch }) {
  if (loading) return <Spinner/>
  if (error)   return <ErrorMsg message={error} onRetry={refetch}/>

  const nomePrestador = id => prestadores.find(p=>p.id===id)?.nome || '—'

  const todos = veiculos
    .flatMap(v => (v.servicos||[]).map(s => ({ ...s, veiculo:v })))
    .sort((a,b) => b.data?.localeCompare(a.data||''))

  return (
    <div>
      <SectionHead title="Histórico de Serviços" subtitle={`${todos.length} registro(s) no total`}/>
      {todos.length === 0
        ? <div style={{textAlign:'center',color:'#5a6480',padding:60}}>Nenhum serviço registrado.</div>
        : todos.map(s => {
            const total = (s.custo_pecas||0)+(s.custo_mao||0)+(s.outros||0)
            const cfg   = STATUS_SERV_CFG[s.status]||{color:'#5a6480'}
            return (
              <div key={`${s.id}-${s.veiculo.id}`} style={{background:'#12151e',border:'1px solid #1c2030',borderRadius:10,padding:'14px 18px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between',borderLeft:`3px solid ${cfg.color}`}}>
                <div style={{display:'flex',gap:14,alignItems:'center'}}>
                  <div style={{background:'#0e1018',borderRadius:8,padding:'8px 10px',textAlign:'center',minWidth:72}}>
                    <div style={{fontSize:10,color:'#5a6480'}}>DATA</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:12}}>{s.data}</div>
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{s.veiculo.modelo} — {s.veiculo.placa}</div>
                    <div style={{fontSize:12,color:'#5a6480'}}>{s.tipo}: {s.descricao}</div>
                    <div style={{fontSize:12,color:'#5a6480'}}>Prestador: {nomePrestador(s.prestador_id)}</div>
                  </div>
                </div>
                <div style={{textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:'#f59e0b',fontSize:15}}>{fmtR(total)}</div>
                  <Badge status={s.status} cfg={STATUS_SERV_CFG}/>
                </div>
              </div>
            )
          })
      }
    </div>
  )
}
