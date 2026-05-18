import { useState } from 'react'
import { C, fmtR, custoV, custoFixos, fmtData, STATUS_SERV_CFG } from '../lib/constants'
import { Badge, Btn, Tabs } from './UI'
import { ModalServico } from './Modals'
import { MoedaInput, DateInput } from './Inputs'

/* Detalhe de veículo vendido no pós-venda.
   Permite editar dados da venda e gerenciar serviços/custos pré e pós-venda.
   Usage: <DetalheVendido venda={vr} veiculos={veiculos} ... onVoltar={fn} /> */
export default function DetalheVendido({
  venda, veiculos,
  saveVendaRelacao, saveServico, removeServico,
  prestadores = [],
  onVoltar,
}) {
  const [tab,    setTab]    = useState('venda')
  const [modal,  setModal]  = useState(null)
  const [saving, setSaving] = useState(false)

  // Sempre busca veículo atualizado para refletir novos serviços após saves
  const v = veiculos.find(x => x.id === venda.veiculo_id) || venda.veiculo
  const titulo = v ? `${v.marca_nome || ''} ${v.modelo_nome || ''} — ${v.placa || ''}` : '—'
  const icone  = v?.tipo?.toLowerCase().includes('pick') ? '🛻'
               : v?.tipo?.toLowerCase().includes('caminhão') ? '🚛' : '🚐'

  async function saveServicoAndClose(d) {
    setSaving(true)
    try { await saveServico(d); setModal(null) }
    finally { setSaving(false) }
  }

  async function removeServicoById(id) {
    setSaving(true)
    try { await removeServico(id) }
    finally { setSaving(false) }
  }

  const tabs = [
    { id: 'venda',    icon: '🏷', label: 'Dados da Venda' },
    { id: 'servicos', icon: '🔧', label: `Serviços (${(v?.servicos || []).length})` },
    { id: 'custos',   icon: '💰', label: 'Custos' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Btn variant="ghost" small onClick={onVoltar}>← Voltar</Btn>
        <span style={{ color: C.muted }}>|</span>
        <span style={{ fontSize: 20 }}>{icone}</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{titulo}</span>
        <span style={{ fontSize: 11, background: '#a78bfa20', color: '#a78bfa', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
          Vendido em {fmtData(venda.data_venda)}
        </span>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div style={{ marginTop: 20 }}>
        {tab === 'venda'    && (
          <AbaVenda venda={venda} onSalvar={saveVendaRelacao} />
        )}
        {tab === 'servicos' && (
          <AbaServicos
            v={v}
            saving={saving}
            onAdd={()  => setModal({ type: 'servico', data: null })}
            onEdit={s  => setModal({ type: 'servico', data: s })}
            onRemove={removeServicoById}
          />
        )}
        {tab === 'custos' && (
          <AbaCustos v={v} venda={venda} />
        )}
      </div>

      {modal?.type === 'servico' && (
        <ModalServico
          data={modal.data}
          veiculoId={v?.id}
          prestadores={prestadores}
          onSave={saveServicoAndClose}
          onClose={() => setModal(null)}
          loading={saving}
        />
      )}
    </div>
  )
}

// Formulário inline de dados da venda (mesmos campos do ModalEditarVenda)
function AbaVenda({ venda, onSalvar }) {
  const [f, setF] = useState({
    id:              venda.id,
    veiculo_id:      venda.veiculo_id,
    cliente_id:      venda.cliente_id,
    data_venda:      venda.data_venda      || '',
    valor_venda:     venda.valor_venda     || 0,
    garantia_dias:   venda.garantia_dias   || 90,
    garantia_inicio: venda.garantia_inicio || venda.data_venda || '',
    observacoes:     venda.observacoes     || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  async function handleSalvar() {
    setSaving(true)
    try { await onSalvar(f) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <DateInput  label="Data da Venda"       value={f.data_venda}      onChange={v => set('data_venda', v)}      required />
      <MoedaInput label="Valor de Venda (R$)" value={f.valor_venda}     onChange={v => set('valor_venda', v)}     highlight={C.green} required />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelSt}>PRAZO DE GARANTIA (dias)</label>
          <input
            type="number" min={0} max={365}
            value={f.garantia_dias}
            onChange={e => set('garantia_dias', parseInt(e.target.value) || 90)}
            style={inputSt}
          />
        </div>
        <DateInput label="Início da Garantia" value={f.garantia_inicio} onChange={v => set('garantia_inicio', v)} />
      </div>

      <div>
        <label style={labelSt}>OBSERVAÇÕES</label>
        <textarea
          value={(f.observacoes || '').toUpperCase()}
          onChange={e => set('observacoes', e.target.value.toUpperCase())}
          rows={2} placeholder="NOTAS ADICIONAIS..."
          style={{ ...inputSt, resize: 'vertical', textTransform: 'uppercase' }}
        />
      </div>

      <div>
        <Btn onClick={handleSalvar} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Btn>
      </div>
    </div>
  )
}

// Lista de serviços — edição sempre habilitada (custos pós-venda são esperados)
function AbaServicos({ v, saving, onAdd, onEdit, onRemove }) {
  const servicos = v?.servicos || []

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Btn onClick={onAdd}>+ Registrar Serviço</Btn>
      </div>

      {!servicos.length
        ? <div style={{ textAlign: 'center', color: C.muted, padding: 50 }}>Nenhum serviço registrado.</div>
        : servicos.map(s => {
            const total = (s.custo_pecas || 0) + (s.custo_mao || 0) + (s.outros || 0)
            const cfg   = STATUS_SERV_CFG[s.status] || { color: C.muted }
            return (
              <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 10, borderLeft: `3px solid ${cfg.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{s.tipo}</span>
                    <Badge status={s.status} cfg={STATUS_SERV_CFG} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn variant="ghost"  small onClick={() => onEdit(s)}>✏️</Btn>
                    <Btn variant="danger" small onClick={() => onRemove(s.id)} disabled={saving}>🗑</Btn>
                  </div>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 13 }}>{s.descricao}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
                  {[
                    ['Prestador', s.prestador?.nome || '—'],
                    ['Data',      s.data_servico],
                    ['Peças',     fmtR(s.custo_pecas)],
                    ['Mão Obra',  fmtR(s.custo_mao)],
                    ['Outros',    fmtR(s.outros)],
                  ].map(([l, val]) => (
                    <div key={l} style={{ background: C.card, borderRadius: 7, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{l}</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{val}</div>
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
          })
      }
    </div>
  )
}

// Grid de custos: compra + manutenção + fixos + venda = lucro líquido
function AbaCustos({ v, venda }) {
  const mnt        = custoV(v)
  const fixos      = custoFixos(v)
  const compra     = v?.valor_compra || 0
  const totalCusto = compra + mnt + fixos
  const lucro      = (venda?.valor_venda || 0) - totalCusto
  const corLucro   = lucro >= 0 ? C.green : C.red

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
      {[
        ['Custo Peças',      (v?.servicos || []).reduce((s, m) => s + (m.custo_pecas || 0), 0), C.blue],
        ['Mão de Obra',      (v?.servicos || []).reduce((s, m) => s + (m.custo_mao   || 0), 0), C.green],
        ['Outros',           (v?.servicos || []).reduce((s, m) => s + (m.outros      || 0), 0), '#22d4dd'],
        ['Total Manutenção', mnt,                                                                C.amber],
        ['Docs / Fixos',     fixos,                                                              '#fb923c'],
        ['Valor de Compra',  compra,                                                             '#a78bfa'],
        ['Custo Total',      totalCusto,                                                         C.red],
        ['Valor de Venda',   venda?.valor_venda || 0,                                            C.green],
        ['Lucro Líquido',    lucro,                                                              corLucro],
      ].map(([l, val, c]) => (
        <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', borderTop: `3px solid ${c}` }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{l}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: "'JetBrains Mono',monospace" }}>{fmtR(val)}</div>
        </div>
      ))}
    </div>
  )
}

const labelSt = {
  fontSize: 11, color: C.muted, fontWeight: 700,
  letterSpacing: 0.5, display: 'block', marginBottom: 5,
}

const inputSt = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, padding: '10px 14px', fontSize: 14, width: '100%',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
