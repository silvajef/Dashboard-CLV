import { useState, useMemo } from 'react'
import { C, fmtR, custoV, custoFixos, fmtData } from '../lib/constants'
import { KPI, Grid, Modal, Btn } from '../components/UI'
import { MoedaInput, UpperInput, DocInput, DateInput, SelectInput } from '../components/Inputs'
import { useAuth } from '../hooks/useAuth'
import {
  calcularGarantias,
  resumoGarantias,
  formatarStatusGarantia,
  STATUS_GARANTIA,
} from '../lib/garantia'

const SUB_ABAS = [
  { id: 'vendas',    label: 'Vendas',    icon: '🏷' },
  { id: 'clientes',  label: 'Clientes',  icon: '👤' },
  { id: 'garantias', label: 'Garantias', icon: '🛡' },
]

export default function PosVenda({
  veiculos = [],
  clientes = [],
  vendasRelacao = [],
  saveVendaRelacao,
  saveCliente,
  removeCliente,
}) {
  const [sub, setSub] = useState('vendas')

  const vendasComGarantia = useMemo(
    () => calcularGarantias(vendasRelacao),
    [vendasRelacao]
  )

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>Pós-Venda</h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>
          Gestão de clientes, vendas e garantias dos veículos comercializados
        </p>
      </div>

      {/* Sub-navegação */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {SUB_ABAS.map(s => (
          <button key={s.id} onClick={() => setSub(s.id)} style={{
            background: 'transparent', border: 'none',
            borderBottom: sub === s.id ? `2px solid ${C.amber}` : '2px solid transparent',
            color: sub === s.id ? C.amber : C.muted,
            padding: '10px 16px', fontSize: 13,
            fontWeight: sub === s.id ? 700 : 500,
            cursor: 'pointer', fontFamily: "'Syne',sans-serif",
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {sub === 'vendas'    && <Vendas    veiculos={veiculos} vendasComGarantia={vendasComGarantia} saveVendaRelacao={saveVendaRelacao} />}
      {sub === 'clientes'  && <Clientes  clientes={clientes} vendasRelacao={vendasRelacao} veiculos={veiculos} saveCliente={saveCliente} removeCliente={removeCliente} />}
      {sub === 'garantias' && <Garantias vendasComGarantia={vendasComGarantia} veiculos={veiculos} />}
    </div>
  )
}

// ─── Sub-aba: VENDAS ────────────────────────────────────────────────────────
function Vendas({ veiculos, vendasComGarantia, saveVendaRelacao }) {
  const { podeEditar } = useAuth()
  const [editando, setEditando] = useState(null)
  const [saving,   setSaving]   = useState(false)

  const vendasOrdenadas = [...vendasComGarantia].sort(
    (a, b) => new Date(b.data_venda) - new Date(a.data_venda)
  )

  const receita = vendasOrdenadas.reduce((s, v) => s + (v.valor_venda || 0), 0)
  const custos  = vendasOrdenadas.reduce((s, v) => {
    const ve = v.veiculo || veiculos.find(x => x.id === v.veiculo_id)
    return s + (ve?.valor_compra || ve?.valor_estoque || 0) + custoV(ve) + custoFixos(ve)
  }, 0)
  const lucro = receita - custos

  async function handleSalvarVenda(dados) {
    setSaving(true)
    try { await saveVendaRelacao(dados) } finally { setSaving(false) }
    setEditando(null)
  }

  return (
    <div>
      <Grid cols={4} gap={14} style={{ marginBottom: 24 }}>
        <KPI label="Total Vendas"  value={vendasOrdenadas.length} icon="🏷" color="#a78bfa" />
        <KPI label="Receita Total" value={fmtR(receita)}          icon="💵" color={C.green} />
        <KPI label="Custo Total"   value={fmtR(custos)}           icon="📉" color={C.red} />
        <KPI label="Lucro Líquido" value={fmtR(lucro)}            icon="📈" color={C.amber} />
      </Grid>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {vendasOrdenadas.map(vr => {
          const v   = vr.veiculo || veiculos.find(x => x.id === vr.veiculo_id)
          if (!v) return null
          const mnt  = custoV(v)
          const cfx  = custoFixos(v)
          const comp = v.valor_compra || v.valor_estoque || 0
          const l    = (vr.valor_venda || 0) - comp - mnt - cfx
          const corL = l >= 0 ? C.green : C.red
          const cli  = vr.cliente

          return (
            <div key={vr.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <span style={{ fontSize: 24 }}>
                    {v.tipo === 'Pick-up' ? '🛻' : v.tipo?.includes('Caminhão') ? '🚛' : '🚐'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {v.marca_nome} {v.modelo_nome}
                      <span style={{ color: C.muted, fontWeight: 400 }}> — {v.placa}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      {v.tipo} · {v.ano_modelo} · Vendido em {fmtData(vr.data_venda)}
                    </div>
                    {cli && (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        Cliente: <span style={{ color: C.text, fontWeight: 600 }}>{cli.nome}</span>
                        {cli.cpf_cnpj && ` · ${cli.cpf_cnpj}`}
                      </div>
                    )}
                    <BadgeGarantia venda={vr} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, textAlign: 'center' }}>
                    {[
                      ['Compra', fmtR(comp),          C.muted],
                      ['Venda',  fmtR(vr.valor_venda), C.green],
                      ['Lucro',  fmtR(l),              corL],
                    ].map(([lb, val, c]) => (
                      <div key={lb}>
                        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{lb}</div>
                        <div style={{ fontWeight: 800, color: c, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {podeEditar && (
                    <button
                      onClick={() => setEditando(vr)}
                      style={btnEditarStyle}
                      title="Editar venda"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {!vendasOrdenadas.length && (
          <div style={{ textAlign: 'center', color: C.muted, padding: 50 }}>
            Nenhuma venda registrada.
          </div>
        )}
      </div>

      {/* Modal editar venda */}
      {editando && (
        <ModalEditarVenda
          venda={editando}
          onSalvar={handleSalvarVenda}
          onClose={() => setEditando(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

// ─── Sub-aba: CLIENTES ──────────────────────────────────────────────────────
function Clientes({ clientes, vendasRelacao, veiculos, saveCliente, removeCliente }) {
  const { podeEditar, isAdmin } = useAuth()
  const [busca,    setBusca]    = useState('')
  const [editando, setEditando] = useState(null) // null | {} (novo) | cliente existente
  const [saving,   setSaving]   = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(null)

  const clientesFiltrados = clientes
    .filter(c => {
      if (!busca) return true
      const q = busca.toLowerCase()
      return c.nome?.toLowerCase().includes(q) ||
             c.cpf_cnpj?.toLowerCase().includes(q) ||
             c.email?.toLowerCase().includes(q)
    })
    .map(c => {
      const compras    = vendasRelacao.filter(v => v.cliente_id === c.id)
      const valorTotal = compras.reduce((s, v) => s + (v.valor_venda || 0), 0)
      return { ...c, totalCompras: compras.length, valorTotal, compras }
    })
    .sort((a, b) => b.totalCompras - a.totalCompras)

  async function handleSalvar(dados) {
    setSaving(true)
    try { await saveCliente(dados) } finally { setSaving(false) }
    setEditando(null)
  }

  async function handleRemover(id) {
    setSaving(true)
    try { await removeCliente(id) } finally { setSaving(false) }
    setConfirmRemove(null)
  }

  return (
    <div>
      <Grid cols={3} gap={14} style={{ marginBottom: 24 }}>
        <KPI label="Total Clientes"       value={clientes.length}                                              icon="👤" color="#a78bfa" />
        <KPI label="Clientes Recorrentes" value={clientesFiltrados.filter(c => c.totalCompras > 1).length}     icon="🔁" color={C.green} />
        <KPI label="Receita Acumulada"    value={fmtR(clientesFiltrados.reduce((s, c) => s + c.valorTotal, 0))} icon="💵" color={C.amber} />
      </Grid>

      {/* Cabeçalho com busca e botão novo */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar por nome, CPF/CNPJ ou e-mail..."
          style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: "'Syne',sans-serif", outline: 'none' }}
        />
        {podeEditar && (
          <button onClick={() => setEditando({})} style={{ ...btnEditarStyle, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: C.amber, border: `1px solid ${C.amber}`, borderRadius: 8, whiteSpace: 'nowrap' }}>
            + Novo cliente
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {clientesFiltrados.map(c => (
          <div key={c.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: c.tipo === 'PJ' ? '#a78bfa20' : `${C.amber}20`, color: c.tipo === 'PJ' ? '#a78bfa' : C.amber }}>
                    {c.tipo}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{c.nome}</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {c.cpf_cnpj && <span>{c.cpf_cnpj}</span>}
                  {c.telefone && <span> · {c.telefone}</span>}
                  {c.email    && <span> · {c.email}</span>}
                </div>
                {c.compras.length > 0 && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                    Veículos: {c.compras.map(co => {
                      const v = veiculos.find(x => x.id === co.veiculo_id)
                      return v ? v.placa : ''
                    }).filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>COMPRAS</div>
                    <div style={{ fontWeight: 800, color: C.text, fontSize: 18 }}>{c.totalCompras}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>TOTAL</div>
                    <div style={{ fontWeight: 800, color: C.green, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>{fmtR(c.valorTotal)}</div>
                  </div>
                </div>

                {podeEditar && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditando(c)} style={btnEditarStyle} title="Editar cliente">✏️</button>
                    {isAdmin && c.totalCompras === 0 && (
                      <button onClick={() => setConfirmRemove(c)} style={{ ...btnEditarStyle, color: C.red }} title="Excluir">🗑</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {!clientesFiltrados.length && (
          <div style={{ textAlign: 'center', color: C.muted, padding: 50 }}>
            {busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
          </div>
        )}
      </div>

      {/* Modal editar/novo cliente */}
      {editando !== null && (
        <ModalCliente
          cliente={editando}
          onSalvar={handleSalvar}
          onClose={() => setEditando(null)}
          saving={saving}
        />
      )}

      {/* Confirmar remoção */}
      {confirmRemove && (
        <Modal title="Excluir Cliente" onClose={() => setConfirmRemove(null)}>
          <p style={{ color: C.muted, fontSize: 14 }}>
            Confirma a exclusão de <strong style={{ color: C.text }}>{confirmRemove.nome}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setConfirmRemove(null)}>Cancelar</Btn>
            <Btn variant="danger"    style={{ flex: 1 }} onClick={() => handleRemover(confirmRemove.id)} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Sub-aba: GARANTIAS ─────────────────────────────────────────────────────
function Garantias({ vendasComGarantia, veiculos }) {
  const resumo  = resumoGarantias(vendasComGarantia)
  const [filtro, setFiltro] = useState('todas')

  const filtradas = vendasComGarantia.filter(v => {
    if (filtro === 'todas')    return true
    if (filtro === 'ativas')   return v.status === STATUS_GARANTIA.ATIVA
    if (filtro === 'vencendo') return v.status === STATUS_GARANTIA.VENCENDO
    if (filtro === 'vencidas') return v.status === STATUS_GARANTIA.VENCIDA
    return true
  })

  return (
    <div>
      <Grid cols={4} gap={14} style={{ marginBottom: 24 }}>
        <KPI label="Total Garantias" value={resumo.total}    icon="🛡" color="#a78bfa" />
        <KPI label="Ativas"          value={resumo.ativas}   icon="✓"  color={C.green} />
        <KPI label="Vencendo"        value={resumo.vencendo} icon="⚠️" color={C.amber} />
        <KPI label="Vencidas"        value={resumo.vencidas} icon="✗"  color={C.red} />
      </Grid>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'todas',    label: 'Todas',    cor: C.muted  },
          { id: 'ativas',   label: 'Ativas',   cor: C.green  },
          { id: 'vencendo', label: 'Vencendo', cor: C.amber  },
          { id: 'vencidas', label: 'Vencidas', cor: C.red    },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            background: filtro === f.id ? `${f.cor}25` : 'transparent',
            border: `1px solid ${filtro === f.id ? f.cor : C.border}`,
            color: filtro === f.id ? f.cor : C.muted,
            borderRadius: 6, padding: '6px 14px', fontSize: 12,
            fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: 'pointer',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtradas.map(vr => {
          const v   = vr.veiculo || veiculos.find(x => x.id === vr.veiculo_id)
          if (!v) return null
          const cli = vr.cliente
          const cor = corDoStatus(vr.status)

          return (
            <div key={vr.id} style={{ ...cardStyle, borderLeft: `4px solid ${cor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>
                    {v.tipo === 'Pick-up' ? '🛻' : v.tipo?.includes('Caminhão') ? '🚛' : '🚐'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {v.marca_nome} {v.modelo_nome}
                      <span style={{ color: C.muted, fontWeight: 400 }}> — {v.placa}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      Vendido em {fmtData(vr.data_venda)}
                      {cli && <> · {cli.nome}</>}
                    </div>
                    <BadgeGarantia venda={vr} grande />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>GARANTIA ATÉ</div>
                  <div style={{ fontWeight: 800, fontSize: 14, fontFamily: "'JetBrains Mono',monospace" }}>
                    {vr.garantiaFim ? new Date(vr.garantiaFim).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {!filtradas.length && (
          <div style={{ textAlign: 'center', color: C.muted, padding: 50 }}>
            Nenhuma garantia nesta categoria.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal: Editar Venda ────────────────────────────────────────────────────
function ModalEditarVenda({ venda, onSalvar, onClose, saving }) {
  const [f, setF] = useState({
    id:             venda.id,
    veiculo_id:     venda.veiculo_id,
    cliente_id:     venda.cliente_id,
    data_venda:     venda.data_venda     || '',
    valor_venda:    venda.valor_venda    || 0,
    garantia_dias:  venda.garantia_dias  || 90,
    garantia_inicio:venda.garantia_inicio|| venda.data_venda || '',
    observacoes:    venda.observacoes    || '',
  })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const v = venda.veiculo
  const titulo = v ? `${v.marca_nome || ''} ${v.modelo_nome || ''} — ${v.placa || ''}` : 'Editar Venda'

  return (
    <Modal title={`Editar Venda — ${titulo}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <DateInput  label="Data da Venda"      value={f.data_venda}   onChange={v => set('data_venda', v)}   required />
        <MoedaInput label="Valor de Venda (R$)" value={f.valor_venda}  onChange={v => set('valor_venda', v)}  highlight={C.green} required />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>PRAZO DE GARANTIA (dias)</label>
            <input
              type="number" min={0} max={365}
              value={f.garantia_dias}
              onChange={e => set('garantia_dias', parseInt(e.target.value) || 90)}
              style={inputStyle}
            />
          </div>
          <DateInput label="Início da Garantia" value={f.garantia_inicio} onChange={v => set('garantia_inicio', v)} />
        </div>

        <div>
          <label style={labelStyle}>OBSERVAÇÕES</label>
          <textarea
            value={(f.observacoes || '').toUpperCase()}
            onChange={e => set('observacoes', e.target.value.toUpperCase())}
            rows={2} placeholder="NOTAS ADICIONAIS..."
            style={{ ...inputStyle, resize: 'vertical', textTransform: 'uppercase' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Btn variant="secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</Btn>
        <Btn style={{ flex: 1 }} onClick={() => onSalvar(f)} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Btn>
      </div>
    </Modal>
  )
}

// ─── Modal: Novo/Editar Cliente ─────────────────────────────────────────────
function ModalCliente({ cliente, onSalvar, onClose, saving }) {
  const isNovo = !cliente?.id
  const [f, setF] = useState({
    id:          cliente?.id          || undefined,
    nome:        cliente?.nome        || '',
    tipo:        cliente?.tipo        || 'PF',
    cpf_cnpj:    cliente?.cpf_cnpj    || '',
    telefone:    cliente?.telefone    || '',
    email:       cliente?.email       || '',
    endereco:    cliente?.endereco    || '',
    observacoes: cliente?.observacoes || '',
  })
  const set    = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setUp  = (k, v) => set(k, (v || '').toUpperCase())

  return (
    <Modal title={isNovo ? 'Novo Cliente' : 'Editar Cliente'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'end' }}>
          <UpperInput label="Nome / Razão Social" required value={f.nome} onChange={v => setUp('nome', v)} placeholder="NOME COMPLETO OU RAZÃO SOCIAL" />
          <SelectInput label="Tipo" value={f.tipo} onChange={v => set('tipo', v)} options={[{value:'PF',label:'PF'},{value:'PJ',label:'PJ'}]} style={{ width: 90 }} />
        </div>

        <DocInput label="CPF / CNPJ" value={f.cpf_cnpj} onChange={v => set('cpf_cnpj', v)} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <UpperInput label="Telefone" value={f.telefone} onChange={v => setUp('telefone', v)} placeholder="(11) 99999-9999" />
          <div>
            <label style={labelStyle}>E-MAIL</label>
            <input
              type="email" value={f.email || ''}
              onChange={e => set('email', e.target.value.toLowerCase())}
              placeholder="email@exemplo.com.br"
              style={inputStyle}
            />
          </div>
        </div>

        <UpperInput label="Endereço" value={f.endereco} onChange={v => setUp('endereco', v)} placeholder="RUA, NÚMERO - CIDADE" />

        <div>
          <label style={labelStyle}>OBSERVAÇÕES</label>
          <textarea
            value={(f.observacoes || '').toUpperCase()}
            onChange={e => set('observacoes', e.target.value.toUpperCase())}
            rows={2} placeholder="NOTAS SOBRE O CLIENTE..."
            style={{ ...inputStyle, resize: 'vertical', textTransform: 'uppercase' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Btn variant="secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</Btn>
        <Btn style={{ flex: 1 }} onClick={() => onSalvar(f)} disabled={saving || !f.nome}>
          {saving ? 'Salvando...' : isNovo ? 'Cadastrar' : 'Salvar Alterações'}
        </Btn>
      </div>
    </Modal>
  )
}

// ─── Helpers visuais ────────────────────────────────────────────────────────
function BadgeGarantia({ venda, grande }) {
  const cor   = corDoStatus(venda.status)
  const texto = formatarStatusGarantia(venda)
  if (!texto) return null
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
      fontSize: grande ? 12 : 11, fontWeight: 700,
      padding: grande ? '4px 10px' : '2px 8px',
      borderRadius: 20, background: `${cor}18`, color: cor,
    }}>
      🛡 {texto}
    </div>
  )
}

function corDoStatus(status) {
  switch (status) {
    case STATUS_GARANTIA.ATIVA:    return C.green
    case STATUS_GARANTIA.VENCENDO: return C.amber
    case STATUS_GARANTIA.VENCIDA:  return C.red
    default: return C.muted
  }
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const cardStyle = {
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 12, padding: 18, borderLeft: '4px solid #a78bfa',
}

const btnEditarStyle = {
  background: 'none', border: `1px solid ${C.border}`,
  borderRadius: 6, padding: '6px 10px', fontSize: 14,
  cursor: 'pointer', color: C.muted,
  fontFamily: "'Syne',sans-serif",
}

const labelStyle = {
  fontSize: 11, color: C.muted, fontWeight: 700,
  letterSpacing: 0.5, display: 'block', marginBottom: 5,
}

const inputStyle = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, padding: '10px 14px', fontSize: 14, width: '100%',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
