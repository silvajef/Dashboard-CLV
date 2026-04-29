import { useState } from 'react'
import { Modal, Input, Btn } from './UI'
import { fmtR, today, custoVeiculo } from '../lib/helpers'

export default function ModalVender({ veiculo, onSave, onClose }) {
  const [f, setF] = useState({ valor_venda:'', data_venda:today(), comprador_nome:'', comprador_doc:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  const custoMnt = custoVeiculo(veiculo.servicos)
  const lucroEst = (Number(f.valor_venda)||0) - veiculo.valor_estoque - custoMnt

  const handleSave = async () => {
    if (!f.valor_venda) { setErr('Informe o valor de venda.'); return }
    setSaving(true); setErr('')
    try { await onSave(veiculo.id, { ...f, valor_venda: Number(f.valor_venda) }) }
    catch(e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <Modal title={`Registrar Venda — ${veiculo.modelo}`} onClose={onClose}>
      <p style={{color:'#5a6480',fontSize:13,marginTop:0,marginBottom:16}}>Preencha os dados da venda para registrar a saída do estoque.</p>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Input label="Data da Venda"      value={f.data_venda}     onChange={v=>set('data_venda',v)}     type="date" required/>
        <Input label="Valor de Venda (R$)"value={f.valor_venda}    onChange={v=>set('valor_venda',v)}    type="number" required placeholder="0"/>
        <Input label="Nome do Comprador"  value={f.comprador_nome} onChange={v=>set('comprador_nome',v)} placeholder="Pessoa Física ou Jurídica"/>
        <Input label="CPF / CNPJ"         value={f.comprador_doc}  onChange={v=>set('comprador_doc',v)}  placeholder="000.000.000-00"/>
      </div>
      <div style={{marginTop:16,background:'#0e1018',borderRadius:8,padding:14,fontSize:13,display:'flex',flexDirection:'column',gap:6}}>
        {[['Custo de Manutenção',fmtR(custoMnt),'#5a6480'],['Valor de Estoque',fmtR(veiculo.valor_estoque),'#5a6480'],['Lucro Estimado',fmtR(lucroEst),lucroEst>=0?'#22d3a0':'#f4485e']].map(([l,v,c])=>(
          <div key={l} style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#5a6480'}}>{l}</span><span style={{fontWeight:700,color:c}}>{v}</span></div>
        ))}
      </div>
      {err && <p style={{color:'#f4485e',fontSize:12,marginTop:10}}>{err}</p>}
      <div style={{display:'flex',gap:10,marginTop:20}}>
        <Btn variant="secondary" style={{flex:1}} onClick={onClose}>Cancelar</Btn>
        <Btn variant="success"   style={{flex:1}} onClick={handleSave} disabled={saving}>{saving?'Salvando...':'Confirmar Venda'}</Btn>
      </div>
    </Modal>
  )
}
