/**
 * Seções do ModalVeiculo (Identificação, Valores, Origem, Fotos). Cada uma
 * recebe o estado do formulário pronto — nenhuma guarda estado próprio,
 * para que trocar de seção nunca perca o que já foi digitado.
 */
import { MoedaInput, UpperInput, SelectFipe, SelectInput, DocInput, DateInput } from './Inputs'
import { FotoUpload } from './FotoUpload'
import { COMBUSTIVEIS, STATUS_VEICULO_CFG, C, fmtR } from '../lib/constants'

export const TIPOS_VEICULO = ['Carro','Van','Pick-up','Utilitário','Caminhão Leve','Caminhão Médio','Caminhão Pesado','Micro-ônibus','Moto','Outro']

const mono = "'JetBrains Mono',monospace"

const s = {
  bloco:    { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 },
  titulo:   { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', marginBottom: 12 },
  label:    { fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 5 },
  input:    { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '10px 14px',
              fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box', fontFamily: mono, fontWeight: 700 },
  nota:     { marginTop: 10, padding: '8px 12px', background: C.surface, borderRadius: 7, fontSize: 12, color: C.muted,
              display: 'flex', gap: 8, flexWrap: 'wrap' },
  erro:     { marginTop: 10, background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 7, padding: '8px 12px',
              fontSize: 12, color: C.red },
}

const grid = (cols, extra) => ({ display: 'grid', gridTemplateColumns: cols, gap: 14, ...extra })

/* ── DiffFipe ─────────────────────────────────────────────────── */
function DiffFipe({ valorAnuncio, valorFipe }) {
  if (!valorFipe || !valorAnuncio) return null
  const diff = Number(valorAnuncio) - Number(valorFipe)
  const pct  = (diff / Number(valorFipe)) * 100
  const cor  = diff < 0 ? C.green : diff > 0 ? C.red : C.muted
  return (
    <div style={{ background:C.card, border:`1px solid ${cor}33`, borderRadius:8, padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginTop:8 }}>
      <span style={{ fontSize:12, color:C.muted }}>Anúncio vs FIPE</span>
      <div style={{ display:'flex', gap:12 }}>
        <span style={{ fontSize:13, fontWeight:800, color:cor, fontFamily:mono }}>{diff>=0?'+':''}{fmtR(diff)}</span>
        <span style={{ fontSize:12, fontWeight:700, color:cor }}>({pct>=0?'+':''}{pct.toFixed(1)}%)</span>
        <span style={{ fontSize:11, color:cor }}>{diff<0?'▼ Abaixo da tabela':diff>0?'▲ Acima da tabela':'= Na tabela'}</span>
      </div>
    </div>
  )
}

/* ── ComparativoQuatroValores ─────────────────────────────────── */
function ComparativoQuatroValores({ valorCompra, valorFipe, valorAnuncio }) {
  const valores = [
    { label:'Valor de Compra', val:valorCompra, cor:C.muted,   icon:'🛒' },
    { label:'Tabela FIPE',     val:valorFipe,   cor:C.blue,    icon:'📊' },
    { label:'Valor de Anúncio',val:valorAnuncio,cor:C.amber,   icon:'🏷' },
  ].filter(v => v.val > 0)

  if (valores.length < 2) return null

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px', marginTop:8 }}>
      <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:1, marginBottom:10 }}>📈 COMPARATIVO DE VALORES</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {valores.map(({ label, val, cor, icon }) => (
          <div key={label} style={{ flex:1, minWidth:100, textAlign:'center', background:C.surface, borderRadius:6, padding:'8px 10px' }}>
            <div style={{ fontSize:10, color:C.muted, marginBottom:4 }}>{icon} {label}</div>
            <div style={{ fontSize:14, fontWeight:800, color:cor, fontFamily:mono }}>{fmtR(val)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Props: { f, set, setUp, cols2, cols3 }
/** Placa, cor, km, chassi e renavam. */
function CamposDocumento({ f, set, setUp, cols2, cols3 }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={grid(cols3)}>
        <UpperInput label="Placa" value={f.placa} onChange={v=>setUp('placa',v)} required placeholder="ABC-1234"/>
        <UpperInput label="Cor"   value={f.cor}   onChange={v=>setUp('cor',v)}   placeholder="BRANCO"/>
        <div>
          <label style={s.label} htmlFor="veic-km">KM ATUAL</label>
          <input id="veic-km" type="text" inputMode="numeric" value={(f.km||0).toLocaleString('pt-BR')}
            onChange={e => set('km', parseInt(e.target.value.replace(/\D/g,''),10)||0)} style={s.input}/>
        </div>
      </div>
      <div style={grid(cols2, { marginTop:14 })}>
        <UpperInput label="Chassi" value={f.chassi} onChange={v=>setUp('chassi',v)} placeholder="9BWZZZ377VT004251"/>
        <div>
          <label style={s.label} htmlFor="veic-renavam">RENAVAM</label>
          <input id="veic-renavam" type="text" inputMode="numeric" value={f.renavam||''} placeholder="00000000000"
            onChange={e=>set('renavam',e.target.value.replace(/\D/g,''))} style={s.input}/>
        </div>
      </div>
    </div>
  )
}

// Props: { pr } — preço normalizado do useFipe
/** Card verde com o valor FIPE consultado. */
function PrecoFipe({ pr }) {
  return (
    <div style={{ marginTop:12, background:`${C.green}10`, border:`1px solid ${C.green}33`, borderRadius:8, padding:'12px 14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:700, marginBottom:4 }}>VALOR TABELA FIPE — {pr.MesReferencia}</div>
          <div style={{ fontSize:26, fontWeight:800, color:C.green, fontFamily:mono }}>{pr.Valor}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
            {pr.Marca} {pr.Modelo} · {pr.AnoModelo} · {pr.Combustivel}
            {' · Cód: '}<span style={{ fontFamily:'monospace' }}>{pr.CodigoFipe}</span>
          </div>
        </div>
        <span style={{ fontSize:11, color:C.green, fontWeight:700, background:`${C.green}20`, padding:'5px 10px', borderRadius:20 }}>✓ Preenchido automaticamente</span>
      </div>
    </div>
  )
}

// Props: { f, set, fipe, handlers:{marca,modelo,ano}, fipeIgualCadastro, cols3 }
/** Tipo + cascata marca/modelo/ano da FIPE. */
function CamposFipe({ f, set, fipe, handlers, fipeIgualCadastro, cols3 }) {
  const pr = fipe.preco
  return (
    <div style={{ ...s.bloco, background:C.cardHi, border:`1px solid ${C.amber}33` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ ...s.titulo, marginBottom:0 }}>MARCA / MODELO / ANO — TABELA FIPE</div>
        {fipe.loading && <span style={{ fontSize:11, color:C.muted }}>⟳ buscando {fipe.loading}...</span>}
      </div>
      <div style={{ marginBottom:14 }}>
        <SelectInput label="Tipo de Veículo" value={f.tipo} onChange={v => { set('tipo', v); fipe.reset() }} options={TIPOS_VEICULO}/>
      </div>
      <div style={grid(cols3)}>
        <SelectFipe label="Marca" required value={fipe.sels.marcaCod} onChange={handlers.marca} options={fipe.marcas} placeholder="Selecione a marca" loading={fipe.loading==='marcas'} disabled={!fipe.marcas.length && fipe.loading!=='marcas'}/>
        <SelectFipe label="Modelo" required value={fipe.sels.modeloCod} onChange={handlers.modelo} options={fipe.modelos} placeholder={fipe.sels.marcaCod ? 'Selecione o modelo' : '← primeiro a marca'} loading={fipe.loading==='modelos'} disabled={!fipe.sels.marcaCod}/>
        <SelectFipe label="Ano" required value={fipe.sels.anoCod} onChange={handlers.ano} options={fipe.anos} placeholder={fipe.sels.modeloCod ? 'Selecione o ano' : '← primeiro o modelo'} loading={fipe.loading==='anos'} disabled={!fipe.sels.modeloCod}/>
      </div>
      {/* Só quando os selects não refletem o cadastro (nome salvo não achado
          na FIPE atual) — deixa claro que salvar mantém o que já estava. */}
      {fipeIgualCadastro && !fipe.sels.anoCod && fipe.loading !== 'seleção salva' && (
        <div style={s.nota}>
          <span>No cadastro (mantido ao salvar):</span>
          {[f.marca_nome, f.modelo_nome, f.ano_modelo].filter(Boolean).map(t =>
            <span key={t} style={{ color:C.text, fontWeight:600 }}>{t}</span>)}
        </div>
      )}
      {fipe.erro && (
        <div style={s.erro}>⚠️ {fipe.erro.includes('429') ? 'Limite FIPE atingido. Aguarde alguns minutos.' : `Erro FIPE: ${fipe.erro}`}</div>
      )}
      {fipe.loading==='preco' && <div style={{ ...s.nota, marginTop:12 }}>⟳ Consultando preço na tabela FIPE...</div>}
      {pr && fipe.loading!=='preco' && <PrecoFipe pr={pr}/>}
    </div>
  )
}

// Props: { f, set, cols3 }
/** Combustível, data de entrada, status e observações. */
function CamposSituacao({ f, set, cols3 }) {
  return (
    <>
      <div style={grid(cols3, { marginBottom:14 })}>
        <SelectInput label="Combustível" value={f.combustivel} onChange={v=>set('combustivel',v)} options={COMBUSTIVEIS}/>
        <DateInput label="DATA DE ENTRADA" value={f.data_entrada} onChange={v=>set('data_entrada',v)} required/>
        <SelectInput label="Status" value={f.status} onChange={v=>set('status',v)}
          options={Object.entries(STATUS_VEICULO_CFG).filter(([k])=>k!=='vendido').map(([k,v])=>({value:k,label:v.label}))}/>
      </div>
      <div>
        <label style={s.label} htmlFor="veic-obs">OBSERVAÇÕES</label>
        <textarea id="veic-obs" value={(f.obs||'').toUpperCase()} onChange={e=>set('obs',e.target.value.toUpperCase())}
          placeholder="INFORMAÇÕES ADICIONAIS..." rows={2}
          style={{ ...s.input, fontFamily:'inherit', fontWeight:400, resize:'vertical', textTransform:'uppercase' }}/>
      </div>
    </>
  )
}

// Props: { f, set, setUp, fipe, handlers, fipeIgualCadastro, cols2, cols3 }
/** Seção "Identificação": documento, FIPE e situação do veículo. */
export function SecaoIdentificacao(props) {
  return (
    <>
      <CamposDocumento {...props}/>
      <CamposFipe {...props}/>
      <CamposSituacao {...props}/>
    </>
  )
}

// Props: { cf, setCfK, totalCf, cols2 }
/** IPVA, licenciamento, transferência, multas e outros. */
function CamposCustosFixos({ cf, setCfK, totalCf, cols2 }) {
  return (
    <div style={{ ...s.bloco, border:`1px solid ${C.orange}44` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ ...s.titulo, color:C.orange, marginBottom:0 }}>CUSTOS FIXOS</div>
        {totalCf > 0 && <div style={{ fontSize:13, fontWeight:800, color:C.orange, fontFamily:mono }}>Total: {fmtR(totalCf)}</div>}
      </div>
      <div style={grid(cols2)}>
        <MoedaInput label="IPVA (R$)"          value={cf.ipva}          onChange={v=>setCfK('ipva',v)}          highlight={C.orange}/>
        <MoedaInput label="Licenciamento (R$)" value={cf.licenciamento} onChange={v=>setCfK('licenciamento',v)} highlight={C.orange}/>
        <MoedaInput label="Transferência (R$)" value={cf.transferencia} onChange={v=>setCfK('transferencia',v)} highlight={C.orange}/>
        <MoedaInput label="Multas (R$)"        value={cf.multas}        onChange={v=>setCfK('multas',v)}        highlight={C.orange}/>
      </div>
      <div style={grid(cols2, { marginTop:14 })}>
        <UpperInput label="Outros — Descrição" value={cf.outros_desc} onChange={v=>setCfK('outros_desc',v)} placeholder="EX: VISTORIAS, DESPACHANTE"/>
        <MoedaInput label="Outros — Valor (R$)" value={cf.outros_valor} onChange={v=>setCfK('outros_valor',v)} highlight={C.orange}/>
      </div>
    </div>
  )
}

// Props: { f, set, cf, setCfK, totalCf, cols2, cols3 }
/** Seção "Valores": compra/FIPE/anúncio e custos fixos. */
export function SecaoValores({ f, set, cf, setCfK, totalCf, cols2, cols3 }) {
  return (
    <>
      <div style={s.bloco}>
        <div style={s.titulo}>VALORES</div>
        <div style={grid(cols3)}>
          <MoedaInput label="Valor de Compra (R$)" required value={f.valor_compra} onChange={v=>set('valor_compra',v)}/>
          <MoedaInput label="Tabela FIPE (R$)" value={f.valor_fipe} onChange={v=>set('valor_fipe',v)} highlight={C.green}/>
          <MoedaInput label="Valor de Anúncio (R$)" value={f.valor_anuncio} onChange={v=>set('valor_anuncio',v)} highlight={C.amber}/>
        </div>
        <div style={grid(cols2, { marginTop:14 })}>
          <div>
            <label style={s.label} htmlFor="veic-codfipe">CÓDIGO FIPE</label>
            <input id="veic-codfipe" type="text" value={f.codigo_fipe||''} onChange={e=>set('codigo_fipe',e.target.value)}
              placeholder="Ex: 004278-1" style={{ ...s.input, color:C.muted, fontSize:13, fontFamily:'monospace', fontWeight:400 }}/>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end' }}>
            <DiffFipe valorAnuncio={f.valor_anuncio} valorFipe={f.valor_fipe}/>
          </div>
        </div>
        <ComparativoQuatroValores valorCompra={f.valor_compra} valorFipe={f.valor_fipe} valorAnuncio={f.valor_anuncio}/>
      </div>
      <CamposCustosFixos cf={cf} setCfK={setCfK} totalCf={totalCf} cols2={cols2}/>
    </>
  )
}

const TIPOS_FORNECEDOR = [
  { value:'pessoa_fisica',   label:'Pessoa Física'   },
  { value:'pessoa_juridica', label:'Pessoa Jurídica' },
  { value:'leilao',          label:'Leilão'          },
  { value:'troca',           label:'Troca'           },
]

// Props: { f, set, setUp, cols2 }
/** Seção "Origem": de quem o veículo foi comprado. */
export function SecaoOrigem({ f, set, setUp, cols2 }) {
  return (
    <div style={s.bloco}>
      <div style={s.titulo}>QUEM VENDEU O VEÍCULO PARA A LOJA</div>
      <div style={grid(cols2)}>
        <SelectInput label="Tipo de Vendedor" value={f.fornecedor_tipo} onChange={v=>set('fornecedor_tipo',v)} options={TIPOS_FORNECEDOR}/>
        <UpperInput label="Nome do Vendedor" value={f.fornecedor_nome} onChange={v=>setUp('fornecedor_nome',v)} placeholder="NOME COMPLETO"/>
        <DocInput   label="CPF / CNPJ"       value={f.fornecedor_doc}  onChange={v=>set('fornecedor_doc',v)}/>
        <UpperInput label="Telefone"          value={f.fornecedor_telefone} onChange={v=>setUp('fornecedor_telefone',v)} placeholder="(11) 99999-9999"/>
        <div>
          <label style={s.label} htmlFor="veic-email">E-MAIL</label>
          <input id="veic-email" type="email" value={f.fornecedor_email||''} onChange={e=>set('fornecedor_email',e.target.value.toLowerCase())}
            placeholder="email@vendedor.com.br" style={{ ...s.input, fontFamily:'inherit', fontWeight:400 }}/>
        </div>
      </div>
    </div>
  )
}

// Props: { veiculoId, fotos, setFotos }
/** Seção "Fotos". */
export function SecaoFotos({ veiculoId, fotos, setFotos }) {
  return (
    <div style={s.bloco}>
      <div style={s.titulo}>FOTOS DO VEÍCULO</div>
      <FotoUpload folderId={veiculoId || 'novo'} fotos={fotos} onChange={setFotos}/>
    </div>
  )
}
