import { useState } from 'react'
import { Modal, Input, Btn, Grid } from './UI'
import { useFipe, parseFipeValor } from '../hooks/useFipe'
import {
  TIPOS_VEICULO, TIPOS_MANUT, COMBUSTIVEIS,
  STATUS_VEICULO_CFG, STATUS_SERV_CFG,
  C, today, fmtR, custoV
} from '../lib/constants'
import { useBreakpoint } from '../lib/responsive'

/* ── helpers locais ───────────────────────────────────────────── */
function SelectFipe({ label, value, onChange, options, placeholder, loading, disabled }) {
  const isLoading = loading && !options.length
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'flex', alignItems:'center', gap:6 }}>
        {label}
        {loading && <span style={{ fontSize:10, color:C.amber, fontWeight:400 }}>carregando...</span>}
      </label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || isLoading}
        style={{
          background: C.surface, border: `1px solid ${!disabled && options.length ? C.amber+'88' : C.border}`,
          borderRadius:8, color: value ? C.text : C.muted,
          padding:'10px 14px', fontSize:14, width:'100%',
          outline:'none', fontFamily:'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <option value=''>{isLoading ? '— carregando —' : placeholder}</option>
        {options.map(o => (
          <option key={o.codigo} value={o.codigo}>{o.nome}</option>
        ))}
      </select>
    </div>
  )
}

function DiffFipe({ valorEstoque, valorFipe }) {
  if (!valorFipe || !valorEstoque) return null
  const diff = Number(valorEstoque) - Number(valorFipe)
  const pct  = ((diff / Number(valorFipe)) * 100)
  const cor  = diff < 0 ? C.green : diff > 0 ? C.red : C.muted
  const txt  = diff < 0 ? '▼ Abaixo da tabela' : diff > 0 ? '▲ Acima da tabela' : '= Na tabela'
  return (
    <div style={{ background:C.card, border:`1px solid ${cor}33`, borderRadius:8, padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
      <span style={{ fontSize:12, color:C.muted }}>Comparativo FIPE</span>
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <span style={{ fontSize:13, fontWeight:800, color:cor, fontFamily:"'JetBrains Mono',monospace" }}>
          {diff >= 0 ? '+' : ''}{fmtR(diff)}
        </span>
        <span style={{ fontSize:12, fontWeight:700, color:cor }}>
          ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
        </span>
        <span style={{ fontSize:11, color:cor }}>{txt}</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ModalVeiculo — marca/modelo/ano integrados à FIPE
═══════════════════════════════════════════════════════════════ */
export function ModalVeiculo({ data, onSave, onClose, loading }) {
  const { isMobile } = useBreakpoint()

  const [f, setF] = useState(data || {
    placa:'', tipo:'Van', chassi:'', cor:'', km:0,
    combustivel:'Diesel', data_entrada:today(), obs:'', status:'pendente',
    // campos FIPE / financeiros
    marca_nome:'', modelo_nome:'', ano_modelo:'',
    codigo_fipe:'', valor_fipe:0,
    valor_estoque:0,
  })
  const set = (k, v) => setF(p => ({ ...p, [k]:v }))

  const fipe = useFipe(f.tipo)

  // Quando seleciona marca
  const handleMarca = (codigo) => {
    fipe.selecionarMarca(codigo)
    const nome = fipe.marcas.find(m => m.codigo === codigo)?.nome || ''
    set('marca_nome', nome)
    set('modelo_nome', '')
    set('ano_modelo', '')
    set('codigo_fipe', '')
    set('valor_fipe', 0)
  }

  // Quando seleciona modelo
  const handleModelo = (codigo) => {
    fipe.selecionarModelo(codigo, fipe.sels.marca)
    const nome = fipe.modelos.find(m => m.codigo === codigo)?.nome || ''
    set('modelo_nome', nome)
    set('ano_modelo', '')
    set('codigo_fipe', '')
    set('valor_fipe', 0)
  }

  // Quando seleciona ano → busca preço automaticamente
  const handleAno = (codigo) => {
    fipe.selecionarAno(codigo, fipe.sels.marca, fipe.sels.modelo)
    const nome = fipe.anos.find(a => a.codigo === codigo)?.nome || ''
    set('ano_modelo', nome)
  }

  // Quando preço chega, preenche automaticamente
  const prevPreco = fipe.preco
  if (fipe.preco && fipe.preco !== prevPreco) {/* handled below via effect pattern */}

  // Sincroniza resultado FIPE com os campos do form
  const precoAtual = fipe.preco
  const valorFipeNum = precoAtual
    ? parseFipeValor(precoAtual.Valor || precoAtual.valor || '')
    : 0

  // Atualiza valor_fipe quando preco chega
  if (precoAtual && valorFipeNum && f.codigo_fipe !== (precoAtual.CodigoFipe || precoAtual.codigoFipe)) {
    setF(p => ({
      ...p,
      codigo_fipe: precoAtual.CodigoFipe || precoAtual.codigoFipe || '',
      valor_fipe: valorFipeNum,
      combustivel: precoAtual.Combustivel || precoAtual.combustivel || p.combustivel,
    }))
  }

  const cols3 = isMobile ? '1fr' : '1fr 1fr 1fr'
  const cols2 = isMobile ? '1fr' : '1fr 1fr'

  return (
    <Modal title={data ? 'Editar Veículo' : 'Novo Veículo'} wide onClose={onClose}>

      {/* ── Bloco 1: Identificação ── */}
      <div style={{ marginBottom:6 }}>
        <div style={{ fontSize:11, color:C.amber, fontWeight:700, letterSpacing:1, marginBottom:12 }}>
          🚗 IDENTIFICAÇÃO
        </div>
        <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14, marginBottom:14 }}>
          <Input label="Placa" value={f.placa} onChange={v=>set('placa',v)} required placeholder="ABC-1234"/>
          <Input label="Tipo de Veículo" value={f.tipo} onChange={v=>{ set('tipo',v); fipe.reset() }} options={TIPOS_VEICULO}/>
          <Input label="Cor" value={f.cor} onChange={v=>set('cor',v)} placeholder="Branco"/>
          <Input label="Chassi" value={f.chassi} onChange={v=>set('chassi',v)} placeholder="9BWZZZ..."/>
          <Input label="KM Atual" value={f.km} onChange={v=>set('km',v)} type="number" placeholder="0"/>
          <Input label="Data Entrada" value={f.data_entrada} onChange={v=>set('data_entrada',v)} type="date"/>
        </div>
      </div>

      {/* ── Bloco 2: Consulta FIPE integrada ── */}
      <div style={{ background:C.cardHi, border:`1px solid ${C.amber}33`, borderRadius:12, padding:16, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.amber, fontWeight:700, letterSpacing:1 }}>
            📊 MARCA / MODELO / ANO — TABELA FIPE
          </div>
          {fipe.loading && (
            <span style={{ fontSize:11, color:C.muted }}>
              ⟳ buscando {fipe.loading}...
            </span>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14 }}>
          <SelectFipe
            label="Marca"
            value={fipe.sels.marca}
            onChange={handleMarca}
            options={fipe.marcas}
            placeholder="Selecione a marca"
            loading={fipe.loading === 'marcas'}
            disabled={!fipe.marcas.length && fipe.loading !== 'marcas'}
          />
          <SelectFipe
            label="Modelo"
            value={fipe.sels.modelo}
            onChange={handleModelo}
            options={fipe.modelos}
            placeholder={fipe.sels.marca ? 'Selecione o modelo' : '← Selecione a marca'}
            loading={fipe.loading === 'modelos'}
            disabled={!fipe.sels.marca}
          />
          <SelectFipe
            label="Ano"
            value={fipe.sels.ano}
            onChange={handleAno}
            options={fipe.anos}
            placeholder={fipe.sels.modelo ? 'Selecione o ano' : '← Selecione o modelo'}
            loading={fipe.loading === 'anos'}
            disabled={!fipe.sels.modelo}
          />
        </div>

        {/* Erro FIPE */}
        {fipe.erro && (
          <div style={{ marginTop:10, background:C.redDim, border:`1px solid ${C.red}44`, borderRadius:7, padding:'8px 12px', fontSize:12, color:C.red }}>
            ⚠️ {fipe.erro.includes('429') ? 'Limite de requisições FIPE atingido. Aguarde alguns minutos.' : `Erro FIPE: ${fipe.erro}`}
          </div>
        )}

        {/* Resultado FIPE preenchido automaticamente */}
        {fipe.loading === 'preco' && (
          <div style={{ marginTop:12, padding:'12px 14px', background:C.surface, borderRadius:8, fontSize:12, color:C.muted }}>
            ⟳ Consultando preço na tabela FIPE...
          </div>
        )}

        {precoAtual && fipe.loading !== 'preco' && (
          <div style={{ marginTop:12, background:`${C.green}10`, border:`1px solid ${C.green}33`, borderRadius:8, padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontSize:10, color:C.muted, fontWeight:700, marginBottom:4 }}>
                VALOR TABELA FIPE — {precoAtual.MesReferencia || precoAtual.mesReferencia}
              </div>
              <div style={{ fontSize:26, fontWeight:800, color:C.green, fontFamily:"'JetBrains Mono',monospace" }}>
                {precoAtual.Valor || precoAtual.valor}
              </div>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                {precoAtual.Marca || precoAtual.marca} {precoAtual.Modelo || precoAtual.modelo}
                {' · '}
                {precoAtual.AnoModelo || precoAtual.anoModelo}
                {' · '}
                {precoAtual.Combustivel || precoAtual.combustivel}
                {' · Cód: '}
                <span style={{ fontFamily:'monospace' }}>{precoAtual.CodigoFipe || precoAtual.codigoFipe}</span>
              </div>
            </div>
            <div style={{ fontSize:11, color:C.green, fontWeight:700, background:`${C.green}20`, padding:'6px 12px', borderRadius:20 }}>
              ✓ Preenchido automaticamente
            </div>
          </div>
        )}
      </div>

      {/* ── Bloco 3: Valores financeiros ── */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:14 }}>
        <div style={{ fontSize:11, color:C.amber, fontWeight:700, letterSpacing:1, marginBottom:12 }}>
          💰 VALORES
        </div>
        <div style={{ display:'grid', gridTemplateColumns:cols3, gap:14, marginBottom:12 }}>
          <div>
            <Input
              label="Valor de Compra / Estoque (R$)"
              value={f.valor_estoque}
              onChange={v=>set('valor_estoque',v)}
              type="number" placeholder="0"
            />
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>
              VALOR FIPE (R$)
            </label>
            <input
              type="number"
              value={f.valor_fipe || ''}
              onChange={e=>set('valor_fipe',e.target.value)}
              placeholder="Preenchido pela FIPE →"
              style={{ background:C.surface, border:`1px solid ${C.amber}55`, borderRadius:8, color:C.amber, padding:'10px 14px', fontSize:14, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit', fontWeight:700 }}
            />
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5, display:'block', marginBottom:5 }}>
              CÓDIGO FIPE
            </label>
            <input
              type="text"
              value={f.codigo_fipe || ''}
              onChange={e=>set('codigo_fipe',e.target.value)}
              placeholder="Ex: 004278-1"
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, padding:'10px 14px', fontSize:13, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'monospace' }}
            />
          </div>
        </div>

        <DiffFipe valorEstoque={f.valor_estoque} valorFipe={f.valor_fipe}/>
      </div>

      {/* ── Bloco 4: Status e obs ── */}
      <div style={{ display:'grid', gridTemplateColumns:cols2, gap:14, marginBottom:14 }}>
        <Input
          label="Combustível"
          value={f.combustivel}
          onChange={v=>set('combustivel',v)}
          options={COMBUSTIVEIS}
        />
        <Input
          label="Status"
          value={f.status}
          onChange={v=>set('status',v)}
          options={Object.entries(STATUS_VEICULO_CFG)
            .filter(([k])=>k!=='vendido')
            .map(([k,v])=>({value:k,label:v.label}))}
        />
      </div>
      <Input label="Observações" value={f.obs} onChange={v=>set('obs',v)} placeholder="Informações adicionais..." rows={2}/>

      <div style={{ display:'flex', gap:10, marginTop:24 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn style={{ flex:1 }} onClick={()=>onSave({
          ...f,
          km:            Number(f.km)           || 0,
          valor_estoque: Number(f.valor_estoque) || 0,
          valor_fipe:    Number(f.valor_fipe)    || 0,
        })} disabled={loading}>
          {loading ? 'Salvando...' : data ? 'Salvar Alterações' : 'Adicionar Veículo'}
        </Btn>
      </div>
    </Modal>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ModalVender — mostra comparativo completo
═══════════════════════════════════════════════════════════════ */
export function ModalVender({ data, onSave, onClose, loading }) {
  const [f, setF] = useState({ valor_venda:'', data_venda:today(), comprador_nome:'', comprador_doc:'' })
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  const { isMobile } = useBreakpoint()

  const custoMnt    = custoV(data)
  const valorVenda  = Number(f.valor_venda) || 0
  const lucro       = valorVenda - (data.valor_estoque||0) - custoMnt
  const margemPct   = valorVenda > 0 ? (lucro / valorVenda) * 100 : 0
  const diffFipe    = data.valor_fipe ? valorVenda - data.valor_fipe : null

  return (
    <Modal title={`Registrar Venda — ${data.marca_nome || ''} ${data.modelo_nome || data.modelo || ''}`} onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Input label="Data da Venda" value={f.data_venda} onChange={v=>set('data_venda',v)} type="date" required/>
        <Input label="Valor de Venda (R$)" value={f.valor_venda} onChange={v=>set('valor_venda',v)} type="number" required placeholder="0"/>
        <Input label="Nome do Comprador" value={f.comprador_nome} onChange={v=>set('comprador_nome',v)} placeholder="Pessoa Física ou Jurídica"/>
        <Input label="CPF / CNPJ" value={f.comprador_doc} onChange={v=>set('comprador_doc',v)} placeholder="000.000.000-00"/>
      </div>

      {/* Comparativo financeiro completo */}
      <div style={{ marginTop:16, background:C.surface, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <div style={{ background:C.subtle, padding:'10px 14px', fontSize:11, color:C.amber, fontWeight:700, letterSpacing:1 }}>
          📊 COMPARATIVO FINANCEIRO
        </div>
        {[
          ['Valor de Compra (estoque)',  fmtR(data.valor_estoque||0),   C.muted,  false],
          ['Custo de Manutenção',        fmtR(custoMnt),                C.amber,  false],
          ['Custo Total (compra + mnt)', fmtR((data.valor_estoque||0)+custoMnt), C.text, false],
          data.valor_fipe ? ['Valor Tabela FIPE',fmtR(data.valor_fipe), C.blue,   false] : null,
          ['Valor de Venda',             fmtR(valorVenda),              C.green,  false],
          ['Lucro Líquido',              fmtR(lucro),                   lucro>=0?C.green:C.red, true],
          ['Margem',                     `${margemPct.toFixed(1)}%`,    margemPct>=0?C.green:C.red, true],
          diffFipe !== null ? ['vs Tabela FIPE', `${diffFipe>=0?'+':''}${fmtR(diffFipe)}`, diffFipe>=0?C.green:C.red, false] : null,
        ].filter(Boolean).map(([l,v,c,bold])=>(
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
          disabled={loading || !valorVenda}>
          {loading ? 'Salvando...' : 'Confirmar Venda'}
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

/* ── ModalPrestador ───────────────────────────────────────────── */
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
