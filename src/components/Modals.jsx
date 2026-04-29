import { useState } from 'react'
import { Modal, Input, Btn, Grid } from './UI'
import FipeSearch from './FipeSearch'
import { TIPOS_VEICULO, TIPOS_MANUT, COMBUSTIVEIS, STATUS_VEICULO_CFG, STATUS_SERV_CFG, C, today, fmtR, custoV, parseFipeValor } from '../lib/constants'
import { useBreakpoint } from '../lib/responsive'

/* ── ModalVeiculo (com FIPE integrada) ──────────────────────────── */
export function ModalVeiculo({ data, onSave, onClose, loading }) {
  const { isMobile } = useBreakpoint()
  const [f, setF] = useState(data || {
    placa:'', modelo:'', tipo:'Van', ano:'', km:0, cor:'', chassi:'',
    combustivel:'Diesel', valor_estoque:'', valor_fipe:'', codigo_fipe:'',
    data_entrada:today(), obs:'', status:'pendente'
  })
  const [showFipe, setShowFipe] = useState(false)
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  const handleFipeResult = (resultado) => {
    const v = parseFipeValor(resultado.valor)
    set('valor_fipe', v)
    set('codigo_fipe', resultado.codigoFipe)
    // Sugerir como valor de estoque se ainda não preenchido
    if (!f.valor_estoque) set('valor_estoque', v)
    setShowFipe(false)
  }

  const cols = isMobile ? '1fr' : '1fr 1fr 1fr'

  return (
    <Modal title={data ? 'Editar Veículo' : 'Novo Veículo'} wide onClose={onClose}>
      <div style={{ display:'grid', gridTemplateColumns:cols, gap:14, marginBottom:14 }}>
        <Input label="Placa" value={f.placa} onChange={v=>set('placa',v)} required placeholder="ABC-1234"/>
        <Input label="Modelo" value={f.modelo} onChange={v=>set('modelo',v)} required placeholder="Ex: Ford Transit"/>
        <Input label="Tipo" value={f.tipo} onChange={v=>set('tipo',v)} options={TIPOS_VEICULO}/>
        <Input label="Ano" value={f.ano} onChange={v=>set('ano',v)} type="number" placeholder="2023"/>
        <Input label="KM Atual" value={f.km} onChange={v=>set('km',v)} type="number" placeholder="0"/>
        <Input label="Cor" value={f.cor} onChange={v=>set('cor',v)} placeholder="Branco"/>
        <Input label="Chassi" value={f.chassi} onChange={v=>set('chassi',v)} placeholder="9BWZZZ..."/>
        <Input label="Combustível" value={f.combustivel} onChange={v=>set('combustivel',v)} options={COMBUSTIVEIS}/>
        <Input label="Data Entrada" value={f.data_entrada} onChange={v=>set('data_entrada',v)} type="date"/>
      </div>

      {/* Bloco de valores */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:14 }}>
        <div style={{ fontSize:12, color:C.amber, fontWeight:700, marginBottom:12 }}>💰 VALORES</div>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap:12, marginBottom:12 }}>
          <Input label="Valor de Estoque (R$)" value={f.valor_estoque} onChange={v=>set('valor_estoque',v)} type="number" placeholder="0"/>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>VALOR FIPE (R$)</label>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input
                type="number" value={f.valor_fipe||''}
                onChange={e=>set('valor_fipe',e.target.value)}
                placeholder="Consultar →"
                style={{ background:C.surface, border:`1px solid ${C.amber}55`, borderRadius:8, color:C.amber, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit', fontWeight:700 }}
              />
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:4 }}>
            {f.codigo_fipe && <div style={{ fontSize:11, color:C.muted }}>Cód: <span style={{ color:C.text, fontFamily:'monospace' }}>{f.codigo_fipe}</span></div>}
            <Btn variant={showFipe?'secondary':'ghost'} small onClick={()=>setShowFipe(p=>!p)}>
              {showFipe ? '✕ Fechar FIPE' : '📊 Consultar FIPE'}
            </Btn>
          </div>
        </div>

        {/* Diff FIPE vs Estoque */}
        {f.valor_fipe && f.valor_estoque && (
          <div style={{ background:C.card, borderRadius:8, padding:'8px 12px', display:'flex', gap:16, flexWrap:'wrap', fontSize:12 }}>
            {(() => {
              const diff = (Number(f.valor_estoque)||0) - (Number(f.valor_fipe)||0)
              const pct  = f.valor_fipe ? (diff/Number(f.valor_fipe))*100 : 0
              const cor  = diff < 0 ? C.green : diff > 0 ? C.red : C.muted
              return <>
                <span style={{ color:C.muted }}>vs FIPE:</span>
                <span style={{ color:cor, fontWeight:700 }}>{diff>=0?'+':''}{fmtR(diff)}</span>
                <span style={{ color:cor, fontWeight:700 }}>({pct>=0?'+':''}{pct.toFixed(1)}%)</span>
                <span style={{ color:C.muted }}>{diff<0?'▼ Abaixo da tabela':diff>0?'▲ Acima da tabela':'= Na tabela'}</span>
              </>
            })()}
          </div>
        )}

        {/* FIPE Search Cascata */}
        {showFipe && (
          <div style={{ marginTop:14 }}>
            <FipeSearch tipoVeiculo={f.tipo} onSelectPreco={handleFipeResult}/>
          </div>
        )}
      </div>

      <Input label="Status" value={f.status} onChange={v=>set('status',v)}
        options={Object.entries(STATUS_VEICULO_CFG).filter(([k])=>k!=='vendido').map(([k,v])=>({value:k,label:v.label}))}
        style={{ marginBottom:14 }}/>
      <Input label="Observações" value={f.obs} onChange={v=>set('obs',v)} placeholder="Informações adicionais..." rows={2}/>
      <div style={{ display:'flex', gap:10, marginTop:24 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn style={{ flex:1 }} onClick={()=>onSave({...f,km:Number(f.km)||0,ano:Number(f.ano)||0,valor_estoque:Number(f.valor_estoque)||0,valor_fipe:Number(f.valor_fipe)||0})} disabled={loading}>
          {loading?'Salvando...':data?'Salvar Alterações':'Adicionar Veículo'}
        </Btn>
      </div>
    </Modal>
  )
}

/* ── ModalVender ────────────────────────────────────────────────── */
export function ModalVender({ data, onSave, onClose, loading }) {
  const [f, setF] = useState({ valor_venda:'', data_venda:today(), comprador_nome:'', comprador_doc:'' })
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  const custo = custoV(data)
  const lucro = (Number(f.valor_venda)||0)-(data.valor_estoque||0)-custo
  const { isMobile } = useBreakpoint()
  return (
    <Modal title={`Registrar Venda — ${data.modelo}`} onClose={onClose}>
      <p style={{ color:C.muted, fontSize:13, marginTop:0 }}>Preencha os dados da venda para mover este veículo ao histórico.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Input label="Data da Venda" value={f.data_venda} onChange={v=>set('data_venda',v)} type="date" required/>
        <Input label="Valor de Venda (R$)" value={f.valor_venda} onChange={v=>set('valor_venda',v)} type="number" required placeholder="0"/>
        <Input label="Nome do Comprador" value={f.comprador_nome} onChange={v=>set('comprador_nome',v)} placeholder="Pessoa Física ou Jurídica"/>
        <Input label="CPF / CNPJ" value={f.comprador_doc} onChange={v=>set('comprador_doc',v)} placeholder="000.000.000-00"/>
      </div>
      <div style={{ marginTop:16, background:C.surface, borderRadius:8, padding:14, fontSize:13 }}>
        {[['Custo Manutenção',fmtR(custo),C.muted],['Valor Estoque',fmtR(data.valor_estoque),C.muted],
          ...(data.valor_fipe?[['Valor FIPE',fmtR(data.valor_fipe),C.amber]]:[] ),
          ['Lucro Estimado',fmtR(lucro),lucro>=0?C.green:C.red]
        ].map(([l,v,c])=>(
          <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${C.border}` }}>
            <span style={{ color:C.muted }}>{l}</span>
            <span style={{ fontWeight:700, color:c }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:10, marginTop:20 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn variant="success" style={{ flex:1 }} onClick={()=>onSave({...data,...f,valor_venda:Number(f.valor_venda)||0,status:'vendido'})} disabled={loading}>
          {loading?'Salvando...':'Confirmar Venda'}
        </Btn>
      </div>
    </Modal>
  )
}

/* ── ModalServico ───────────────────────────────────────────────── */
export function ModalServico({ data, veiculoId, prestadores, onSave, onClose, loading }) {
  const { isMobile } = useBreakpoint()
  const [f, setF] = useState(data||{ veiculo_id:veiculoId, tipo:'', descricao:'', data_servico:today(), prestador_id:'', custo_pecas:0, custo_mao:0, outros:0, status:'pendente', garantia:'', obs:'' })
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  const total = (Number(f.custo_pecas)||0)+(Number(f.custo_mao)||0)+(Number(f.outros)||0)
  return (
    <Modal title={data?'Editar Serviço':'Registrar Serviço'} wide onClose={onClose}>
      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr', gap:14 }}>
        <Input label="Tipo de Serviço" value={f.tipo} onChange={v=>set('tipo',v)} options={TIPOS_MANUT} required/>
        <Input label="Data" value={f.data_servico} onChange={v=>set('data_servico',v)} type="date" required/>
        <Input label="Status" value={f.status} onChange={v=>set('status',v)} options={Object.entries(STATUS_SERV_CFG).map(([k,v])=>({value:k,label:v.label}))}/>
      </div>
      <Input label="Descrição" value={f.descricao} onChange={v=>set('descricao',v)} required placeholder="Descreva o serviço..." style={{ marginTop:14 }}/>
      <Input label="Prestador / Oficina" value={f.prestador_id} onChange={v=>set('prestador_id',Number(v)||null)} options={prestadores.map(p=>({value:p.id,label:p.nome}))} style={{ marginTop:14 }}/>
      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'1fr 1fr 1fr', gap:14, marginTop:14 }}>
        <Input label="Custo Peças (R$)" value={f.custo_pecas} onChange={v=>set('custo_pecas',v)} type="number" placeholder="0"/>
        <Input label="Mão de Obra (R$)" value={f.custo_mao} onChange={v=>set('custo_mao',v)} type="number" placeholder="0"/>
        <Input label="Outros (R$)" value={f.outros} onChange={v=>set('outros',v)} type="number" placeholder="0"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:14, marginTop:14 }}>
        <Input label="Garantia" value={f.garantia} onChange={v=>set('garantia',v)} placeholder="Ex: 6 meses"/>
        <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b33', borderRadius:8, padding:'10px 14px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:4 }}>CUSTO TOTAL</div>
          <div style={{ fontSize:22, fontWeight:800, color:C.amber, fontFamily:"'JetBrains Mono',monospace" }}>{fmtR(total)}</div>
        </div>
      </div>
      <Input label="Observações" value={f.obs} onChange={v=>set('obs',v)} placeholder="Notas adicionais..." style={{ marginTop:14 }} rows={2}/>
      <div style={{ display:'flex', gap:10, marginTop:24 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn style={{ flex:1 }} onClick={()=>onSave({...f,custo_pecas:Number(f.custo_pecas)||0,custo_mao:Number(f.custo_mao)||0,outros:Number(f.outros)||0,prestador_id:f.prestador_id||null})} disabled={loading}>
          {loading?'Salvando...':data?'Salvar':'Registrar Serviço'}
        </Btn>
      </div>
    </Modal>
  )
}

/* ── ModalPrestador ─────────────────────────────────────────────── */
const STAR_COLORS=['','#ef4444','#f97316','#eab308','#3b82f6','#22d3a0']
export function ModalPrestador({ data, onSave, onClose, loading }) {
  const { isMobile } = useBreakpoint()
  const [f, setF] = useState(data||{ nome:'', tipo:'Mecânica', telefone:'', email:'', cnpj:'', endereco:'', avaliacao:5, ativo:true })
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  return (
    <Modal title={data?'Editar Prestador':'Novo Prestador'} onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Input label="Nome / Razão Social" value={f.nome} onChange={v=>set('nome',v)} required placeholder="Nome da oficina"/>
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:14 }}>
          <Input label="Tipo de Serviço" value={f.tipo} onChange={v=>set('tipo',v)} options={TIPOS_MANUT}/>
          <Input label="Telefone" value={f.telefone} onChange={v=>set('telefone',v)} placeholder="(11) 99999-9999"/>
          <Input label="E-mail" value={f.email} onChange={v=>set('email',v)} type="email"/>
          <Input label="CNPJ / CPF" value={f.cnpj} onChange={v=>set('cnpj',v)} placeholder="00.000.000/0001-00"/>
        </div>
        <Input label="Endereço" value={f.endereco} onChange={v=>set('endereco',v)} placeholder="Rua, número - Cidade"/>
        <div>
          <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:8 }}>AVALIAÇÃO</label>
          <div style={{ display:'flex', gap:8 }}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} onClick={()=>set('avaliacao',n)} style={{ background:n<=f.avaliacao?STAR_COLORS[f.avaliacao]+'33':'transparent', border:`1px solid ${n<=f.avaliacao?STAR_COLORS[f.avaliacao]+'66':C.border}`, borderRadius:8, padding:'8px 14px', fontSize:18, cursor:'pointer', color:n<=f.avaliacao?STAR_COLORS[f.avaliacao]:C.muted }}>★</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:24 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn style={{ flex:1 }} onClick={()=>onSave({...f,avaliacao:Number(f.avaliacao)})} disabled={loading}>
          {loading?'Salvando...':data?'Salvar Alterações':'Cadastrar'}
        </Btn>
      </div>
    </Modal>
  )
}

export function ModalConfirm({ title, message, onConfirm, onClose, loading }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ color:C.muted, fontSize:14 }}>{message}</p>
      <div style={{ display:'flex', gap:10, marginTop:20 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn variant="danger" style={{ flex:1 }} onClick={onConfirm} disabled={loading}>{loading?'Aguarde...':'Confirmar'}</Btn>
      </div>
    </Modal>
  )
}
