import { useState, useEffect, useRef } from 'react'
import { Badge, Btn, Card, Tabs, Grid, SectionHead, ErrorBanner } from '../components/UI'
import { ModalVeiculo, ModalServico, ModalConfirm } from '../components/Modals'
import { ModalIniciarVenda, EtapasProcesso } from '../components/ProcessoVenda'
import { C, STATUS_VEICULO_CFG, STATUS_SERV_CFG, fmtR, fmtN, custoV, custoFixos, getCf, progressoProcesso } from '../lib/constants'
import { useBreakpoint } from '../lib/responsive'
import { fichaVeiculo, relatorioEstoque, abrirPDF } from '../lib/relatorios'
import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import FipeHistoricoChart from '../components/FipeHistoricoChart'

const russo  = "'Russo One', sans-serif"
const chakra = "'Chakra Petch', monospace"

const VEIC_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Chakra+Petch:wght@400;600;700&display=swap');
  @keyframes veic-in { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
  .veic-card { transition: border-color .15s, background .15s; }
  .veic-pill { transition: all .12s; }
  .veic-action { transition: border-color .12s, color .12s; }
  .veic-action:hover { opacity: .85; }
`

// Short label for the rotated status spine
const SPINE_LABEL = { pendente:'PEND', manutencao:'MNT', pronto:'PRONTO', em_venda:'VENDA', vendido:'VENDIDO' }

function nomeVeiculo(v) {
  const marca  = v.marca_nome  || ''
  const modelo = v.modelo_nome || v.modelo || ''
  return [marca, modelo].filter(Boolean).join(' ') || '—'
}

function DepreciacaoRow({ v }) {
  if (!v.valor_fipe) return null
  const fipe  = v.valor_fipe
  const ct    = (v.valor_compra||0) + custoV(v) + custoFixos(v)
  const isRed   = fipe < ct
  const isAmber = !isRed && v.valor_compra > 0 && fipe < v.valor_compra * 0.95
  if (!isRed && !isAmber) return null
  const cor = isRed ? C.red : C.amber
  const msg = isRed
    ? `FIPE ABAIXO DO CUSTO — FALTAM ${fmtR(ct - fipe)}`
    : `FIPE RECUOU ${(((v.valor_compra - fipe) / v.valor_compra) * 100).toFixed(1)}% VS COMPRA`
  return (
    <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${cor}22`, display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:9, fontWeight:700, color:cor, background:`${cor}15`, padding:'2px 8px', borderRadius:3, fontFamily:russo, letterSpacing:'0.06em' }}>
        {isRed ? '▼' : '△'} {msg}
      </span>
    </div>
  )
}

function anoVeiculo(v) { return v.ano_modelo || v.ano || '—' }

export default function Veiculos({
  veiculos, prestadores, processos,
  saveVeiculo, removeVeiculo,
  saveServico, removeServico,
  saveProcesso, concluirProcesso, cancelarProcesso,
  abrirVeiculoId, onAbrirVeiculoHandled,
  filtroInicial, onFiltroInicialHandled,
  focusBusca, onFocusBuscaHandled,
}) {
  const { isMobile } = useBreakpoint()
  const [vSel,   setVSel]   = useState(null)
  const [vTab,   setVTab]   = useState('info')
  const [modal,  setModal]  = useState(null)
  const [saving, setSaving] = useState(false)
  const [erro,   setErro]   = useState(null)
  const [filtro, setFiltro] = useState({ status:'todos', busca:'' })
  const buscaRef = useRef(null)

  useEffect(() => {
    if (!abrirVeiculoId || !veiculos.length) return
    const v = veiculos.find(x => x.id === abrirVeiculoId)
    if (v) { setVSel(v); setVTab('processo'); onAbrirVeiculoHandled?.() }
  }, [abrirVeiculoId, veiculos])

  useEffect(() => {
    if (!filtroInicial) return
    setFiltro(p => ({ ...p, status: filtroInicial }))
    setVSel(null)
    onFiltroInicialHandled?.()
  }, [filtroInicial])

  useEffect(() => {
    if (!focusBusca) return
    setVSel(null)
    const focus = () => { buscaRef.current?.focus(); onFocusBuscaHandled?.() }
    if (buscaRef.current) focus()
    else setTimeout(focus, 0)
  }, [focusBusca])

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

  const getProcesso = (veiculoId) =>
    (processos || []).find(p => p.veiculo_id === veiculoId && p.status === 'em_andamento') || null

  const handle = async (fn, ...args) => {
    try { setSaving(true); setErro(null); await fn(...args); setModal(null) }
    catch (e) { setErro(e.message) } finally { setSaving(false) }
  }

  const vAtual    = vSel ? veiculos.find(v => v.id === vSel.id) || vSel : null
  const procAtual = vAtual ? getProcesso(vAtual.id) : null

  const btnBase   = { border:'none', borderRadius:5, cursor:'pointer', fontSize:10, fontFamily:russo, letterSpacing:'0.06em', padding:'6px 14px' }
  const actionBtn = { ...btnBase, background:'transparent', border:`1px solid ${C.border}`, color:C.muted }
  const primaryBtn = { ...btnBase, background:C.blue, color:'#fff', fontWeight:700 }
  const ghostBtn   = { ...btnBase, background:'transparent', border:`1px solid ${C.border}`, color:C.muted }

  /* ─────────────────────────── DETALHE ──────────────────────────── */
  if (vAtual) {
    const cfgV = STATUS_VEICULO_CFG[vAtual.status] || { color: C.muted, label: vAtual.status }
    const tabs = [
      ...(procAtual ? [{ id:'processo', icon:'🏷', label:'Processo de Venda' }] : []),
      { id:'info',     icon:'📄', label:'Informações' },
      { id:'servicos', icon:'🔧', label:`Serviços (${(vAtual.servicos||[]).length})` },
      { id:'custos',   icon:'💰', label:'Custos' },
    ]
    const abaAtiva = procAtual && vTab === 'info' && vAtual.status === 'em_venda' ? 'processo' : vTab

    return (
      <div>
        <style>{VEIC_CSS}</style>

        {/* ── Dossier header ─────────────────────────────────────────── */}
        <div style={{
          background: C.surface, border:`1px solid ${C.border}`, borderRadius:12,
          padding: isMobile ? '14px 16px' : '20px 24px', marginBottom:20,
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:-60, right:-30, width:220, height:220, borderRadius:'50%',
            background:`radial-gradient(circle, ${cfgV.color}0b, transparent 55%)`, pointerEvents:'none' }}/>

          {/* Action bar */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, gap:10, flexWrap:'wrap' }}>
            <button className="veic-action" onClick={() => { setVSel(null); setVTab('info') }}
              style={{ ...actionBtn, display:'flex', alignItems:'center', gap:6 }}>← VOLTAR</button>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button className="veic-action" onClick={() => setModal({type:'veiculo', data:vAtual})} style={actionBtn}>EDITAR</button>
              <button className="veic-action" onClick={() => abrirPDF(fichaVeiculo(vAtual))} style={actionBtn}>PDF</button>
              {vAtual.status !== 'vendido' && vAtual.status !== 'em_venda' && (
                <button className="veic-action" onClick={() => setModal({type:'iniciar_venda', data:vAtual})}
                  style={{ ...actionBtn, borderColor:`${C.green}55`, color:C.green }}>VENDER</button>
              )}
              {vAtual.status === 'em_venda' && procAtual && (
                <button className="veic-action" onClick={() => setVTab('processo')}
                  style={{ ...actionBtn, borderColor:`${C.purple}55`, color:C.purple }}>PROCESSO</button>
              )}
              <button className="veic-action" onClick={() => setModal({type:'del_veiculo', data:vAtual})}
                style={{ ...actionBtn, borderColor:`${C.red}44`, color:C.red }}>⊗</button>
            </div>
          </div>

          {/* Vehicle identity */}
          <div style={{ fontFamily:russo, fontSize: isMobile ? 22 : 34, color:C.text, letterSpacing:'0.03em', lineHeight:1, marginBottom:10 }}>
            {nomeVeiculo(vAtual).toUpperCase()}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
            {vAtual.placa && (
              <span style={{ fontFamily:russo, fontSize:13, color:cfgV.color, background:`${cfgV.color}14`,
                border:`1px solid ${cfgV.color}44`, padding:'3px 12px', borderRadius:4, letterSpacing:'0.12em' }}>
                {vAtual.placa}
              </span>
            )}
            {vAtual.ano_modelo && (
              <span style={{ fontFamily:chakra, fontSize:12, color:C.cyan, background:`${C.cyan}14`, padding:'3px 10px', borderRadius:4 }}>
                {vAtual.ano_modelo}
              </span>
            )}
            <StatusBadge status={vAtual.status} size="md"/>
            {procAtual && (
              <span style={{ fontSize:10, background:`${C.purple}20`, color:C.purple, padding:'3px 10px', borderRadius:3, fontFamily:chakra }}>
                {progressoProcesso(procAtual.etapas).pct}% CONCLUÍDO
              </span>
            )}
          </div>

          {/* Spec strip */}
          <div style={{ display:'flex', gap: isMobile ? 16 : 28, flexWrap:'wrap' }}>
            {[
              ['KM',     fmtN(vAtual.km) + ' km'],
              ['COR',    vAtual.cor         || '—'],
              ['TIPO',   vAtual.tipo         || '—'],
              ['COMB',   vAtual.combustivel  || '—'],
              ...(vAtual.data_entrada ? [['ENTRADA', vAtual.data_entrada]] : []),
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize:8, color:C.faint, fontFamily:russo, letterSpacing:'0.14em', marginBottom:3 }}>{label}</div>
                <div style={{ fontFamily:chakra, fontSize:13, color:C.text, fontWeight:600 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {erro && <ErrorBanner message={erro}/>}

        {/* em_venda banner */}
        {vAtual.status === 'em_venda' && procAtual && (
          <div style={{ background:`${C.purple}10`, border:`1px solid ${C.purple}30`, borderRadius:8,
            padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center',
            justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontFamily:russo, fontSize:10, color:C.purple, letterSpacing:'0.1em', marginBottom:4 }}>
                PROCESSO DE VENDA EM ANDAMENTO
              </div>
              <div style={{ fontSize:12, color:C.muted, fontFamily:chakra }}>
                {procAtual.comprador_nome || '—'} · {fmtR(procAtual.valor_venda)} · {progressoProcesso(procAtual.etapas).concluidas}/{progressoProcesso(procAtual.etapas).total} etapas
              </div>
            </div>
            <div style={{ background:C.border, borderRadius:3, height:4, width:130, overflow:'hidden', flexShrink:0 }}>
              <div style={{ width:`${progressoProcesso(procAtual.etapas).pct}%`, background:C.purple, height:'100%' }}/>
            </div>
          </div>
        )}

        <Tabs tabs={tabs} active={abaAtiva} onChange={setVTab}/>

        <div style={{ marginTop:20 }}>

          {/* ABA: PROCESSO */}
          {abaAtiva === 'processo' && procAtual && (
            <EtapasProcesso
              processo={procAtual} veiculo={vAtual} saving={saving}
              onSave={p => handle(saveProcesso, p)}
              onConcluir={params => handle(concluirProcesso, params)}
              onCancelar={params => handle(cancelarProcesso, params)}
            />
          )}

          {/* ABA: INFO */}
          {abaAtiva === 'info' && (
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
                  ].map(([k, val]) => (
                    <div key={k} style={{ background:C.surface, borderRadius:7, padding:'10px 12px' }}>
                      <div style={{ fontSize:9, color:C.faint, fontFamily:russo, letterSpacing:'0.1em', marginBottom:3 }}>{k.toUpperCase()}</div>
                      <div style={{ fontFamily:chakra, fontWeight:600, fontSize:13, color:C.text }}>{val}</div>
                    </div>
                  ))}
                </div>
                {vAtual.obs && (
                  <div style={{ marginTop:12, background:C.surface, borderRadius:7, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:C.faint, fontFamily:russo, letterSpacing:'0.1em', marginBottom:4 }}>OBSERVAÇÕES</div>
                    <div style={{ fontSize:13, color:C.text }}>{vAtual.obs}</div>
                  </div>
                )}
              </Card>

              <Card>
                <SectionHead title="Valores"/>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  {[
                    ['VALOR DE COMPRA',  fmtR(vAtual.valor_compra),                                      C.amber],
                    ['VALOR DE ANÚNCIO', vAtual.valor_anuncio ? fmtR(vAtual.valor_anuncio) : '—',        C.orange],
                    ['TABELA FIPE',      vAtual.valor_fipe    ? fmtR(vAtual.valor_fipe)    : '—',        C.green],
                  ].map(([l, val, cor]) => (
                    <div key={l} style={{ background:C.surface, borderRadius:7, padding:'12px 14px', borderTop:`2px solid ${cor}` }}>
                      <div style={{ fontSize:9, color:C.faint, fontFamily:russo, letterSpacing:'0.1em', marginBottom:4 }}>{l}</div>
                      <div style={{ fontFamily:chakra, fontSize:18, fontWeight:700, color:cor }}>{val}</div>
                    </div>
                  ))}
                </div>

                {(() => {
                  const cf       = getCf(vAtual)
                  const custoMnt = custoV(vAtual)
                  const custoFx  = custoFixos(vAtual)
                  const total    = (vAtual.valor_compra||0) + custoMnt + custoFx
                  if (total === 0) return null
                  const linhas = [
                    { label:'Valor de Compra',  val: vAtual.valor_compra||0, cor: C.amber,   sempre: true },
                    { label:'Manutenção',        val: custoMnt,               cor: C.orange,  sempre: false },
                    { label:'IPVA',              val: cf?.ipva||0,            cor: '#fb923c', sempre: false },
                    { label:'Licenciamento',     val: cf?.licenciamento||0,   cor: '#fb923c', sempre: false },
                    { label:'Transferência',     val: cf?.transferencia||0,   cor: '#fb923c', sempre: false },
                    { label:'Multas',            val: cf?.multas||0,          cor: '#fb923c', sempre: false },
                    ...(cf?.outros_valor > 0
                      ? [{ label: cf.outros_desc || 'Outros', val: cf.outros_valor, cor: '#fb923c', sempre: false }]
                      : []),
                  ].filter(l => l.sempre || l.val > 0)
                  const margem = vAtual.valor_anuncio > 0 ? vAtual.valor_anuncio - total : null
                  return (
                    <div style={{ background:`${C.red}0c`, border:`1px solid ${C.red}28`, borderRadius:8, padding:'14px', marginBottom:12 }}>
                      <div style={{ fontSize:9, color:C.faint, fontFamily:russo, letterSpacing:'0.12em', marginBottom:10 }}>CUSTO ATUAL DO VEÍCULO</div>
                      {linhas.map(({ label, val, cor }) => (
                        <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:`1px solid ${C.border}` }}>
                          <span style={{ fontSize:12, color:C.muted }}>{label}</span>
                          <span style={{ fontFamily:chakra, fontSize:12, fontWeight:700, color:cor }}>{fmtR(val)}</span>
                        </div>
                      ))}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                        <span style={{ fontFamily:russo, fontSize:11, letterSpacing:'0.08em', color:C.text }}>TOTAL GASTO</span>
                        <span style={{ fontFamily:chakra, fontSize:22, fontWeight:700, color:C.red }}>{fmtR(total)}</span>
                      </div>
                      {margem !== null && (
                        <div style={{ marginTop:8, padding:'7px 10px', borderRadius:6,
                          background: margem >= 0 ? `${C.green}12` : `${C.red}18`,
                          border: `1px solid ${(margem >= 0 ? C.green : C.red)}44` }}>
                          <span style={{ fontFamily:chakra, fontSize:12, fontWeight:700, color: margem >= 0 ? C.green : C.red }}>
                            {margem >= 0
                              ? `▲ Margem estimada: ${fmtR(margem)} (anúncio: ${fmtR(vAtual.valor_anuncio)})`
                              : `▼ Anúncio abaixo do custo: ${fmtR(Math.abs(margem))}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {vAtual.valor_fipe > 0 && vAtual.valor_anuncio > 0 && (() => {
                  const diff = vAtual.valor_anuncio - vAtual.valor_fipe
                  const pct  = (diff / vAtual.valor_fipe) * 100
                  const cor  = diff < 0 ? C.green : diff > 0 ? C.red : C.muted
                  return (
                    <div style={{ background:C.cardHi, borderRadius:8, padding:'10px 14px', border:`1px solid ${cor}28`, marginBottom:16 }}>
                      <div style={{ fontSize:9, color:C.faint, fontFamily:russo, letterSpacing:'0.12em', marginBottom:4 }}>ANÚNCIO VS FIPE</div>
                      <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ fontFamily:chakra, fontSize:16, fontWeight:700, color:cor }}>{diff >= 0 ? '+' : ''}{fmtR(diff)}</span>
                        <span style={{ fontFamily:chakra, fontSize:13, fontWeight:700, color:cor }}>({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span>
                        <span style={{ fontSize:12, color:cor }}>{diff < 0 ? '▼ Abaixo da tabela' : diff > 0 ? '▲ Acima da tabela' : '= Na tabela'}</span>
                      </div>
                    </div>
                  )
                })()}

                <FipeHistoricoChart historico={vAtual.fipe_historico} valorEntrada={vAtual.valor_compra}/>

                {vAtual.status !== 'em_venda' && vAtual.status !== 'vendido' && (
                  <>
                    <SectionHead title="Alterar Status"/>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {Object.entries(STATUS_VEICULO_CFG)
                        .filter(([k]) => k !== 'vendido' && k !== 'em_venda')
                        .map(([k, cfg]) => (
                          <button key={k} className="veic-action"
                            onClick={() => handle(saveVeiculo, { ...vAtual, status:k, servicos:undefined })}
                            style={{
                              background: vAtual.status === k ? `${cfg.color}28` : 'transparent',
                              color: cfg.color,
                              border: `1px solid ${cfg.color}${vAtual.status === k ? '77' : '44'}`,
                              borderRadius:4, padding:'7px 16px', fontSize:10, cursor:'pointer',
                              fontFamily:russo, letterSpacing:'0.06em',
                              display:'inline-flex', alignItems:'center', gap:6,
                            }}>
                            <Icon name={cfg.icon} size={11}/> {cfg.label.toUpperCase()}
                          </button>
                        ))
                      }
                    </div>
                  </>
                )}

                {vAtual.status === 'vendido' && (
                  <div style={{ marginTop:16, background:`${C.purple}12`, border:`1px solid ${C.purple}33`, borderRadius:8, padding:14 }}>
                    <div style={{ fontFamily:russo, fontSize:10, letterSpacing:'0.1em', color:C.purple, marginBottom:8 }}>DADOS DA VENDA</div>
                    {[
                      ['Data',      vAtual.data_venda],
                      ['Valor',     fmtR(vAtual.valor_venda)],
                      ['Comprador', vAtual.comprador_nome],
                      ['CPF/CNPJ',  vAtual.comprador_doc],
                    ].map(([k, val]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0', borderBottom:`1px solid ${C.border}` }}>
                        <span style={{ color:C.muted }}>{k}</span>
                        <span style={{ fontFamily:chakra, fontWeight:600 }}>{val || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Grid>
          )}

          {/* ABA: SERVIÇOS */}
          {abaAtiva === 'servicos' && (
            <div>
              {vAtual.status !== 'vendido' && (
                <div style={{ marginBottom:16, textAlign:'right' }}>
                  <Btn onClick={() => setModal({type:'servico', data:null})}>+ Registrar Serviço</Btn>
                </div>
              )}
              {(vAtual.servicos?.length > 0) && (() => {
                const totalPecas  = (vAtual.servicos||[]).reduce((s,m) => s+(m.custo_pecas||0), 0)
                const totalMao    = (vAtual.servicos||[]).reduce((s,m) => s+(m.custo_mao||0), 0)
                const totalOutros = (vAtual.servicos||[]).reduce((s,m) => s+(m.outros||0), 0)
                const totalGeral  = totalPecas + totalMao + totalOutros
                return (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:16 }}>
                    {[
                      ['PEÇAS',    totalPecas,  C.blue],
                      ['MÃO OBRA', totalMao,    C.green],
                      ['OUTROS',   totalOutros, C.cyan],
                      ['TOTAL',    totalGeral,  C.amber],
                    ].map(([l, val, cor]) => (
                      <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 14px', borderTop:`2px solid ${cor}` }}>
                        <div style={{ fontSize:9, color:C.faint, fontFamily:russo, letterSpacing:'0.1em', marginBottom:4 }}>{l}</div>
                        <div style={{ fontFamily:chakra, fontSize:16, fontWeight:700, color:cor }}>{fmtR(val)}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}
              {!(vAtual.servicos?.length)
                ? <div style={{ textAlign:'center', color:C.faint, padding:50, fontFamily:russo, fontSize:12, letterSpacing:'0.08em' }}>NENHUM SERVIÇO REGISTRADO</div>
                : (vAtual.servicos||[]).map(s => {
                    const total = (s.custo_pecas||0) + (s.custo_mao||0) + (s.outros||0)
                    const cfg   = STATUS_SERV_CFG[s.status] || { color:C.muted }
                    return (
                      <div key={s.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:16, marginBottom:10, borderLeft:`3px solid ${cfg.color}` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            <span style={{ fontFamily:russo, fontSize:14, letterSpacing:'0.02em' }}>{s.tipo.toUpperCase()}</span>
                            <Badge status={s.status} cfg={STATUS_SERV_CFG}/>
                          </div>
                          {vAtual.status !== 'vendido' && (
                            <div style={{ display:'flex', gap:6 }}>
                              <Btn variant="ghost" small onClick={() => setModal({type:'servico', data:s})}>✏️</Btn>
                              <Btn variant="danger" small onClick={() => handle(removeServico, s.id)}>🗑</Btn>
                            </div>
                          )}
                        </div>
                        <p style={{ margin:'0 0 10px', fontSize:13, color:C.muted }}>{s.descricao}</p>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8 }}>
                          {[
                            ['PRESTADOR', s.prestador?.nome || '—'],
                            ['DATA',      s.data_servico],
                            ['PEÇAS',     fmtR(s.custo_pecas)],
                            ['MÃO OBRA',  fmtR(s.custo_mao)],
                            ['OUTROS',    fmtR(s.outros)],
                          ].map(([l, val]) => (
                            <div key={l} style={{ background:C.card, borderRadius:6, padding:'8px 10px' }}>
                              <div style={{ fontSize:9, color:C.faint, fontFamily:russo, letterSpacing:'0.1em' }}>{l}</div>
                              <div style={{ fontFamily:chakra, fontSize:12, fontWeight:600, marginTop:2 }}>{val}</div>
                            </div>
                          ))}
                          <div style={{ background:`${C.amber}14`, border:`1px solid ${C.amber}28`, borderRadius:6, padding:'8px 10px' }}>
                            <div style={{ fontSize:9, color:C.faint, fontFamily:russo, letterSpacing:'0.1em' }}>TOTAL</div>
                            <div style={{ fontFamily:chakra, fontSize:14, fontWeight:700, color:C.amber, marginTop:2 }}>{fmtR(total)}</div>
                          </div>
                        </div>
                        {s.garantia && <div style={{ fontSize:11, color:C.muted, marginTop:8 }}>🛡 Garantia: {s.garantia}</div>}
                      </div>
                    )
                  })
              }
            </div>
          )}

          {/* ABA: CUSTOS */}
          {abaAtiva === 'custos' && (
            <Grid cols={3} gap={14} mobileCols={2}>
              {[
                ['PEÇAS',            (vAtual.servicos||[]).reduce((s,m) => s+(m.custo_pecas||0), 0), C.blue],
                ['MÃO DE OBRA',      (vAtual.servicos||[]).reduce((s,m) => s+(m.custo_mao||0), 0),   C.green],
                ['OUTROS',           (vAtual.servicos||[]).reduce((s,m) => s+(m.outros||0), 0),       '#22d4dd'],
                ['TOTAL MANUTENÇÃO', custoV(vAtual),                                                  C.amber],
                ['DOCS / FIXOS',     custoFixos(vAtual),                                              '#fb923c'],
                ['VALOR DE COMPRA',  vAtual.valor_compra||0,                                          '#a78bfa'],
                ['CUSTO TOTAL',      (vAtual.valor_compra||0)+custoV(vAtual)+custoFixos(vAtual),      C.red],
              ].map(([l, val, c]) => (
                <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'14px 16px', borderTop:`2px solid ${c}` }}>
                  <div style={{ fontSize:9, color:C.faint, fontFamily:russo, letterSpacing:'0.1em', marginBottom:4 }}>{l}</div>
                  <div style={{ fontFamily:chakra, fontSize:18, fontWeight:700, color:c }}>{fmtR(val)}</div>
                </div>
              ))}
            </Grid>
          )}
        </div>

        {modal?.type==='veiculo'       && <ModalVeiculo data={modal.data} onSave={d=>handle(saveVeiculo,{...d,servicos:undefined})} onClose={()=>setModal(null)} loading={saving}/>}
        {modal?.type==='iniciar_venda' && <ModalIniciarVenda veiculo={modal.data}
          onSave={dados => handle(async () => {
            await saveProcesso(dados)
            await saveVeiculo({ ...vAtual, status:'em_venda', servicos:undefined, custos_fixos:undefined })
            setVTab('processo')
          })}
          onClose={()=>setModal(null)} loading={saving}/>}
        {modal?.type==='servico'       && <ModalServico data={modal.data} veiculoId={vAtual.id} prestadores={prestadores} onSave={d=>handle(saveServico,d)} onClose={()=>setModal(null)} loading={saving}/>}
        {modal?.type==='del_veiculo'   && <ModalConfirm title="Excluir Veículo" message={`Excluir ${nomeVeiculo(vAtual)}? Esta ação não pode ser desfeita.`} onConfirm={()=>handle(removeVeiculo,vAtual.id).then(()=>setVSel(null))} onClose={()=>setModal(null)} loading={saving}/>}
      </div>
    )
  }

  /* ─────────────────────────── LISTAGEM ─────────────────────────── */
  const countByStatus = Object.fromEntries(
    Object.keys(STATUS_VEICULO_CFG)
      .filter(k => k !== 'vendido')
      .map(k => [k, ativos.filter(v => v.status === k).length])
  )

  return (
    <div>
      <style>{VEIC_CSS}</style>

      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, gap:10, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontFamily:russo, fontSize: isMobile ? 22 : 30, color:C.text, letterSpacing:'0.04em', lineHeight:1, marginBottom:5 }}>
            ESTOQUE ATIVO
          </div>
          <div style={{ fontFamily:chakra, fontSize:11, color:C.muted, letterSpacing:'0.06em' }}>
            {ativos.length} VEÍCULOS · {filtrados.length} VISÍVEIS
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <button className="veic-action" onClick={() => abrirPDF(relatorioEstoque(filtrados))} style={ghostBtn}>EXPORTAR PDF</button>
          <button className="veic-action" onClick={() => setModal({type:'veiculo', data:null})} style={primaryBtn}>+ NOVO VEÍCULO</button>
        </div>
      </div>

      {erro && <ErrorBanner message={erro}/>}

      {/* Search + filter pills */}
      <div style={{ marginBottom:18 }}>
        <input
          ref={buscaRef}
          value={filtro.busca}
          onChange={e => setFiltro(p => ({ ...p, busca:e.target.value }))}
          placeholder="PLACA · MARCA · MODELO"
          style={{
            background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
            color:C.text, padding:'9px 14px', fontSize:11, fontFamily:russo,
            letterSpacing:'0.06em', width: isMobile ? '100%' : 260,
            outline:'none', marginBottom:10, display:'block',
          }}
        />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[
            { key:'todos', label:'TODOS', count: ativos.length, color: C.muted },
            ...Object.entries(STATUS_VEICULO_CFG)
              .filter(([k]) => k !== 'vendido')
              .map(([k, cfg]) => ({ key:k, label:cfg.label.toUpperCase(), count: countByStatus[k]||0, color: cfg.color }))
          ].map(({ key, label, count, color }) => {
            const active = filtro.status === key
            return (
              <button key={key} className="veic-pill"
                onClick={() => setFiltro(p => ({ ...p, status:key }))}
                style={{
                  background: active ? `${color}1c` : 'transparent',
                  border: `1px solid ${active ? color+'55' : C.border}`,
                  color: active ? color : C.faint,
                  borderRadius:4, padding:'5px 10px', fontSize:9,
                  fontFamily:russo, letterSpacing:'0.08em', cursor:'pointer',
                  display:'inline-flex', alignItems:'center', gap:6,
                }}>
                {label}
                <span style={{ background: active ? color : C.subtle, color: active ? '#08090d' : C.muted, borderRadius:10, padding:'1px 6px', fontSize:9, fontFamily:chakra }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Vehicle cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {filtrados.map((v, i) => {
          const nome     = nomeVeiculo(v)
          const ano      = anoVeiculo(v)
          const cfg      = STATUS_VEICULO_CFG[v.status] || { color:C.muted, label:v.status }
          const proc     = getProcesso(v.id)
          const prog     = proc ? progressoProcesso(proc.etapas) : null
          const custoMnt = custoV(v)
          const preco    = proc ? proc.valor_venda : (v.valor_anuncio || v.valor_compra)
          const precoCor = proc ? C.purple : C.amber

          return (
            <div key={v.id} className="veic-card"
              onClick={() => { setVSel(v); setVTab(proc ? 'processo' : 'info') }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${cfg.color}66`; e.currentTarget.style.background = C.cardHi }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card }}
              style={{
                background:C.card, border:`1px solid ${C.border}`, borderRadius:8,
                overflow:'hidden', cursor:'pointer', display:'flex',
                animation: `veic-in 0.22s ease ${Math.min(i, 8) * 0.03}s both`,
              }}>

              {/* Status spine */}
              <div style={{
                width: isMobile ? 7 : 28,
                background:`${cfg.color}16`, borderRight:`1px solid ${cfg.color}28`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              }}>
                {!isMobile && (
                  <span style={{
                    fontSize:7, color:cfg.color, fontFamily:russo, letterSpacing:'0.14em',
                    transform:'rotate(-90deg)', whiteSpace:'nowrap', opacity:0.7, userSelect:'none',
                  }}>
                    {SPINE_LABEL[v.status] || v.status}
                  </span>
                )}
              </div>

              {/* Content */}
              <div style={{ flex:1, padding: isMobile ? '11px 12px' : '12px 16px', minWidth:0 }}>
                {/* Row 1: name + price */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                  <div style={{ fontFamily:russo, fontSize: isMobile ? 13 : 15, color:C.text, letterSpacing:'0.02em', lineHeight:1.2, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {nome.toUpperCase()}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:chakra, fontSize:15, fontWeight:700, color:precoCor, lineHeight:1 }}>
                      {fmtR(preco)}
                    </div>
                    {custoMnt > 0 && (
                      <div style={{ fontSize:9, color:C.faint, fontFamily:chakra, marginTop:2 }}>MNT {fmtR(custoMnt)}</div>
                    )}
                  </div>
                </div>

                {/* Row 2: tags */}
                <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginTop:7 }}>
                  {v.placa && (
                    <span style={{ fontFamily:russo, fontSize:11, color:cfg.color, background:`${cfg.color}14`, border:`1px solid ${cfg.color}2e`, padding:'1px 8px', borderRadius:3, letterSpacing:'0.08em' }}>
                      {v.placa}
                    </span>
                  )}
                  {ano !== '—' && (
                    <span style={{ fontFamily:chakra, fontSize:11, color:C.cyan, background:`${C.cyan}14`, padding:'1px 7px', borderRadius:3 }}>
                      {ano}
                    </span>
                  )}
                  <span style={{ fontFamily:chakra, fontSize:11, color:C.muted }}>{fmtN(v.km)} km</span>
                  {v.cor  && <span style={{ fontSize:11, color:C.faint }}>· {v.cor}</span>}
                  {v.tipo && !isMobile && <span style={{ fontSize:11, color:C.faint }}>· {v.tipo}</span>}
                  {v.valor_fipe > 0 && (
                    <span style={{ fontFamily:chakra, fontSize:10, color:C.green }}>
                      FIPE {fmtR(v.valor_fipe)}
                      {v.valor_anuncio > 0 && (() => {
                        const diff = v.valor_anuncio - v.valor_fipe
                        const cor  = diff < 0 ? C.green : C.red
                        return <span style={{ color:cor, marginLeft:4 }}>({diff >= 0 ? '+' : ''}{((diff / v.valor_fipe) * 100).toFixed(1)}%)</span>
                      })()}
                    </span>
                  )}
                  {!isMobile && <StatusBadge status={v.status} size="sm"/>}
                </div>

                {/* Processo progress */}
                {proc && prog && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ background:C.border, borderRadius:2, height:3, overflow:'hidden', width:110 }}>
                      <div style={{ width:`${prog.pct}%`, background:C.purple, height:'100%', borderRadius:2 }}/>
                    </div>
                    <span style={{ fontSize:9, color:C.purple, fontFamily:chakra, letterSpacing:'0.04em' }}>
                      PROCESSO {prog.pct}% · {prog.concluidas}/{prog.total}
                    </span>
                  </div>
                )}

                <DepreciacaoRow v={v}/>
              </div>

              {/* Right indicator */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0 12px', flexShrink:0 }}>
                {isMobile
                  ? <div style={{ width:7, height:7, borderRadius:'50%', background:cfg.color, boxShadow:`0 0 8px ${cfg.color}88` }}/>
                  : <span style={{ color:C.faint, fontSize:16 }}>›</span>
                }
              </div>
            </div>
          )
        })}

        {!filtrados.length && (
          <div style={{ textAlign:'center', color:C.faint, padding:60, fontFamily:russo, fontSize:12, letterSpacing:'0.1em' }}>
            NENHUM VEÍCULO ENCONTRADO
          </div>
        )}
      </div>

      {modal?.type==='veiculo' && <ModalVeiculo data={null} onSave={d=>handle(saveVeiculo,d)} onClose={()=>setModal(null)} loading={saving}/>}
    </div>
  )
}
