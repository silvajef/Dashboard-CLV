import { useState } from 'react'
import { Modal, Btn } from './UI'
import { MoedaInput, UpperInput, SelectFipe, SelectInput } from './Inputs'
import { useFipe, parseFipeValor } from '../hooks/useFipe'
import {
  TIPOS_MANUT, COMBUSTIVEIS,
  STATUS_VEICULO_CFG, STATUS_SERV_CFG,
  C, today, fmtR, custoV
} from '../lib/constants'
import { useBreakpoint } from '../lib/responsive'

const TIPOS_VEICULO = ['Van','Pick-up','Caminhão Leve','Caminhão Médio','Caminhão Pesado','Micro-ônibus','Outro']

/* ── DiffFipe ─────────────────────────────────────────────────── */
function DiffFipe({ valorEstoque, valorFipe }) {
  if (!valorFipe || !valorEstoque) return null
  const diff = Number(valorEstoque) - Number(valorFipe)
  const pct  = (diff / Number(valorFipe)) * 100
  const cor  = diff < 0 ? C.green : diff > 0 ? C.red : C.muted
  return (
    <div style={{ background:C.card, border:`1px solid ${cor}33`, borderRadius:8, padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginTop:8 }}>
      <span style={{ fontSize:12, color:C.muted }}>Comparativo vs FIPE</span>
      <div style={{ display:'flex', gap:12 }}>
        <span style={{ fontSize:13, fontWeight:800, color:cor, fontFamily:"'JetBrains Mono',monospace" }}>{diff>=0?'+':''}{fmtR(diff)}</span>
        <span style={{ fontSize:12, fontWeight:700, color:cor }}>({pct>=0?'+':''}{pct.toFixed(1)}%)</span>
        <span style={{ fontSize:11, color:cor }}>{diff<0?'▼ Abaixo da tabela':diff>0?'▲ Acima da tabela':'= Na tabela'}</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ModalVeiculo
═══════════════════════════════════════════════════════════════ */
export function ModalVeiculo({ data, onSave, onClose, loading }) {
  const { isMobile } = useBreakpoint()

  // Estado do formulário — campos nomeados igual ao banco
  const [f, setF] = useState({
    placa:         data?.placa         || '',
    tipo:          data?.tipo          || 'Van',
    cor:           data?.cor           || '',
    km:            data?.km            || 0,
    combustivel:   data?.combustivel   || 'DIESEL',
    data_entrada:  data?.data_entrada  || today(),
    obs:           data?.obs           || '',
    status:        data?.status        || 'pendente',
    marca_nome:    data?.marca_nome    || '',
    modelo_nome:   data?.modelo_nome   || '',
    ano_modelo:    data?.ano_modelo    || '',
    codigo_fipe:   data?.codigo_fipe   || '',
    valor_fipe:    data?.valor_fipe    || 0,
    valor_estoque: data?.valor_estoque || 0,
  })

  const set    = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setUp  = (k, v) => set(k, (v || '').toUpperCase())

  const fipe = useFipe(f.tipo)

  // ── Handlers FIPE — recebem (codigo, nome) do SelectFipe ──────
  const handleMarca = (codigo, nome) => {
    console.log('[ModalVeiculo] handleMarca:', { codigo, nome })
    fipe.selecionarMarca(codigo, nome)
    setF(p => ({
      ...p,
      marca_nome:  nome || '',
      modelo_nome: '',
      ano_modelo:  '',
      codigo_fipe: '',
      valor_fipe:  0,
    }))
  }

  const handleModelo = (codigo, nome) => {
    console.log('[ModalVeiculo] handleModelo:', { codigo, nome })
    fipe.selecionarModelo(codigo, nome, fipe.sels.marcaCod)
    setF(p => ({
      ...p,
      modelo_nome: nome || '',
      ano_modelo:  '',
      codigo_fipe: '',
      valor_fipe:  0,
    }))
  }

  const handleAno = (codigo, nome) => {
    console.log('[ModalVeiculo] handleAno:', { codigo, nome })
    fipe.selecionarAno(codigo, nome, fipe.sels.marcaCod, fipe.sels.modeloCod)
    setF(p => ({ ...p, ano_modelo: nome || '' }))
  }

  // Sincroniza preço FIPE quando resultado chega
  const pr = fipe.preco
  if (pr) {
    const codigoFipe = pr.CodigoFipe || pr.codigoFipe || ''
    if (codigoFipe && codigoFipe !== f.codigo_fipe) {
      const valorFipe = parseFipeValor(pr.Valor || pr.valor || '')
      setF(p => ({
        ...p,
        codigo_fipe:  codigoFipe,
        valor_fipe:   valorFipe,
        combustivel:  (pr.Combustivel || pr.combustivel || p.combustivel).toUpperCase(),
      }))
    }
  }

  // Log do estado antes de salvar
  const handleSave = () => {
    console.log('[ModalVeiculo] SALVANDO:', f)
    onSave({ ...f, id: data?.id })
  }

  const cols3 = isMobile ? '1fr' : '1fr 1fr 1fr'
  const cols2 = isMobile ? '1fr' : '1fr 1fr'

  return (
    <Modal title={data ? 'Editar Veículo' : 'Novo Veículo'} wide onClose={onClose}>

      {/* ── IDENTIFICAÇÃO ── */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, color:C.amber, fontWeight:700, letterSpacing:1, marginBottom:12 }}>🚗 IDENTIFICAÇÃO</div>
        <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14 }}>
          <UpperInput label="Placa" value={f.placa} onChange={v=>setUp('placa',v)} required placeholder="ABC-1234"/>
          <UpperInput label="Cor"   value={f.cor}   onChange={v=>setUp('cor',v)}   placeholder="BRANCO"/>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>KM ATUAL</label>
            <input
              type="text" inputMode="numeric"
              value={(f.km||0).toLocaleString('pt-BR')}
              onChange={e => set('km', parseInt(e.target.value.replace(/\D/g,''),10)||0)}
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}
            />
          </div>
        </div>
      </div>

      {/* ── FIPE: TIPO / MARCA / MODELO / ANO ── */}
      <div style={{ background:C.cardHi, border:`1px solid ${C.amber}33`, borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.amber, fontWeight:700, letterSpacing:1 }}>📊 MARCA / MODELO / ANO — TABELA FIPE</div>
          {fipe.loading && <span style={{ fontSize:11, color:C.muted }}>⟳ buscando {fipe.loading}...</span>}
        </div>

        {/* Tipo — determina endpoint (carros vs caminhoes) */}
        <div style={{ marginBottom:14 }}>
          <SelectInput
            label="Tipo de Veículo"
            value={f.tipo}
            onChange={v => { set('tipo', v); fipe.reset() }}
            options={TIPOS_VEICULO}
          />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14 }}>
          <SelectFipe
            label="Marca" required
            value={fipe.sels.marcaCod}
            onChange={handleMarca}
            options={fipe.marcas}
            placeholder="Selecione a marca"
            loading={fipe.loading==='marcas'}
            disabled={!fipe.marcas.length && fipe.loading!=='marcas'}
          />
          <SelectFipe
            label="Modelo" required
            value={fipe.sels.modeloCod}
            onChange={handleModelo}
            options={fipe.modelos}
            placeholder={fipe.sels.marcaCod ? 'Selecione o modelo' : '← primeiro a marca'}
            loading={fipe.loading==='modelos'}
            disabled={!fipe.sels.marcaCod}
          />
          <SelectFipe
            label="Ano" required
            value={fipe.sels.anoCod}
            onChange={handleAno}
            options={fipe.anos}
            placeholder={fipe.sels.modeloCod ? 'Selecione o ano' : '← primeiro o modelo'}
            loading={fipe.loading==='anos'}
            disabled={!fipe.sels.modeloCod}
          />
        </div>

        {/* Preview dos nomes selecionados — debug visual */}
        {(f.marca_nome || f.modelo_nome || f.ano_modelo) && (
          <div style={{ marginTop:10, padding:'8px 12px', background:C.surface, borderRadius:7, fontSize:12, color:C.muted, display:'flex', gap:8, flexWrap:'wrap' }}>
            <span>Selecionado:</span>
            {f.marca_nome  && <span style={{ color:C.text, fontWeight:600 }}>{f.marca_nome}</span>}
            {f.modelo_nome && <span style={{ color:C.text, fontWeight:600 }}>{f.modelo_nome}</span>}
            {f.ano_modelo  && <span style={{ color:C.text, fontWeight:600 }}>{f.ano_modelo}</span>}
          </div>
        )}

        {/* Erro FIPE */}
        {fipe.erro && (
          <div style={{ marginTop:10, background:C.redDim, border:`1px solid ${C.red}44`, borderRadius:7, padding:'8px 12px', fontSize:12, color:C.red }}>
            ⚠️ {fipe.erro.includes('429') ? 'Limite FIPE atingido. Aguarde alguns minutos.' : `Erro FIPE: ${fipe.erro}`}
          </div>
        )}

        {/* Resultado FIPE */}
        {fipe.loading==='preco' && (
          <div style={{ marginTop:12, padding:'10px 14px', background:C.surface, borderRadius:8, fontSize:12, color:C.muted }}>
            ⟳ Consultando preço na tabela FIPE...
          </div>
        )}

        {pr && fipe.loading!=='preco' && (
          <div style={{ marginTop:12, background:`${C.green}10`, border:`1px solid ${C.green}33`, borderRadius:8, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ fontSize:10, color:C.muted, fontWeight:700, marginBottom:4 }}>
                  VALOR TABELA FIPE — {pr.MesReferencia || pr.mesReferencia}
                </div>
                <div style={{ fontSize:26, fontWeight:800, color:C.green, fontFamily:"'JetBrains Mono',monospace" }}>
                  {pr.Valor || pr.valor}
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                  {pr.Marca||pr.marca} {pr.Modelo||pr.modelo} · {pr.AnoModelo||pr.anoModelo} · {pr.Combustivel||pr.combustivel}
                  {' · Cód: '}<span style={{ fontFamily:'monospace' }}>{pr.CodigoFipe||pr.codigoFipe}</span>
                </div>
              </div>
              <span style={{ fontSize:11, color:C.green, fontWeight:700, background:`${C.green}20`, padding:'5px 10px', borderRadius:20 }}>
                ✓ Preenchido automaticamente
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── VALORES ── */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:11, color:C.amber, fontWeight:700, letterSpacing:1, marginBottom:12 }}>💰 VALORES</div>
        <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14 }}>
          <MoedaInput label="Valor de Compra / Estoque (R$)" required value={f.valor_estoque} onChange={v=>set('valor_estoque',v)}/>
          <MoedaInput label="Valor Tabela FIPE (R$)" value={f.valor_fipe} onChange={v=>set('valor_fipe',v)} highlight={C.green}/>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>CÓDIGO FIPE</label>
            <input type="text" value={f.codigo_fipe||''} onChange={e=>set('codigo_fipe',e.target.value)}
              placeholder="Ex: 004278-1"
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, padding:'10px 14px', fontSize:13, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'monospace' }}/>
          </div>
        </div>
        <DiffFipe valorEstoque={f.valor_estoque} valorFipe={f.valor_fipe}/>
      </div>

      {/* ── OUTROS ── */}
      <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14, marginBottom:14 }}>
        <SelectInput label="Combustível" value={f.combustivel} onChange={v=>set('combustivel',v)} options={COMBUSTIVEIS}/>
        <div>
          <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>DATA DE ENTRADA</label>
          <input type="date" value={f.data_entrada} onChange={e=>set('data_entrada',e.target.value)}
            style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
        </div>
        <SelectInput label="Status" value={f.status} onChange={v=>set('status',v)}
          options={Object.entries(STATUS_VEICULO_CFG).filter(([k])=>k!=='vendido').map(([k,v])=>({value:k,label:v.label}))}/>
      </div>

      <div style={{ marginBottom:20 }}>
        <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>OBSERVAÇÕES</label>
        <textarea value={(f.obs||'').toUpperCase()} onChange={e=>set('obs',e.target.value.toUpperCase())}
          placeholder="INFORMAÇÕES ADICIONAIS..." rows={2}
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit', resize:'vertical', textTransform:'uppercase' }}/>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn style={{ flex:1 }} onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : data ? 'Salvar Alterações' : 'Adicionar Veículo'}
        </Btn>
      </div>
    </Modal>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ModalVender
═══════════════════════════════════════════════════════════════ */
export function ModalVender({ data, onSave, onClose, loading }) {
  const [f, setF] = useState({ valor_venda:0, data_venda:today(), comprador_nome:'', comprador_doc:'' })
  const set   = (k,v) => setF(p=>({...p,[k]:v}))
  const setUp = (k,v) => set(k,(v||'').toUpperCase())
  const custoMnt   = custoV(data)
  const valorVenda = Number(f.valor_venda)||0
  const custoTotal = (data.valor_estoque||0)+custoMnt
  const lucro      = valorVenda-custoTotal
  const margemPct  = valorVenda>0?(lucro/valorVenda)*100:0
  const diffFipe   = data.valor_fipe ? valorVenda-data.valor_fipe : null

  return (
    <Modal title={`Registrar Venda — ${data.marca_nome||''} ${data.modelo_nome||''}`} onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:16 }}>
        <div>
          <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>DATA DA VENDA</label>
          <input type="date" value={f.data_venda} onChange={e=>set('data_venda',e.target.value)}
            style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
        </div>
        <MoedaInput label="Valor de Venda (R$)" required value={f.valor_venda} onChange={v=>set('valor_venda',v)} highlight={C.green}/>
        <UpperInput label="Nome do Comprador" value={f.comprador_nome} onChange={v=>setUp('comprador_nome',v)} placeholder="PESSOA FÍSICA OU JURÍDICA"/>
        <UpperInput label="CPF / CNPJ" value={f.comprador_doc} onChange={v=>setUp('comprador_doc',v)} placeholder="000.000.000-00"/>
      </div>
      <div style={{ background:C.surface, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <div style={{ background:C.subtle, padding:'10px 14px', fontSize:11, color:C.amber, fontWeight:700, letterSpacing:1 }}>📊 COMPARATIVO FINANCEIRO</div>
        {[
          ['Valor de Compra',          fmtR(data.valor_estoque||0), C.muted,  false],
          ['Custo de Manutenção',       fmtR(custoMnt),              '#fb923c',false],
          ['Custo Total',               fmtR(custoTotal),            C.text,   false],
          ...(data.valor_fipe ? [['Tabela FIPE', fmtR(data.valor_fipe), C.blue, false]] : []),
          ['Valor de Venda',            fmtR(valorVenda),            C.green,  false],
          ['Lucro Líquido',             fmtR(lucro),                 lucro>=0?C.green:C.red, true],
          ['Margem',                    `${margemPct.toFixed(1)}%`,  margemPct>=0?C.green:C.red, true],
          ...(diffFipe!==null ? [[`vs Tabela FIPE`, `${diffFipe>=0?'+':''}${fmtR(diffFipe)}`, diffFipe>=0?C.green:C.red, false]] : []),
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
          onClick={()=>onSave({...data,...f,valor_venda:valorVenda,status:'vendido'})}
          disabled={loading||!valorVenda}>
          {loading?'Salvando...':'Confirmar Venda'}
        </Btn>
      </div>
    </Modal>
  )
}

/* ── ModalServico ─────────────────────────────────────────────── */
export function ModalServico({ data, veiculoId, prestadores, onSave, onClose, loading }) {
  const { isMobile } = useBreakpoint()
  const [f, setF] = useState(data||{ veiculo_id:veiculoId, tipo:'', descricao:'', data_servico:today(), prestador_id:'', custo_pecas:0, custo_mao:0, outros:0, status:'pendente', garantia:'', obs:'' })
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  const total = (Number(f.custo_pecas)||0)+(Number(f.custo_mao)||0)+(Number(f.outros)||0)
  const cols3 = isMobile?'1fr':'1fr 1fr 1fr'
  const cols2 = isMobile?'1fr':'1fr 1fr'
  return (
    <Modal title={data?'Editar Serviço':'Registrar Serviço'} wide onClose={onClose}>
      <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14 }}>
        <SelectInput label="Tipo de Serviço" required value={f.tipo} onChange={v=>set('tipo',v)} options={TIPOS_MANUT}/>
        <div>
          <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>DATA</label>
          <input type="date" value={f.data_servico} onChange={e=>set('data_servico',e.target.value)}
            style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
        </div>
        <SelectInput label="Status" value={f.status} onChange={v=>set('status',v)} options={Object.entries(STATUS_SERV_CFG).map(([k,v])=>({value:k,label:v.label}))}/>
      </div>
      <div style={{ marginTop:14, marginBottom:14 }}>
        <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>DESCRIÇÃO <span style={{ color:C.red }}>*</span></label>
        <textarea value={(f.descricao||'').toUpperCase()} onChange={e=>set('descricao',e.target.value.toUpperCase())} placeholder="DESCREVA O SERVIÇO..." rows={2}
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit', resize:'vertical', textTransform:'uppercase' }}/>
      </div>
      <SelectInput label="Prestador / Oficina" value={f.prestador_id} onChange={v=>set('prestador_id',Number(v)||null)} options={prestadores.map(p=>({value:p.id,label:p.nome}))}/>
      <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14, marginTop:14 }}>
        <MoedaInput label="Custo Peças (R$)" value={f.custo_pecas} onChange={v=>set('custo_pecas',v)}/>
        <MoedaInput label="Mão de Obra (R$)" value={f.custo_mao}   onChange={v=>set('custo_mao',v)}/>
        <MoedaInput label="Outros (R$)"       value={f.outros}      onChange={v=>set('outros',v)}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:cols2, gap:14, marginTop:14 }}>
        <UpperInput label="Garantia" value={f.garantia} onChange={v=>set('garantia',(v||'').toUpperCase())} placeholder="EX: 6 MESES"/>
        <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b33', borderRadius:8, padding:'10px 14px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:4 }}>CUSTO TOTAL</div>
          <div style={{ fontSize:22, fontWeight:800, color:C.amber, fontFamily:"'JetBrains Mono',monospace" }}>{fmtR(total)}</div>
        </div>
      </div>
      <div style={{ marginTop:14, marginBottom:20 }}>
        <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>OBSERVAÇÕES</label>
        <textarea value={(f.obs||'').toUpperCase()} onChange={e=>set('obs',e.target.value.toUpperCase())} placeholder="NOTAS ADICIONAIS..." rows={2}
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit', resize:'vertical', textTransform:'uppercase' }}/>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn style={{ flex:1 }} onClick={()=>onSave({...f,id:data?.id,custo_pecas:Number(f.custo_pecas)||0,custo_mao:Number(f.custo_mao)||0,outros:Number(f.outros)||0,prestador_id:f.prestador_id||null})} disabled={loading}>
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
          <UpperInput label="Telefone" value={f.telefone} onChange={v=>setUp('telefone',v)} placeholder="(11) 99999-9999"/>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>E-MAIL</label>
            <input type="email" value={f.email||''} onChange={e=>set('email',e.target.value.toLowerCase())} placeholder="email@oficina.com.br"
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
          </div>
          <UpperInput label="CNPJ / CPF" value={f.cnpj} onChange={v=>setUp('cnpj',v)} placeholder="00.000.000/0001-00"/>
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
