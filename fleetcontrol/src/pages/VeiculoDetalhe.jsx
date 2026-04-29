import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Btn, Badge, Tabs, Card, SectionHead, Modal } from '../components/UI'
import ModalVeiculo from '../components/ModalVeiculo'
import ModalServico from '../components/ModalServico'
import ModalVender  from '../components/ModalVender'
import { STATUS_VEICULO_CFG, STATUS_SERV_CFG } from '../lib/constants'
import { fmtR, fmtN, custoVeiculo } from '../lib/helpers'

export default function VeiculoDetalhe({ veiculo, prestadores, ops }) {
  const navigate  = useNavigate()
  const [tab,     setTab]    = useState('info')
  const [modal,   setModal]  = useState(null)
  const [saving,  setSaving] = useState(false)

  const nomePrestador = id => prestadores.find(p=>p.id===id)?.nome || '—'

  const handleStatus = async (novoStatus) => {
    setSaving(true)
    await ops.updateVeiculo(veiculo.id, { status: novoStatus })
    setSaving(false)
  }

  const handleExcluir = async () => {
    await ops.deleteVeiculo(veiculo.id)
    navigate('/estoque')
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Btn variant="ghost" small onClick={()=>navigate('/estoque')}>← Voltar</Btn>
          <span style={{color:'#5a6480'}}>|</span>
          <span style={{fontWeight:700,fontSize:16}}>{veiculo.modelo}</span>
          <Badge status={veiculo.status} cfg={STATUS_VEICULO_CFG}/>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Btn variant="secondary" small onClick={()=>setModal({type:'editar'})}>✏️ Editar</Btn>
          {veiculo.status !== 'vendido' && <Btn variant="success" small onClick={()=>setModal({type:'vender'})}>🏷 Registrar Venda</Btn>}
          <Btn variant="danger" small onClick={()=>setModal({type:'excluir'})}>🗑 Excluir</Btn>
        </div>
      </div>

      <Tabs
        tabs={[{id:'info',icon:'📄',label:'Informações'},{id:'servicos',icon:'🔧',label:`Serviços (${(veiculo.servicos||[]).length})`},{id:'custos',icon:'💰',label:'Custos'}]}
        active={tab} onChange={setTab}
      />

      <div style={{marginTop:20}}>
        {/* ── INFO ── */}
        {tab==='info' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <Card>
              <SectionHead title="Dados do Veículo"/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[['Placa',veiculo.placa],['Modelo',veiculo.modelo],['Tipo',veiculo.tipo],['Ano',veiculo.ano],['KM',fmtN(veiculo.km)+' km'],['Cor',veiculo.cor],['Combustível',veiculo.combustivel],['Chassi',veiculo.chassi||'—'],['Data Entrada',veiculo.data_entrada||'—'],['Valor Estoque',fmtR(veiculo.valor_estoque)]].map(([k,v])=>(
                  <div key={k} style={{background:'#0e1018',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontSize:10,color:'#5a6480',marginBottom:2,fontWeight:700,letterSpacing:0.5}}>{k.toUpperCase()}</div>
                    <div style={{fontWeight:600,fontSize:13}}>{v}</div>
                  </div>
                ))}
              </div>
              {veiculo.obs && <div style={{marginTop:12,background:'#0e1018',borderRadius:8,padding:'10px 12px'}}><div style={{fontSize:10,color:'#5a6480',marginBottom:2,fontWeight:700}}>OBSERVAÇÕES</div><div style={{fontSize:13}}>{veiculo.obs}</div></div>}
            </Card>

            <Card>
              <SectionHead title="Alterar Status"/>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:20}}>
                {Object.entries(STATUS_VEICULO_CFG).filter(([k])=>k!=='vendido').map(([k,cfg])=>(
                  <button key={k} onClick={()=>handleStatus(k)} disabled={saving}
                    style={{background:veiculo.status===k?cfg.color+'33':'transparent',color:cfg.color,border:`1px solid ${cfg.color}55`,borderRadius:20,padding:'7px 16px',fontSize:12,cursor:'pointer',fontWeight:700}}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
              {veiculo.status === 'vendido' && (
                <div style={{background:'#a78bfa18',border:'1px solid #a78bfa44',borderRadius:10,padding:16}}>
                  <div style={{fontWeight:700,color:'#a78bfa',marginBottom:8}}>🏷 Dados da Venda</div>
                  {[['Data',veiculo.data_venda],['Valor',fmtR(veiculo.valor_venda)],['Comprador',veiculo.comprador_nome],['Doc.',veiculo.comprador_doc]].map(([k,v])=>(
                    <div key={k} style={{fontSize:13,display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1c2030'}}>
                      <span style={{color:'#5a6480'}}>{k}</span><span style={{fontWeight:600}}>{v||'—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── SERVIÇOS ── */}
        {tab==='servicos' && (
          <div>
            {veiculo.status !== 'vendido' && (
              <div style={{marginBottom:16,display:'flex',justifyContent:'flex-end'}}>
                <Btn onClick={()=>setModal({type:'servico',data:null})}>+ Registrar Serviço</Btn>
              </div>
            )}
            {(veiculo.servicos||[]).length === 0
              ? <div style={{textAlign:'center',color:'#5a6480',padding:50}}>Nenhum serviço registrado.</div>
              : (veiculo.servicos||[]).map(s => {
                  const total = (s.custo_pecas||0)+(s.custo_mao||0)+(s.outros||0)
                  const cfg   = STATUS_SERV_CFG[s.status]||{color:'#5a6480'}
                  return (
                    <div key={s.id} style={{background:'#0e1018',border:'1px solid #1c2030',borderRadius:10,padding:16,marginBottom:10,borderLeft:`3px solid ${cfg.color}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontWeight:700,fontSize:15}}>{s.tipo}</span>
                          <Badge status={s.status} cfg={STATUS_SERV_CFG}/>
                        </div>
                        {veiculo.status !== 'vendido' && (
                          <div style={{display:'flex',gap:6}}>
                            <Btn variant="ghost" small onClick={()=>setModal({type:'servico',data:s})}>✏️</Btn>
                            <Btn variant="danger" small onClick={()=>ops.deleteServico(veiculo.id,s.id)}>🗑</Btn>
                          </div>
                        )}
                      </div>
                      <p style={{margin:'0 0 10px',fontSize:13}}>{s.descricao}</p>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8}}>
                        {[['PRESTADOR',nomePrestador(s.prestador_id),'#dde3f0'],['DATA',s.data,'#dde3f0'],['PEÇAS',fmtR(s.custo_pecas),'#dde3f0'],['MÃO DE OBRA',fmtR(s.custo_mao),'#dde3f0'],['OUTROS',fmtR(s.outros),'#dde3f0'],['TOTAL',fmtR(total),'#f59e0b']].map(([l,v,c])=>(
                          <div key={l} style={{background:'#12151e',borderRadius:7,padding:'8px 10px'}}>
                            <div style={{fontSize:10,color:'#5a6480',fontWeight:700,marginBottom:2}}>{l}</div>
                            <div style={{fontSize:12,fontWeight:l==='TOTAL'?800:600,color:c}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {s.garantia && <div style={{fontSize:11,color:'#5a6480',marginTop:8}}>🛡 Garantia: {s.garantia}</div>}
                      {s.obs      && <div style={{fontSize:12,color:'#94a3b8',marginTop:4,fontStyle:'italic'}}>{s.obs}</div>}
                    </div>
                  )
                })
            }
          </div>
        )}

        {/* ── CUSTOS ── */}
        {tab==='custos' && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
              {[['Custo Peças',   (veiculo.servicos||[]).reduce((s,m)=>s+(m.custo_pecas||0),0),'#4f8ef7'],
                ['Mão de Obra',   (veiculo.servicos||[]).reduce((s,m)=>s+(m.custo_mao||0),0),'#22d3a0'],
                ['Outros',        (veiculo.servicos||[]).reduce((s,m)=>s+(m.outros||0),0),'#22d4dd'],
                ['Total Mnt.',    custoVeiculo(veiculo.servicos),'#f59e0b'],
                ['Valor Estoque', veiculo.valor_estoque,'#a78bfa'],
                ['Custo + Estoque',veiculo.valor_estoque+custoVeiculo(veiculo.servicos),'#f4485e'],
              ].map(([l,v,c])=>(
                <div key={l} style={{background:'#12151e',border:'1px solid #1c2030',borderRadius:10,padding:'14px 16px',borderTop:`3px solid ${c}`}}>
                  <div style={{fontSize:11,color:'#5a6480',marginBottom:4}}>{l}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:800,color:c}}>{fmtR(v)}</div>
                </div>
              ))}
            </div>
            <Card>
              <SectionHead title="Detalhamento por Serviço"/>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr>{['Tipo','Data','Prestador','Peças','Mão Obra','Outros','Total'].map(h=>(
                    <th key={h} style={{background:'#0e1018',padding:'9px 12px',textAlign:['Tipo','Data','Prestador'].includes(h)?'left':'right',fontSize:11,fontWeight:700,color:'#5a6480',letterSpacing:0.5}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {(veiculo.servicos||[]).map(s=>(
                    <tr key={s.id} style={{borderBottom:'1px solid #1c2030'}}>
                      <td style={{padding:'9px 12px',fontWeight:600}}>{s.tipo}</td>
                      <td style={{padding:'9px 12px',color:'#5a6480'}}>{s.data}</td>
                      <td style={{padding:'9px 12px',color:'#5a6480'}}>{nomePrestador(s.prestador_id)}</td>
                      {[s.custo_pecas,s.custo_mao,s.outros,(s.custo_pecas||0)+(s.custo_mao||0)+(s.outros||0)].map((v,i)=>(
                        <td key={i} style={{padding:'9px 12px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:i===3?800:400,color:i===3?'#f59e0b':'#dde3f0'}}>{fmtR(v)}</td>
                      ))}
                    </tr>
                  ))}
                  {(veiculo.servicos||[]).length===0&&<tr><td colSpan={7} style={{textAlign:'center',color:'#5a6480',padding:24}}>Sem serviços</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>

      {/* Modais */}
      {modal?.type==='editar' && (
        <ModalVeiculo data={veiculo} onSave={async d=>{await ops.updateVeiculo(veiculo.id,d);setModal(null)}} onClose={()=>setModal(null)}/>
      )}
      {modal?.type==='vender' && (
        <ModalVender veiculo={veiculo} onSave={async (id,d)=>{await ops.marcarVendido(id,d);setModal(null);navigate('/vendidos')}} onClose={()=>setModal(null)}/>
      )}
      {modal?.type==='servico' && (
        <ModalServico data={modal.data} veiculoId={veiculo.id} prestadores={prestadores}
          onSave={async (vid,d)=>{ modal.data?.id ? await ops.updateServico(vid,modal.data.id,d) : await ops.createServico(vid,d); setModal(null) }}
          onClose={()=>setModal(null)}/>
      )}
      {modal?.type==='excluir' && (
        <Modal title="Confirmar Exclusão" onClose={()=>setModal(null)}>
          <p style={{color:'#5a6480',fontSize:14}}>Excluir <strong style={{color:'#dde3f0'}}>{veiculo.modelo} — {veiculo.placa}</strong>? Esta ação não pode ser desfeita.</p>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn variant="secondary" style={{flex:1}} onClick={()=>setModal(null)}>Cancelar</Btn>
            <Btn variant="danger"    style={{flex:1}} onClick={handleExcluir}>Excluir Veículo</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
