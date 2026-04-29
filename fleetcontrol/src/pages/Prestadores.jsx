import { useState } from 'react'
import { Btn, SectionHead, Stars, Spinner, ErrorMsg } from '../components/UI'
import ModalPrestador from '../components/ModalPrestador'
import { fmtR, custoVeiculo } from '../lib/helpers'

export default function Prestadores({ prestadores, veiculos, loading, error, refetch, ops }) {
  const [modal, setModal] = useState(null)

  if (loading) return <Spinner/>
  if (error)   return <ErrorMsg message={error} onRetry={refetch}/>

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <SectionHead title="Prestadores de Serviço" subtitle="Oficinas, mecânicos e fornecedores"/>
        <Btn onClick={()=>setModal({data:null})}>+ Novo Prestador</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
        {prestadores.map(pr => {
          const servs = veiculos.flatMap(v=>(v.servicos||[]).filter(s=>s.prestador_id===pr.id))
          const total = servs.reduce((s,m)=>s+(m.custo_pecas||0)+(m.custo_mao||0)+(m.outros||0),0)
          return (
            <div key={pr.id} style={{background:'#12151e',border:'1px solid #1c2030',borderRadius:12,padding:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div>
                  <div style={{fontWeight:800,fontSize:15,marginBottom:3}}>{pr.nome}</div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{background:'#f59e0b18',color:'#f59e0b',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10}}>{pr.tipo}</span>
                    <Stars n={pr.avaliacao}/>
                  </div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <Btn variant="ghost" small onClick={()=>setModal({data:pr})}>✏️</Btn>
                  <Btn variant="danger" small onClick={()=>ops.deletePrestador(pr.id)}>🗑</Btn>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12,marginBottom:12}}>
                {[['📞',pr.telefone||'—'],['📧',pr.email||'—'],['🏢',pr.cnpj||'—'],['📍',pr.endereco||'—']].map(([i,v])=>(
                  <div key={i} style={{display:'flex',gap:5,color:'#5a6480'}}><span>{i}</span><span style={{color:'#dde3f0'}}>{v}</span></div>
                ))}
              </div>
              <div style={{borderTop:'1px solid #1c2030',paddingTop:12,display:'flex',justifyContent:'space-between',fontSize:12}}>
                <span style={{color:'#5a6480'}}>{servs.length} serviço(s)</span>
                <span style={{color:'#f59e0b',fontWeight:700}}>{fmtR(total)}</span>
              </div>
            </div>
          )
        })}
        {prestadores.length===0&&<div style={{color:'#5a6480',padding:40,textAlign:'center',gridColumn:'1/-1'}}>Nenhum prestador cadastrado.</div>}
      </div>

      {modal && (
        <ModalPrestador data={modal.data}
          onSave={async d=>{ modal.data?.id ? await ops.updatePrestador(modal.data.id,d) : await ops.createPrestador(d); setModal(null) }}
          onClose={()=>setModal(null)}/>
      )}
    </div>
  )
}
