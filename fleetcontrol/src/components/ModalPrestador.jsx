import { useState } from 'react'
import { Modal, Input, Btn } from './UI'
import { TIPOS_MANUT } from '../lib/constants'

const STAR_COLORS = ['','#ef4444','#f97316','#eab308','#3b82f6','#22d3a0']

export default function ModalPrestador({ data, onSave, onClose }) {
  const [f, setF] = useState(data || { nome:'', tipo:'Mecânica', telefone:'', email:'', cnpj:'', endereco:'', avaliacao:5, ativo:true })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  const handleSave = async () => {
    if (!f.nome) { setErr('Nome é obrigatório.'); return }
    setSaving(true); setErr('')
    try { await onSave({ ...f, avaliacao: Number(f.avaliacao) }) }
    catch(e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <Modal title={data ? 'Editar Prestador' : 'Novo Prestador'} onClose={onClose}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Input label="Nome / Razão Social" value={f.nome}     onChange={v=>set('nome',v)}     required placeholder="Nome da oficina"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Input label="Tipo de Serviço" value={f.tipo}     onChange={v=>set('tipo',v)}     options={TIPOS_MANUT}/>
          <Input label="Telefone"        value={f.telefone} onChange={v=>set('telefone',v)} placeholder="(11) 99999-9999"/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Input label="E-mail"    value={f.email}    onChange={v=>set('email',v)}    type="email" placeholder="email@oficina.com.br"/>
          <Input label="CNPJ/CPF" value={f.cnpj}     onChange={v=>set('cnpj',v)}     placeholder="00.000.000/0001-00"/>
        </div>
        <Input label="Endereço" value={f.endereco} onChange={v=>set('endereco',v)} placeholder="Rua, número – Cidade"/>
        <div>
          <label style={{fontSize:11,color:'#5a6480',fontWeight:700,letterSpacing:0.5,display:'block',marginBottom:8}}>AVALIAÇÃO</label>
          <div style={{display:'flex',gap:8}}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} onClick={()=>set('avaliacao',n)} style={{background:n<=f.avaliacao?STAR_COLORS[f.avaliacao]+'33':'transparent',border:`1px solid ${n<=f.avaliacao?STAR_COLORS[f.avaliacao]+'66':'#1c2030'}`,borderRadius:8,padding:'8px 14px',fontSize:18,cursor:'pointer',color:n<=f.avaliacao?STAR_COLORS[f.avaliacao]:'#1c2030'}}>★</button>
            ))}
          </div>
        </div>
      </div>
      {err && <p style={{color:'#f4485e',fontSize:12,marginTop:10}}>{err}</p>}
      <div style={{display:'flex',gap:10,marginTop:20}}>
        <Btn variant="secondary" style={{flex:1}} onClick={onClose}>Cancelar</Btn>
        <Btn style={{flex:1}} onClick={handleSave} disabled={saving}>{saving?'Salvando...':data?'Salvar Alterações':'Cadastrar Prestador'}</Btn>
      </div>
    </Modal>
  )
}
