import { useState } from 'react'
import { Modal, Input, Btn } from './UI'
import { TIPOS_MANUT, STATUS_SERV_CFG } from '../lib/constants'
import { fmtR, today } from '../lib/helpers'

export default function ModalServico({ data, veiculoId, prestadores, onSave, onClose }) {
  const [f, setF] = useState(data || {
    tipo:'', descricao:'', data:today(), prestador_id:'',
    custo_pecas:0, custo_mao:0, outros:0,
    status:'pendente', garantia:'', obs:''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  const total = (Number(f.custo_pecas)||0)+(Number(f.custo_mao)||0)+(Number(f.outros)||0)

  const handleSave = async () => {
    if (!f.tipo || !f.descricao) { setErr('Tipo e Descrição são obrigatórios.'); return }
    setSaving(true); setErr('')
    try {
      await onSave(veiculoId, {
        ...f,
        custo_pecas:   Number(f.custo_pecas)||0,
        custo_mao:     Number(f.custo_mao)||0,
        outros:        Number(f.outros)||0,
        prestador_id:  f.prestador_id ? Number(f.prestador_id) : null,
      })
    } catch(e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <Modal title={data ? 'Editar Serviço' : 'Registrar Serviço'} wide onClose={onClose}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        <Input label="Tipo de Serviço" value={f.tipo}   onChange={v=>set('tipo',v)}   options={TIPOS_MANUT} required/>
        <Input label="Data"            value={f.data}   onChange={v=>set('data',v)}   type="date" required/>
        <Input label="Status"          value={f.status} onChange={v=>set('status',v)}
          options={Object.entries(STATUS_SERV_CFG).map(([k,v])=>({value:k,label:v.label}))}/>
      </div>
      <Input label="Descrição do Serviço" value={f.descricao} onChange={v=>set('descricao',v)} required placeholder="Descreva o serviço..." style={{marginTop:14}}/>
      <Input label="Prestador / Oficina"  value={f.prestador_id} onChange={v=>set('prestador_id',v)}
        options={prestadores.map(p=>({value:p.id,label:p.nome}))} style={{marginTop:14}}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginTop:14}}>
        <Input label="Custo Peças (R$)"       value={f.custo_pecas} onChange={v=>set('custo_pecas',v)} type="number" placeholder="0"/>
        <Input label="Custo Mão de Obra (R$)" value={f.custo_mao}   onChange={v=>set('custo_mao',v)}   type="number" placeholder="0"/>
        <Input label="Outros Custos (R$)"     value={f.outros}      onChange={v=>set('outros',v)}       type="number" placeholder="0"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
        <Input label="Garantia" value={f.garantia} onChange={v=>set('garantia',v)} placeholder="Ex: 6 meses"/>
        <div style={{background:'#f59e0b18',border:'1px solid #f59e0b33',borderRadius:8,padding:'10px 14px'}}>
          <div style={{fontSize:11,color:'#5a6480',fontWeight:700,marginBottom:4}}>CUSTO TOTAL</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:800,color:'#f59e0b'}}>{fmtR(total)}</div>
        </div>
      </div>
      <Input label="Observações" value={f.obs} onChange={v=>set('obs',v)} placeholder="Notas adicionais..." style={{marginTop:14}}/>
      {err && <p style={{color:'#f4485e',fontSize:12,marginTop:10}}>{err}</p>}
      <div style={{display:'flex',gap:10,marginTop:20}}>
        <Btn variant="secondary" style={{flex:1}} onClick={onClose}>Cancelar</Btn>
        <Btn style={{flex:1}} onClick={handleSave} disabled={saving}>{saving?'Salvando...':data?'Salvar':'Registrar Serviço'}</Btn>
      </div>
    </Modal>
  )
}
