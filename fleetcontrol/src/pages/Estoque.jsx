import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Btn, Badge, Spinner, ErrorMsg, SectionHead, Tabs, Card, Input, Modal } from '../components/UI'
import ModalVeiculo  from '../components/ModalVeiculo'
import ModalServico  from '../components/ModalServico'
import ModalVender   from '../components/ModalVender'
import { STATUS_VEICULO_CFG, STATUS_SERV_CFG, TIPOS_VEICULO } from '../lib/constants'
import { fmtR, fmtN, custoVeiculo, today } from '../lib/helpers'

export default function Estoque({ veiculos, prestadores, loading, error, refetch, ops }) {
  const navigate = useNavigate()
  const [modal,  setModal]  = useState(null)
  const [filtro, setFiltro] = useState({ status:'todos', tipo:'todos', busca:'' })

  const filtrados = veiculos.filter(v => {
    if (v.status === 'vendido') return false
    if (filtro.status !== 'todos' && v.status !== filtro.status) return false
    if (filtro.tipo   !== 'todos' && v.tipo   !== filtro.tipo)   return false
    if (filtro.busca) {
      const b = filtro.busca.toLowerCase()
      return v.placa.toLowerCase().includes(b) || v.modelo.toLowerCase().includes(b)
    }
    return true
  })

  if (loading) return <Spinner/>
  if (error)   return <ErrorMsg message={error} onRetry={refetch}/>

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <SectionHead title="Estoque Ativo" subtitle={`${filtrados.length} veículo(s) exibido(s)`}/>
        <Btn onClick={()=>setModal({type:'veiculo',data:null})}>+ Novo Veículo</Btn>
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <input value={filtro.busca} onChange={e=>setFiltro(p=>({...p,busca:e.target.value}))}
          placeholder="🔍 Buscar placa ou modelo..."
          style={{background:'#0e1018',border:'1px solid #1c2030',borderRadius:8,color:'#dde3f0',padding:'9px 14px',fontSize:14,width:260,outline:'none'}}/>
        <select value={filtro.status} onChange={e=>setFiltro(p=>({...p,status:e.target.value}))}
          style={{background:'#0e1018',border:'1px solid #1c2030',borderRadius:8,color:'#dde3f0',padding:'9px 14px',fontSize:14,outline:'none'}}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_VEICULO_CFG).filter(([k])=>k!=='vendido').map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtro.tipo} onChange={e=>setFiltro(p=>({...p,tipo:e.target.value}))}
          style={{background:'#0e1018',border:'1px solid #1c2030',borderRadius:8,color:'#dde3f0',padding:'9px 14px',fontSize:14,outline:'none'}}>
          <option value="todos">Todos os tipos</option>
          {TIPOS_VEICULO.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {filtrados.length === 0
        ? <div style={{textAlign:'center',color:'#5a6480',padding:60}}>Nenhum veículo encontrado.</div>
        : filtrados.map(v => {
            const custo = custoVeiculo(v.servicos)
            const cfg   = STATUS_VEICULO_CFG[v.status]
            return (
              <div key={v.id} onClick={()=>navigate(`/estoque/${v.id}`)}
                style={{background:'#12151e',border:`1px solid #1c2030`,borderRadius:12,padding:'14px 18px',marginBottom:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',borderLeft:`4px solid ${cfg?.color||'#1c2030'}`}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <span style={{fontSize:22}}>{v.tipo==='Pick-up'?'🛻':v.tipo?.includes('Caminhão')?'🚛':'🚐'}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{v.modelo}</div>
                    <div style={{fontSize:12,color:'#5a6480'}}>{v.placa} · {v.ano} · {fmtN(v.km)} km · {v.cor}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:20}}>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:700,color:'#f59e0b',fontSize:14}}>{fmtR(v.valor_estoque)}</div>
                    <div style={{fontSize:11,color:'#5a6480'}}>Mnt: {fmtR(custo)}</div>
                  </div>
                  <Badge status={v.status} cfg={STATUS_VEICULO_CFG}/>
                  <span style={{color:'#5a6480',fontSize:18}}>›</span>
                </div>
              </div>
            )
          })
      }

      {modal?.type==='veiculo' && (
        <ModalVeiculo data={modal.data}
          onSave={async dados => { await (dados.id ? ops.updateVeiculo(dados.id,dados) : ops.createVeiculo(dados)); setModal(null) }}
          onClose={()=>setModal(null)}/>
      )}
    </div>
  )
}
