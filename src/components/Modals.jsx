import { useState } from 'react'
import { Modal, Btn } from './UI'
import { MoedaInput, UpperInput, SelectInput, DocInput, DateInput } from './Inputs'
import {
  TIPOS_MANUT, STATUS_SERV_CFG,
  C, today, fmtR, custoV, custoFixos
} from '../lib/constants'
import { useBreakpoint } from '../lib/responsive'

// ModalVeiculo mora em ./ModalVeiculo.jsx; re-exportado para manter os imports existentes.
export { ModalVeiculo } from './ModalVeiculo'


/* ═══════════════════════════════════════════════════════════════
   ModalVender
═══════════════════════════════════════════════════════════════ */
export function ModalVender({ data, onSave, onClose, loading }) {
  const [f, setF] = useState({
    valor_venda:    0,
    data_venda:     today(),
    comprador_nome: '',
    comprador_doc:  '',
    vendedor_nome:  '',     // NOVO v3.8
    comissao_pct:   0,      // NOVO v3.8
  })
  const set   = (k,v) => setF(p=>({...p,[k]:v}))
  const setUp = (k,v) => set(k,(v||'').toUpperCase())

  const custoMnt    = custoV(data)
  const custoFx     = custoFixos(data)
  const valorVenda  = Number(f.valor_venda) || 0
  const custoTotal  = (data.valor_compra||0) + custoMnt + custoFx
  const lucroBruto  = valorVenda - custoTotal
  const comissaoVal = lucroBruto > 0 ? lucroBruto * ((Number(f.comissao_pct)||0) / 100) : 0
  const lucroLiq    = lucroBruto - comissaoVal
  const margemPct   = valorVenda > 0 ? (lucroLiq / valorVenda) * 100 : 0
  const diffFipe    = data.valor_fipe    ? valorVenda - data.valor_fipe    : null
  const diffAnuncio = data.valor_anuncio ? valorVenda - data.valor_anuncio : null

  return (
    <Modal title={`Registrar Venda — ${data.marca_nome||''} ${data.modelo_nome||''}`} onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:16 }}>

        <DateInput label="DATA DA VENDA" value={f.data_venda} onChange={v=>set('data_venda',v)} required/>
        <MoedaInput label="Valor de Venda Real (R$)" required value={f.valor_venda} onChange={v=>set('valor_venda',v)} highlight={C.green}/>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <UpperInput label="Nome do Comprador" value={f.comprador_nome} onChange={v=>setUp('comprador_nome',v)} placeholder="PESSOA FÍSICA OU JURÍDICA"/>
          <DocInput   label="CPF / CNPJ"        value={f.comprador_doc}  onChange={v=>set('comprador_doc',v)}/>
        </div>

        {/* Vendedor e Comissão — NOVO v3.8 */}
        <div style={{ background:C.cardHi, border:`1px solid ${C.purple}44`, borderRadius:10, padding:14 }}>
          <div style={{ fontSize:11, color:C.purple, fontWeight:700, letterSpacing:1, marginBottom:12 }}>👤 VENDEDOR / COMISSÃO</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <UpperInput label="Nome do Vendedor" value={f.vendedor_nome} onChange={v=>setUp('vendedor_nome',v)} placeholder="NOME DO VENDEDOR"/>
            <div>
              <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>
                COMISSÃO (% sobre lucro)
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type="text" inputMode="numeric"
                  value={f.comissao_pct || ''}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9.]/g, '')
                    set('comissao_pct', parseFloat(v) || 0)
                  }}
                  placeholder="0"
                  style={{ background:C.surface, border:`1px solid ${C.purple}66`, borderRadius:8, color:C.purple, padding:'10px 36px 10px 14px', fontSize:15, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}
                />
                <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:C.purple, fontWeight:700, pointerEvents:'none' }}>%</span>
              </div>
              {comissaoVal > 0 && (
                <div style={{ fontSize:11, color:C.purple, marginTop:4 }}>
                  = {fmtR(comissaoVal)} sobre o lucro bruto
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Comparativo financeiro completo ── */}
      <div style={{ background:C.surface, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <div style={{ background:C.subtle, padding:'10px 14px', fontSize:11, color:C.amber, fontWeight:700, letterSpacing:1 }}>📊 COMPARATIVO FINANCEIRO COMPLETO</div>
        {[
          ['Valor de Compra',         fmtR(data.valor_compra||0),   C.muted,   false],
          ...(data.valor_anuncio ? [['Valor de Anúncio',          fmtR(data.valor_anuncio),    C.amber,   false]] : []),
          ...(data.valor_fipe    ? [['Tabela FIPE',               fmtR(data.valor_fipe),       C.blue,    false]] : []),
          ['Custo de Manutenção',     fmtR(custoMnt),               '#fb923c', false],
          ...(custoFx > 0 ? [['Custos Fixos',              fmtR(custoFx),                C.orange,  false]] : []),
          ['Custo Total',             fmtR(custoTotal),             C.text,    false],
          ['Valor de Venda Real',     fmtR(valorVenda),             C.green,   false],
          ['Lucro Bruto',             fmtR(lucroBruto),             lucroBruto>=0?C.green:C.red, false],
          ...(comissaoVal > 0 ? [[`Comissão (${f.comissao_pct}%)`, `− ${fmtR(comissaoVal)}`, C.purple, false]] : []),
          ['Lucro Líquido',           fmtR(lucroLiq),               lucroLiq>=0?C.green:C.red,  true],
          ['Margem Líquida',          `${margemPct.toFixed(1)}%`,   margemPct>=0?C.green:C.red, true],
          ...(diffFipe   !== null ? [[`vs Tabela FIPE`,   `${diffFipe>=0?'+':''}${fmtR(diffFipe)}`,     diffFipe>=0?C.green:C.red,   false]] : []),
          ...(diffAnuncio!== null ? [[`vs Anúncio`,       `${diffAnuncio>=0?'+':''}${fmtR(diffAnuncio)}`, diffAnuncio>=0?C.green:C.red, false]] : []),
        ].map(([l,v,c,bold])=>(
          <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 14px', borderBottom:`1px solid ${C.border}`, background:bold?`${c}10`:'transparent' }}>
            <span style={{ fontSize:13, color:bold?C.text:C.muted, fontWeight:bold?700:400 }}>{l}</span>
            <span style={{ fontSize:13, fontWeight:bold?800:700, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, marginTop:20 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn variant="success" style={{ flex:1 }}
          onClick={()=>onSave({
            ...data, ...f,
            valor_venda: valorVenda,
            status: 'vendido',
          })}
          disabled={loading||!valorVenda}>
          {loading?'Salvando...':'Confirmar Venda'}
        </Btn>
      </div>
    </Modal>
  )
}

/* ── ModalServico ─────────────────────────────────────────────── */
// Formata moeda mostrando centavos reais sem arredondamento
const fmtRReal = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2})

export function ModalServico({ data, veiculoId, prestadores, onSave, onClose, loading }) {
  const { isMobile } = useBreakpoint()
  const [f, setF] = useState(data||{ veiculo_id:veiculoId, tipo:'', descricao:'', data_servico:today(), prestador_id:'', custo_pecas:0, custo_mao:0, outros:0, status:'pendente', garantia:'', obs:'' })
  const set   = (k,v) => setF(p=>({...p,[k]:v}))
  // Quando tipo='Peças', apenas custo_pecas é habilitado
  const soPecas = f.tipo === 'Peças'
  const total = (Number(f.custo_pecas)||0) + (soPecas ? 0 : (Number(f.custo_mao)||0)+(Number(f.outros)||0))
  const cols3 = isMobile?'1fr':'1fr 1fr 1fr'
  const cols2 = isMobile?'1fr':'1fr 1fr'
  return (
    <Modal title={data?'Editar Serviço':'Registrar Serviço'} wide onClose={onClose}>
      <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14 }}>
        <SelectInput label="Tipo de Serviço" required value={f.tipo} onChange={v=>set('tipo',v)} options={TIPOS_MANUT}/>
        <DateInput label="DATA" value={f.data_servico} onChange={v=>set('data_servico',v)}/>
        <SelectInput label="Status" value={f.status} onChange={v=>set('status',v)} options={Object.entries(STATUS_SERV_CFG).map(([k,v])=>({value:k,label:v.label}))}/>
      </div>
      <div style={{ marginTop:14, marginBottom:14 }}>
        <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>DESCRIÇÃO <span style={{ color:C.red }}>*</span></label>
        <textarea value={(f.descricao||'').toUpperCase()} onChange={e=>set('descricao',e.target.value.toUpperCase())} placeholder="DESCREVA O SERVIÇO..." rows={2}
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit', resize:'vertical', textTransform:'uppercase' }}/>
      </div>
      <SelectInput label="Prestador / Oficina" value={f.prestador_id} onChange={v=>set('prestador_id',Number(v)||null)} options={prestadores.map(p=>({value:p.id,label:p.nome}))}/>
      {soPecas && (
        <div style={{ marginTop:10, background:`${C.blue}12`, border:`1px solid ${C.blue}33`, borderRadius:8, padding:'8px 12px', fontSize:11, color:C.blue }}>
          ℹ️ Tipo <strong>Peças</strong>: apenas o campo Custo de Peças é habilitado.
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14, marginTop:14 }}>
        <MoedaInput label="Custo Peças (R$)" value={f.custo_pecas} onChange={v=>set('custo_pecas',v)}/>
        <MoedaInput label="Mão de Obra (R$)" value={soPecas ? 0 : f.custo_mao} onChange={v=>set('custo_mao',v)} disabled={soPecas}/>
        <MoedaInput label="Outros (R$)"      value={soPecas ? 0 : f.outros}    onChange={v=>set('outros',v)}    disabled={soPecas}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:cols2, gap:14, marginTop:14 }}>
        <UpperInput label="Garantia" value={f.garantia} onChange={v=>set('garantia',(v||'').toUpperCase())} placeholder="EX: 6 MESES"/>
        <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b33', borderRadius:8, padding:'10px 14px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:4 }}>CUSTO TOTAL</div>
          <div style={{ fontSize:22, fontWeight:800, color:C.amber, fontFamily:"'JetBrains Mono',monospace" }}>{fmtRReal(total)}</div>
        </div>
      </div>
      <div style={{ marginTop:14, marginBottom:20 }}>
        <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>OBSERVAÇÕES</label>
        <textarea value={(f.obs||'').toUpperCase()} onChange={e=>set('obs',e.target.value.toUpperCase())} placeholder="NOTAS ADICIONAIS..." rows={2}
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit', resize:'vertical', textTransform:'uppercase' }}/>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn style={{ flex:1 }} onClick={()=>onSave({...f,id:data?.id,custo_pecas:Number(f.custo_pecas)||0,custo_mao:soPecas?0:Number(f.custo_mao)||0,outros:soPecas?0:Number(f.outros)||0,prestador_id:f.prestador_id||null})} disabled={loading}>
          {loading?'Salvando...':data?'Salvar':'Registrar Serviço'}
        </Btn>
      </div>
    </Modal>
  )
}

/* ── ModalPrestador ───────────────────────────────────────────── */
const STAR_COLORS=['','#ef4444','#f97316','#eab308','#3b82f6','#22d3a0']
export function ModalPrestador({ data, onSave, onClose, loading }) {
  const { isMobile } = useBreakpoint()
  const [f, setF] = useState(data||{ nome:'', tipo:'Mecânica', telefone:'', email:'', cnpj:'', endereco:'', avaliacao:5, ativo:true })
  const set   = (k,v) => setF(p=>({...p,[k]:v}))
  const setUp = (k,v) => set(k,(v||'').toUpperCase())
  return (
    <Modal title={data?'Editar Prestador':'Novo Prestador'} onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <UpperInput label="Nome / Razão Social" required value={f.nome} onChange={v=>setUp('nome',v)} placeholder="NOME DA OFICINA"/>
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:14 }}>
          <SelectInput label="Tipo de Serviço" value={f.tipo} onChange={v=>set('tipo',v)} options={TIPOS_MANUT}/>
          <UpperInput  label="Telefone"        value={f.telefone} onChange={v=>setUp('telefone',v)} placeholder="(11) 99999-9999"/>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>E-MAIL</label>
            <input type="email" value={f.email||''} onChange={e=>set('email',e.target.value.toLowerCase())} placeholder="email@oficina.com.br"
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
          </div>
          <DocInput label="CNPJ / CPF" value={f.cnpj} onChange={v=>set('cnpj',v)}/>
        </div>
        <UpperInput label="Endereço" value={f.endereco} onChange={v=>setUp('endereco',v)} placeholder="RUA, NÚMERO - CIDADE"/>
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
        <Btn style={{ flex:1 }} onClick={()=>onSave({...f,id:data?.id,avaliacao:Number(f.avaliacao)})} disabled={loading}>
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
