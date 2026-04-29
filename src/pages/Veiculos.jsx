import { useState } from 'react'
import { Badge, Btn, Card, Tabs, Grid, SectionHead, ErrorBanner } from '../components/UI'
import { ModalVeiculo, ModalVender, ModalServico, ModalConfirm } from '../components/Modals'
import { C, STATUS_VEICULO_CFG, STATUS_SERV_CFG, TIPOS_VEICULO, fmtR, fmtN, fmtPct, custoV, diasNoEstoque, today } from '../lib/constants'

export default function Veiculos({ veiculos, prestadores, saveVeiculo, removeVeiculo, saveServico, removeServico }) {
  const [vSel, setVSel]   = useState(null)
  const [vTab, setVTab]   = useState('info')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [erro, setErro]   = useState(null)
  const [filtro, setFiltro] = useState({ status: 'todos', tipo: 'todos', busca: '' })

  const ativos = veiculos.filter(v => v.status !== 'vendido')
  const filtrados = ativos.filter(v => {
    if (filtro.status !== 'todos' && v.status !== filtro.status) return false
    if (filtro.tipo !== 'todos' && v.tipo !== filtro.tipo) return false
    if (filtro.busca) {
      const b = filtro.busca.toLowerCase()
      return v.placa?.toLowerCase().includes(b) || v.modelo?.toLowerCase().includes(b)
    }
    return true
  })

  const handle = async (fn, ...args) => {
    try { setSaving(true); setErro(null); await fn(...args); setModal(null) }
    catch (e) { setErro(e.message) }
    finally { setSaving(false) }
  }

  const vAtual = vSel ? veiculos.find(v => v.id === vSel.id) || vSel : null

  const inp = {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.text, padding: '9px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit'
  }

  if (vAtual) return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Btn variant="ghost" small onClick={() => setVSel(null)}>← Voltar</Btn>
          <span style={{ color: C.muted }}>|</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{vAtual.modelo}</span>
          <Badge status={vAtual.status} cfg={STATUS_VEICULO_CFG} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" small onClick={() => setModal({ type: 'veiculo', data: vAtual })}>✏️ Editar</Btn>
          {vAtual.status !== 'vendido' && <Btn variant="success" small onClick={() => setModal({ type: 'vender', data: vAtual })}>🏷 Registrar Venda</Btn>}
          <Btn variant="danger" small onClick={() => setModal({ type: 'del_veiculo', data: vAtual })}>🗑</Btn>
        </div>
      </div>
      {erro && <ErrorBanner message={erro} />}
      <Tabs tabs={[{ id: 'info', icon: '📄', label: 'Informações' }, { id: 'servicos', icon: '🔧', label: `Serviços (${(vAtual.servicos || []).length})` }, { id: 'custos', icon: '💰', label: 'Custos' }]} active={vTab} onChange={setVTab} />
      <div style={{ marginTop: 20 }}>

        {vTab === 'info' && (
          <Grid cols={2} gap={20}>
            <Card>
              <SectionHead title="Dados do Veículo" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Placa', vAtual.placa], ['Modelo', vAtual.modelo], ['Tipo', vAtual.tipo], ['Ano', vAtual.ano], ['KM', fmtN(vAtual.km) + ' km'], ['Cor', vAtual.cor], ['Combustível', vAtual.combustivel], ['Chassi', vAtual.chassi || '—'], ['Entrada', vAtual.data_entrada || '—'], ['Valor', fmtR(vAtual.valor_estoque)]].map(([k, v]) => (
                  <div key={k} style={{ background: C.surface, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 2 }}>{k.toUpperCase()}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                  </div>
                ))}
              </div>
              {vAtual.obs && <div style={{ marginTop: 12, background: C.surface, borderRadius: 8, padding: '10px 12px' }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700 }}>OBSERVAÇÕES</div><div style={{ fontSize: 13 }}>{vAtual.obs}</div></div>}
            </Card>
            <Card>
              <SectionHead title="Alterar Status" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(STATUS_VEICULO_CFG).filter(([k]) => k !== 'vendido').map(([k, cfg]) => (
                  <button key={k} onClick={() => handle(saveVeiculo, { ...vAtual, status: k, servicos: undefined })} style={{ background: vAtual.status === k ? cfg.color + '33' : 'transparent', color: cfg.color, border: `1px solid ${cfg.color}55`, borderRadius: 20, padding: '7px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
              {vAtual.status === 'vendido' && (
                <div style={{ marginTop: 16, background: '#a78bfa15', border: '1px solid #a78bfa44', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>🏷 Dados da Venda</div>
                  {[['Data', vAtual.data_venda], ['Valor', fmtR(vAtual.valor_venda)], ['Comprador', vAtual.comprador_nome], ['CPF/CNPJ', vAtual.comprador_doc]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.muted }}>{k}</span><span style={{ fontWeight: 600 }}>{v || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Grid>
        )}

        {vTab === 'servicos' && (
          <div>
            {vAtual.status !== 'vendido' && <div style={{ marginBottom: 16, textAlign: 'right' }}><Btn onClick={() => setModal({ type: 'servico', data: null })}>+ Registrar Serviço</Btn></div>}
            {!(vAtual.servicos?.length) ? (
              <div style={{ textAlign: 'center', color: C.muted, padding: 50 }}>Nenhum serviço registrado.</div>
            ) : (vAtual.servicos || []).map(s => {
              const total = (s.custo_pecas || 0) + (s.custo_mao || 0) + (s.outros || 0)
              const cfg = STATUS_SERV_CFG[s.status] || { color: C.muted }
              return (
                <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 10, borderLeft: `3px solid ${cfg.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{s.tipo}</span>
                      <Badge status={s.status} cfg={STATUS_SERV_CFG} />
                    </div>
                    {vAtual.status !== 'vendido' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn variant="ghost" small onClick={() => setModal({ type: 'servico', data: s })}>✏️</Btn>
                        <Btn variant="danger" small onClick={() => handle(removeServico, s.id)}>🗑</Btn>
                      </div>
                    )}
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 13 }}>{s.descricao}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 }}>
                    {[['Prestador', s.prestador?.nome || '—'], ['Data', s.data_servico], ['Peças', fmtR(s.custo_pecas)], ['Mão Obra', fmtR(s.custo_mao)], ['Outros', fmtR(s.outros)]].map(([l, v]) => (
                      <div key={l} style={{ background: C.card, borderRadius: 7, padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{l}</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
                      </div>
                    ))}
                    <div style={{ background: '#f59e0b18', border: '1px solid #f59e0b33', borderRadius: 7, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>TOTAL</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>{fmtR(total)}</div>
                    </div>
                  </div>
                  {s.garantia && <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>🛡 Garantia: {s.garantia}</div>}
                </div>
              )
            })}
          </div>
        )}

        {vTab === 'custos' && (
          <div>
            <Grid cols={3} gap={14} style={{ marginBottom: 20 }}>
              {[
                ['Custo Peças', (vAtual.servicos || []).reduce((s, m) => s + (m.custo_pecas || 0), 0), C.blue],
                ['Custo Mão de Obra', (vAtual.servicos || []).reduce((s, m) => s + (m.custo_mao || 0), 0), C.green],
                ['Outros', (vAtual.servicos || []).reduce((s, m) => s + (m.outros || 0), 0), C.cyan],
                ['Total Manutenção', custoV(vAtual), C.amber],
                ['Valor Estoque', vAtual.valor_estoque, '#a78bfa'],
                ['Custo Total', (vAtual.valor_estoque || 0) + custoV(vAtual), C.red],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', borderTop: `3px solid ${c}` }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: "'JetBrains Mono',monospace" }}>{fmtR(v)}</div>
                </div>
              ))}
            </Grid>
          </div>
        )}
      </div>

      {modal?.type === 'veiculo' && <ModalVeiculo data={modal.data} onSave={d => handle(saveVeiculo, { ...d, servicos: undefined })} onClose={() => setModal(null)} loading={saving} />}
      {modal?.type === 'vender' && <ModalVender data={modal.data} onSave={d => handle(saveVeiculo, { ...d, servicos: undefined })} onClose={() => setModal(null)} loading={saving} />}
      {modal?.type === 'servico' && <ModalServico data={modal.data} veiculoId={vAtual.id} prestadores={prestadores} onSave={d => handle(saveServico, d)} onClose={() => setModal(null)} loading={saving} />}
      {modal?.type === 'del_veiculo' && <ModalConfirm title="Excluir Veículo" message={`Excluir ${vAtual.modelo} — ${vAtual.placa}? Esta ação não pode ser desfeita.`} onConfirm={() => handle(removeVeiculo, vAtual.id).then(() => setVSel(null))} onClose={() => setModal(null)} loading={saving} />}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>Estoque Ativo</h2><p style={{ margin: 0, color: C.muted, fontSize: 13 }}>{ativos.length} veículos cadastrados</p></div>
        <Btn onClick={() => setModal({ type: 'veiculo', data: null })}>+ Novo Veículo</Btn>
      </div>
      {erro && <ErrorBanner message={erro} />}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={filtro.busca} onChange={e => setFiltro(p => ({ ...p, busca: e.target.value }))} placeholder="🔍 Buscar placa ou modelo..." style={{ ...inp, width: 240 }} />
        <select value={filtro.status} onChange={e => setFiltro(p => ({ ...p, status: e.target.value }))} style={inp}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_VEICULO_CFG).filter(([k]) => k !== 'vendido').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtro.tipo} onChange={e => setFiltro(p => ({ ...p, tipo: e.target.value }))} style={inp}>
          <option value="todos">Todos os tipos</option>
          {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtrados.map(v => {
          const c = custoV(v)
          return (
            <div key={v.id} onClick={() => { setVSel(v); setVTab('info') }} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${STATUS_VEICULO_CFG[v.status]?.color || C.muted}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 22 }}>{v.tipo === 'Pick-up' ? '🛻' : v.tipo?.includes('Caminhão') ? '🚛' : '🚐'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{v.modelo}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{v.placa} · {v.ano} · {fmtN(v.km)} km · {v.cor}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: C.amber, fontSize: 14 }}>{fmtR(v.valor_estoque)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Mnt: {fmtR(c)}</div>
                </div>
                <Badge status={v.status} cfg={STATUS_VEICULO_CFG} />
                <span style={{ color: C.muted, fontSize: 18 }}>›</span>
              </div>
            </div>
          )
        })}
        {!filtrados.length && <div style={{ textAlign: 'center', color: C.muted, padding: 50 }}>Nenhum veículo encontrado.</div>}
      </div>
      {modal?.type === 'veiculo' && <ModalVeiculo data={null} onSave={d => handle(saveVeiculo, d)} onClose={() => setModal(null)} loading={saving} />}
    </div>
  )
}
