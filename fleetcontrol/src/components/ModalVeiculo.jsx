import { useState } from 'react'
import { Modal, Input, Btn } from './UI'
import { TIPOS_VEICULO, COMBUSTIVEIS, STATUS_VEICULO_CFG } from '../lib/constants'
import { today } from '../lib/helpers'

export default function ModalVeiculo({ data, onSave, onClose }) {
  const [f, setF] = useState(data || {
    placa:'', modelo:'', tipo:'Van', ano:'', km:0,
    cor:'', chassi:'', combustivel:'Diesel',
    valor_estoque:0, data_entrada:today(), obs:'', status:'pendente'
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  const handleSave = async () => {
    if (!f.placa || !f.modelo) { setErr('Placa e Modelo são obrigatórios.'); return }
    setSaving(true)
    setErr('')
    try {
      await onSave({
        ...f,
        km:            Number(f.km)||0,
        ano:           Number(f.ano)||0,
        valor_estoque: Number(f.valor_estoque)||0,
      })
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <Modal title={data ? 'Editar Veículo' : 'Novo Veículo'} wide onClose={onClose}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        <Input label="Placa"            value={f.placa}          onChange={v=>set('placa',v)}          required placeholder="ABC-1234"/>
        <Input label="Modelo"           value={f.modelo}         onChange={v=>set('modelo',v)}         required placeholder="Ex: Ford Transit"/>
        <Input label="Tipo"             value={f.tipo}           onChange={v=>set('tipo',v)}           options={TIPOS_VEICULO}/>
        <Input label="Ano"              value={f.ano}            onChange={v=>set('ano',v)}            type="number" placeholder="2023"/>
        <Input label="KM Atual"         value={f.km}             onChange={v=>set('km',v)}             type="number" placeholder="0"/>
        <Input label="Cor"              value={f.cor}            onChange={v=>set('cor',v)}            placeholder="Branco"/>
        <Input label="Chassi"           value={f.chassi}         onChange={v=>set('chassi',v)}         placeholder="9BWZZZ..."/>
        <Input label="Combustível"      value={f.combustivel}    onChange={v=>set('combustivel',v)}    options={COMBUSTIVEIS}/>
        <Input label="Valor Estoque (R$)" value={f.valor_estoque} onChange={v=>set('valor_estoque',v)} type="number" placeholder="0"/>
        <Input label="Data Entrada"     value={f.data_entrada}   onChange={v=>set('data_entrada',v)}   type="date"/>
        <Input label="Status"           value={f.status}         onChange={v=>set('status',v)}
          options={Object.entries(STATUS_VEICULO_CFG).filter(([k])=>k!=='vendido').map(([k,v])=>({value:k,label:v.label}))}/>
      </div>
      <Input label="Observações" value={f.obs} onChange={v=>set('obs',v)} placeholder="Informações adicionais..." style={{marginTop:14}}/>
      {err && <p style={{color:'#f4485e',fontSize:12,marginTop:10}}>{err}</p>}
      <div style={{display:'flex',gap:10,marginTop:20}}>
        <Btn variant="secondary" style={{flex:1}} onClick={onClose}>Cancelar</Btn>
        <Btn style={{flex:1}} onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : data ? 'Salvar Alterações' : 'Adicionar Veículo'}</Btn>
      </div>
    </Modal>
  )
}
