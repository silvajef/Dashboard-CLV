import { useState } from 'react'
import { Badge, Btn, Card, Tabs, Grid, SectionHead, ErrorBanner } from '../components/UI'
import { ModalVeiculo, ModalVender, ModalServico, ModalConfirm } from '../components/Modals'
import { C, STATUS_VEICULO_CFG, STATUS_SERV_CFG, fmtR, fmtN, custoV } from '../lib/constants'
import { useBreakpoint } from '../lib/responsive'

function nomeVeiculo(v) {
  const marca  = v.marca_nome  || ''
  const modelo = v.modelo_nome || v.modelo || ''
  return [marca, modelo].filter(Boolean).join(' ') || '—'
}
function anoVeiculo(v) { return v.ano_modelo || v.ano || '—' }
function iconeVeiculo(tipo = '') {
  const t = tipo.toLowerCase()
  if (t.includes('pick')) return '🛻'
  if (t.includes('caminhão') || t.includes('caminhao')) return '🚛'
  if (t.includes('micro')) return '🚌'
  return '🚐'
}

export default function Veiculos({ veiculos, prestadores, saveVeiculo, removeVeiculo, saveServico, removeServico }) {
  const { isMobile } = useBreakpoint()
  const [vSel,   setVSel]   = useState(null)
  const [vTab,   setVTab]   = useState('info')
  const [modal,  setModal]  = useState(null)
  const [saving, setSaving] = useState(false)
  const [erro,   setErro]   = useState(null)
  const [filtro, setFiltro] = useState({ status:'todos', busca:'' })

  const ativos    = veiculos.filter(v => v.status !== 'vendido')
  const filtrados = ativos.filter(v => {
    if (filtro.status !== 'todos' && v.status !== filtro.status) return false
    if (filtro.busca) {
      const b = filtro.busca.toLowerCase()
      return (
        v.placa?.toLowerCase().includes(b)       ||
        v.marca_nome?.toLowerCase().includes(b)  ||
        v.modelo_nome?.toLowerCase().includes(b) ||
        v.modelo?.toLowerCase().includes(b)
      )
    }
    return true
  })

  const handle = async (fn, ...args) => {
    try { setSaving(true); setErro(null); await fn(...args); setModal(null) }
    catch (e) { setErro(e.message) } finally { setSaving(false) }
  }

  const vAtual = vSel ? veiculos.find(v => v.id === vSel.id) || vSel : null
  const inp = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:'9px 14px', fontSize:14, outline:'none', fontFamily:'inherit' }

  /* ── DETALHE ── */
  if (vAtual) return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <Btn variant="ghost" small onClick={()=>setVSel(null)}>← Voltar</Btn>
          <span style={{ color:C.muted }}>|</span>
          <span style={{ fontSize:20 }}>{iconeVeiculo(vAtual.tipo)}</span>
          <span style={{ fontWeight:700, fontSize:16 }}>{nomeVeiculo(vAtual)}</span>
          {vAtual.placa && <span style={{ fontSize:12, color:C.muted, fontFamily:'monospace', background:C.surface, padding:'2px 8px', borderRadius:6 }}>{vAtual.placa}</span>}
          <Badge status={vAtual.status} cfg={STATUS_VEICULO_CFG}/>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <Btn variant="secondary" small onClick={()=>setModal({type:'veiculo',data:vAtual})}>✏️ Editar</Btn>
          {vAtual.status !== 'vendido' && <Btn variant="success" small onClick={()=>setModal({type:'vender',data:vAtual})}>🏷 Registrar Venda</Btn>}
          <Btn variant="danger" small onClick={()=>setModal({type:'del_veiculo',data:vAtual})}>🗑</Btn>
        </div>
      </div>

      {erro && <ErrorBanner message={erro}/>}
      <Tabs tabs={[{id:'info',icon:'📄',label:'Informações'},{id:'servicos',icon:'🔧',label:`Serviços (${(vAtual.servicos||[]).length})`},{id:'custos',icon:'💰',label:'Custos'}]} active={vTab} onChange={setVTab}/>

      <div style={{ marginTop:20 }}>
        {/* INFO */}
        {vTab==='info' && (
          <Grid cols={2} gap={20} mobileCols={1}>
            <Card>
              <SectionHead title="Dados do Veículo"/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  ['Marca',       vAtual.marca_nome  || '—'],
                  ['Modelo',      vAtual.modelo_nome || vAtual.modelo || '—'],
                  ['Ano',         anoVeiculo(vAtual)],
                  ['Tipo',        vAtual.tipo        || '—'],
                  ['Placa',       vAtual.placa       || '—'],
                  ['Cor',         vAtual.cor         || '—'],
                  ['KM',          fmtN(vAtual.km)+' km'],
                  ['Combustível', vAtual.combustivel  || '—'],
                  ['Entrada',     vAtual.data_entrada || '—'],
                  ['Cód. FIPE',   vAtual.codigo_fipe  || '—'],
                ].map(([k,val])=>(
                  <div key={k} style={{ background:C.surface, borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:C.muted, fontWeight:700, marginBottom:2 }}>{k.toUpperCase()}</div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{val}</div>
                  </div>
                ))}
              </div>
              {vAtual.obs && <div style={{ marginTop:12, background:C.surface, borderRadius:8, padding:'10px 12px' }}><div style={{ fontSize:10, color:C.muted, marginBottom:4, fontWeight:700 }}>OBSERVAÇÕES</div><div style={{ fontSize:13 }}>{vAtual.obs}</div></div>}
            </Card>

            <Card>
              <SectionHead title="Valores"/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                {[
                  ['Valor de Compra', fmtR(vAtual.valor_estoque), C.amber],
                  ['Tabela FIPE',     vAtual.valor_fipe ? fmtR(vAtual.valor_fipe) : '—', C.green],
                ].map(([l,val,cor])=>(
                  <div key={l} style={{ background:C.surface, borderRadius:8, padding:'12px 14px', borderTop:`3px solid ${cor}` }}>
                    <div style={{ fontSize:10, color:C.muted, fontWeight:700, marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:cor, fontFamily:"'JetBrains Mono',monospace" }}>{val}</div>
                  </div>
                ))}
              </div>
              {vAtual.valor_fipe > 0 && vAtual.valor_estoque > 0 && (()=>{
                const diff = vAtual.valor_estoque - vAtual.valor_fipe
                const pct  = (diff/vAtual.valor_fipe)*100
                const cor  = diff<0?C.green:diff>0?C.red:C.muted
                return <div style={{ background:C.cardHi, borderRadius:8, padding:'10px 14px', border:`1px solid ${cor}33`, marginBottom:16 }}>
                  <div style={{ fontSize:10, color:C.muted, fontWeight:700, marginBottom:4 }}>COMPARATIVO VS FIPE</div>
                  <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:16, fontWeight:800, color:cor, fontFamily:"'JetBrains Mono',monospace" }}>{diff>=0?'+':''}{fmtR(diff)}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:cor }}>({pct>=0?'+':''}{pct.toFixed(1)}%)</span>
                    <span style={{ fontSize:12, color:cor }}>{diff<0?'▼ Abaixo da tabela':diff>0?'▲ Acima da tabela':'= Na tabela'}</span>
                  </div>
                </div>
              })()}

              <SectionHead title="Alterar Status"/>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {Object.entries(STATUS_VEICULO_CFG).filter(([k])=>k!=='vendido').map(([k,cfg])=>(
                  <button key={k} onClick={()=>handle(saveVeiculo,{...vAtual,status:k,servicos:undefined})}
                    style={{ background:vAtual.status===k?cfg.color+'33':'transparent', color:cfg.color, border:`1px solid ${cfg.color}55`, borderRadius:20, padding:'7px 16px', fontSize:12, cursor:'pointer', fontWeight:700, fontFamily:'inherit' }}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
              {vAtual.status==='vendido' && (
                <div style={{ marginTop:16, background:'#a78bfa15', border:'1px solid #a78bfa44', borderRadius:10, padding:14 }}>
                  <div style={{ fontWeight:700, color:'#a78bfa', marginBottom:8 }}>🏷 Dados da Venda</div>
                  {[['Data',vAtual.data_venda],['Valor',fmtR(vAtual.valor_venda)],['Comprador',vAtual.comprador_nome],['CPF/CNPJ',vAtual.comprador_doc]].map(([k,val])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ color:C.muted }}>{k}</span><span style={{ fontWeight:600 }}>{val||'—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Grid>
        )}

        {/* SERVIÇOS */}
        {vTab==='servicos' && (
          <div>
            {vAtual.status!=='vendido' && <div style={{ marginBottom:16, textAlign:'right' }}><Btn onClick={()=>setModal({type:'servico',data:null})}>+ Registrar Serviço</Btn></div>}
            {!(vAtual.servicos?.length) ? <div style={{ textAlign:'center', color:C.muted, padding:50 }}>Nenhum serviço registrado.</div>
              : (vAtual.servicos||[]).map(s=>{
                  const total=(s.custo_pecas||0)+(s.custo_mao||0)+(s.outros||0)
                  const cfg=STATUS_SERV_CFG[s.status]||{color:C.muted}
                  return <div key={s.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:10, borderLeft:`3px solid ${cfg.color}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}><span style={{ fontWeight:700, fontSize:15 }}>{s.tipo}</span><Badge status={s.status} cfg={STATUS_SERV_CFG}/></div>
                      {vAtual.status!=='vendido' && <div style={{ display:'flex', gap:6 }}><Btn variant="ghost" small onClick={()=>setModal({type:'servico',data:s})}>✏️</Btn><Btn variant="danger" small onClick={()=>handle(removeServico,s.id)}>🗑</Btn></div>}
                    </div>
                    <p style={{ margin:'0 0 10px', fontSize:13 }}>{s.descricao}</p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8 }}>
                      {[['Prestador',s.prestador?.nome||'—'],['Data',s.data_servico],['Peças',fmtR(s.custo_pecas)],['Mão Obra',fmtR(s.custo_mao)],['Outros',fmtR(s.outros)]].map(([l,val])=>(
                        <div key={l} style={{ background:C.card, borderRadius:7, padding:'8px 10px' }}><div style={{ fontSize:10, color:C.muted, fontWeight:700 }}>{l}</div><div style={{ fontSize:12, fontWeight:600 }}>{val}</div></div>
                      ))}
                      <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b33', borderRadius:7, padding:'8px 10px' }}><div style={{ fontSize:10, color:C.muted, fontWeight:700 }}>TOTAL</div><div style={{ fontSize:14, fontWeight:800, color:'#f59e0b' }}>{fmtR(total)}</div></div>
                    </div>
                    {s.garantia && <div style={{ fontSize:11, color:C.muted, marginTop:8 }}>🛡 Garantia: {s.garantia}</div>}
                  </div>
                })
            }
          </div>
        )}

        {/* CUSTOS */}
        {vTab==='custos' && (
          <Grid cols={3} gap={14} mobileCols={2}>
            {[
              ['Custo Peças',     (vAtual.servicos||[]).reduce((s,m)=>s+(m.custo_pecas||0),0), C.blue],
              ['Mão de Obra',     (vAtual.servicos||[]).reduce((s,m)=>s+(m.custo_mao||0),0),   C.green],
              ['Outros',          (vAtual.servicos||[]).reduce((s,m)=>s+(m.outros||0),0),       '#22d4dd'],
              ['Total Manutenção',custoV(vAtual),                                               C.amber],
              ['Valor de Compra', vAtual.valor_estoque||0,                                      '#a78bfa'],
              ['Custo Total',     (vAtual.valor_estoque||0)+custoV(vAtual),                     C.red],
            ].map(([l,val,c])=>(
              <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px', borderTop:`3px solid ${c}` }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:18, fontWeight:800, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{fmtR(val)}</div>
              </div>
            ))}
          </Grid>
        )}
      </div>

      {modal?.type==='veiculo'     && <ModalVeiculo data={modal.data} onSave={d=>handle(saveVeiculo,{...d,servicos:undefined})} onClose={()=>setModal(null)} loading={saving}/>}
      {modal?.type==='vender'      && <ModalVender  data={modal.data} onSave={d=>handle(saveVeiculo,{...d,servicos:undefined})} onClose={()=>setModal(null)} loading={saving}/>}
      {modal?.type==='servico'     && <ModalServico data={modal.data} veiculoId={vAtual.id} prestadores={prestadores} onSave={d=>handle(saveServico,d)} onClose={()=>setModal(null)} loading={saving}/>}
      {modal?.type==='del_veiculo' && <ModalConfirm title="Excluir Veículo" message={`Excluir ${nomeVeiculo(vAtual)}? Esta ação não pode ser desfeita.`} onConfirm={()=>handle(removeVeiculo,vAtual.id).then(()=>setVSel(null))} onClose={()=>setModal(null)} loading={saving}/>}
    </div>
  )

  /* ── LISTAGEM ── */
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, gap:10 }}>
        <div>
          <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:900 }}>Estoque Ativo</h2>
          <p style={{ margin:0, color:C.muted, fontSize:13 }}>{ativos.length} veículo(s) cadastrado(s)</p>
        </div>
        <Btn onClick={()=>setModal({type:'veiculo',data:null})}>+ Novo Veículo</Btn>
      </div>
      {erro && <ErrorBanner message={erro}/>}

      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <input value={filtro.busca} onChange={e=>setFiltro(p=>({...p,busca:e.target.value}))} placeholder="🔍 Buscar placa, marca ou modelo..." style={{ ...inp, width:isMobile?'100%':280 }}/>
        <select value={filtro.status} onChange={e=>setFiltro(p=>({...p,status:e.target.value}))} style={inp}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_VEICULO_CFG).filter(([k])=>k!=='vendido').map(([k,cfg])=>(
            <option key={k} value={k}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtrados.map(v => {
          const custoMnt = custoV(v)
          const nome     = nomeVeiculo(v)
          const ano      = anoVeiculo(v)
          const cfg      = STATUS_VEICULO_CFG[v.status] || {color:C.muted}
          return (
            <div key={v.id} onClick={()=>{ setVSel(v); setVTab('info') }}
              style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:isMobile?'12px 14px':'14px 18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', borderLeft:`4px solid ${cfg.color}`, gap:12 }}>

              <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:0, flex:1 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{iconeVeiculo(v.tipo)}</span>
                <div style={{ minWidth:0 }}>
                  {/* Linha 1: Marca + Modelo */}
                  <div style={{ fontWeight:700, fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {nome}
                  </div>
                  {/* Linha 2: Placa · Ano · KM · Cor · Tipo */}
                  <div style={{ fontSize:12, color:C.muted, display:'flex', gap:5, flexWrap:'wrap', marginTop:2 }}>
                    {v.placa && <span style={{ fontFamily:'monospace', fontWeight:600, color:C.text }}>{v.placa}</span>}
                    {v.placa && <span>·</span>}
                    {ano !== '—' && <><span>{ano}</span><span>·</span></>}
                    <span>{fmtN(v.km)} km</span>
                    {v.cor && <><span>·</span><span>{v.cor}</span></>}
                    {v.tipo && <><span>·</span><span>{v.tipo}</span></>}
                  </div>
                  {/* Linha 3: FIPE badge */}
                  {v.valor_fipe > 0 && (
                    <div style={{ marginTop:3, fontSize:11, color:C.green, display:'flex', gap:6 }}>
                      <span>📊 FIPE: {fmtR(v.valor_fipe)}</span>
                      {v.valor_estoque > 0 && (()=>{
                        const diff = v.valor_estoque - v.valor_fipe
                        const cor  = diff<0?C.green:C.red
                        return <span style={{ color:cor, fontWeight:700 }}>({diff>=0?'+':''}{((diff/v.valor_fipe)*100).toFixed(1)}%)</span>
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:isMobile?10:16, flexShrink:0 }}>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, color:C.amber, fontSize:14, fontFamily:"'JetBrains Mono',monospace" }}>{fmtR(v.valor_estoque)}</div>
                  {custoMnt > 0 && <div style={{ fontSize:11, color:C.muted }}>Mnt: {fmtR(custoMnt)}</div>}
                </div>
                {!isMobile && <Badge status={v.status} cfg={STATUS_VEICULO_CFG}/>}
                <span style={{ color:C.muted, fontSize:18 }}>›</span>
              </div>
            </div>
          )
        })}
        {!filtrados.length && <div style={{ textAlign:'center', color:C.muted, padding:50 }}>Nenhum veículo encontrado.</div>}
      </div>

      {modal?.type==='veiculo' && <ModalVeiculo data={null} onSave={d=>handle(saveVeiculo,d)} onClose={()=>setModal(null)} loading={saving}/>}
    </div>
  )
}
