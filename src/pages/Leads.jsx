import { useState } from 'react'
import { useLeads } from '../hooks/useLeads'
import { useAuth } from '../hooks/useAuth'
import { STATUS_LEAD_CFG, TIPOS_ATIVIDADE } from '../lib/plataformas/types'
import { PLATAFORMAS } from '../lib/plataformas/index'
import { C, fmtData } from '../lib/constants'

/* ── Estilos base ─────────────────────────────────────────────────────── */
const s = {
  page:      { padding: '24px 20px', maxWidth: 1300, margin: '0 auto' },
  titulo:    { fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 20px' },
  secao:     { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
               textTransform: 'uppercase', margin: '0 0 10px' },
  btn:       { border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12,
               fontWeight: 700, padding: '7px 14px', fontFamily: "'Syne', sans-serif" },
  btnPrimary:{ background: C.blue, color: '#fff' },
  btnGhost:  { background: C.card, color: C.muted, border: `1px solid ${C.border}` },
  btnDanger: { background: C.redDim, color: C.red },
  input:     { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
               color: C.text, fontSize: 13, padding: '8px 12px', width: '100%',
               fontFamily: "'Syne', sans-serif", boxSizing: 'border-box' },
  overlay:   { position: 'fixed', inset: 0, background: '#0008', zIndex: 1000,
               display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:     { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
               padding: 28, width: 480, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' },
  erro:      { background: C.redDim, color: C.red, borderRadius: 8, padding: '10px 14px',
               fontSize: 12, marginBottom: 12 },
  label:     { fontSize: 11, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 4 },
}

const COLUNAS_PIPELINE = ['novo','contato','visita','proposta','ganho','perdido']

const PLATAFORMA_EMOJI = Object.fromEntries(PLATAFORMAS.map(p => [p.slug, p.emoji]))

/* ── Cartão de lead no kanban ─────────────────────────────────────────── */
function LeadCard({ lead, onClick }) {
  const veiculo = lead.veiculo
  const veiculoLabel = veiculo
    ? `${veiculo.marca_nome || ''} ${veiculo.modelo_nome || veiculo.modelo || ''} ${veiculo.ano_modelo || ''}`.trim()
    : null

  // plataforma_origem é o campo antigo; provider é escrito pelo webhook OLX
  const plataforma = lead.plataforma_origem || lead.provider

  function handleWhatsApp(e) {
    e.stopPropagation()
    const numero = lead.telefone.replace(/\D/g, '')
    window.open(`https://wa.me/55${numero}`, '_blank')
  }

  return (
    <div
      onClick={onClick}
      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
               padding: '12px 14px', cursor: 'pointer', marginBottom: 8 }}
    >
      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: C.text }}>{lead.nome}</p>

      {lead.telefone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 2px' }}>
          <span style={{ fontSize: 11, color: C.muted }}>📞 {lead.telefone}</span>
          <button
            onClick={handleWhatsApp}
            title='Abrir WhatsApp'
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                     fontSize: 13, lineHeight: 1 }}>
            💬
          </button>
        </div>
      )}
      {veiculoLabel && (
        <p style={{ margin: '0 0 2px', fontSize: 11, color: C.muted }}>🚛 {veiculoLabel}</p>
      )}
      {lead.mensagem && (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          "{lead.mensagem}"
        </p>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
        {plataforma && (
          <span style={{ fontSize: 14 }}>
            {PLATAFORMA_EMOJI[plataforma] || '📋'}
          </span>
        )}
        <span style={{ fontSize: 10, color: C.faint }}>{fmtData(lead.created_at)}</span>
      </div>
    </div>
  )
}

/* ── Coluna do kanban ────────────────────────────────────────────────── */
function ColunaKanban({ statusKey, leads, onLeadClick, onDrop }) {
  const cfg = STATUS_LEAD_CFG[statusKey]

  function handleDragOver(e) { e.preventDefault() }
  function handleDrop(e) {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    if (leadId) onDrop(leadId, statusKey)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ flex: '0 0 200px', minWidth: 200 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%',
                       background: cfg.color, flexShrink: 0, display: 'block' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{cfg.label}</span>
        <span style={{ fontSize: 11, color: C.faint, marginLeft: 'auto' }}>{leads.length}</span>
      </div>

      {leads.map(lead => (
        <div
          key={lead.id}
          draggable
          onDragStart={e => e.dataTransfer.setData('leadId', lead.id)}
        >
          <LeadCard lead={lead} onClick={() => onLeadClick(lead)} />
        </div>
      ))}
    </div>
  )
}

/* ── Modal: detalhe do lead + atividades ──────────────────────────────── */
function ModalLead({ lead, onSalvar, onExcluir, onFechar, registrarAtividade, buscarAtividades, userId }) {
  const [form,       setForm]       = useState({ ...lead })
  const [atividades, setAtividades] = useState([])
  const [novaAtiv,   setNovaAtiv]   = useState({ tipo: 'nota', descricao: '' })
  const [salvando,   setSalvando]   = useState(false)
  const [erro,       setErro]       = useState('')

  useState(() => {
    if (lead.id) buscarAtividades(lead.id).then(setAtividades)
  }, [lead.id])

  function field(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSalvar() {
    if (!form.nome?.trim()) return setErro('Nome obrigatório.')
    setErro(''); setSalvando(true)
    try { await onSalvar(form); onFechar() }
    catch (e) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  async function handleAddAtividade() {
    if (!novaAtiv.descricao.trim()) return
    await registrarAtividade(lead.id, novaAtiv.tipo, novaAtiv.descricao, userId)
    const atualizadas = await buscarAtividades(lead.id)
    setAtividades(atualizadas)
    setNovaAtiv({ tipo: 'nota', descricao: '' })
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={s.modal}>
        <h3 style={{ margin: '0 0 16px', color: C.text, fontSize: 16 }}>
          {lead.id ? 'Editar Lead' : 'Novo Lead'}
        </h3>

        {erro && <div style={s.erro}>{erro}</div>}

        <label style={s.label}>NOME *</label>
        <input style={{ ...s.input, marginBottom: 10 }} value={form.nome || ''}
          onChange={e => field('nome', e.target.value)} placeholder='Nome do interessado' />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={s.label}>TELEFONE</label>
            <input style={s.input} value={form.telefone || ''}
              onChange={e => field('telefone', e.target.value)} placeholder='(00) 00000-0000' />
          </div>
          <div>
            <label style={s.label}>E-MAIL</label>
            <input style={s.input} value={form.email || ''}
              onChange={e => field('email', e.target.value)} placeholder='email@exemplo.com' />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={s.label}>STATUS</label>
            <select style={s.input} value={form.status || 'novo'}
              onChange={e => field('status', e.target.value)}>
              {COLUNAS_PIPELINE.map(s => (
                <option key={s} value={s}>{STATUS_LEAD_CFG[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>ORIGEM</label>
            <select style={s.input} value={form.plataforma_origem || 'manual'}
              onChange={e => field('plataforma_origem', e.target.value)}>
              <option value='manual'>Manual</option>
              {PLATAFORMAS.map(p => (
                <option key={p.slug} value={p.slug}>{p.emoji} {p.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {form.mensagem && (
          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>MENSAGEM DO INTERESSADO</label>
            <div style={{ ...s.input, background: C.surface, color: C.muted,
                          minHeight: 56, whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {form.mensagem}
            </div>
          </div>
        )}

        <label style={s.label}>OBSERVAÇÕES</label>
        <textarea style={{ ...s.input, height: 64, resize: 'vertical', marginBottom: 16 }}
          value={form.obs || ''} onChange={e => field('obs', e.target.value)}
          placeholder='Informações adicionais...' />

        {/* Atividades — só exibidas para leads já salvos */}
        {lead.id && (
          <>
            <p style={{ ...s.secao, margin: '0 0 8px' }}>Histórico de Atividades</p>
            <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 10 }}>
              {atividades.length === 0 && (
                <p style={{ fontSize: 11, color: C.faint }}>Nenhuma atividade registrada.</p>
              )}
              {atividades.map(a => (
                <div key={a.id} style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: 10,
                                         marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: C.faint }}>
                    {a.tipo.toUpperCase()} · {fmtData(a.created_at)}
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: C.text }}>{a.descricao}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <select style={{ ...s.input, flex: '0 0 110px' }}
                value={novaAtiv.tipo} onChange={e => setNovaAtiv(n => ({ ...n, tipo: e.target.value }))}>
                {TIPOS_ATIVIDADE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input style={{ ...s.input, flex: 1 }}
                value={novaAtiv.descricao}
                onChange={e => setNovaAtiv(n => ({ ...n, descricao: e.target.value }))}
                placeholder='Descreva a atividade...'
                onKeyDown={e => e.key === 'Enter' && handleAddAtividade()}
              />
              <button style={{ ...s.btn, ...s.btnGhost, flexShrink: 0 }}
                onClick={handleAddAtividade}>+</button>
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {lead.id && (
              <button style={{ ...s.btn, ...s.btnDanger }}
                onClick={() => { onExcluir(lead.id); onFechar() }}>
                Excluir
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...s.btn, ...s.btnGhost }} onClick={onFechar}>Cancelar</button>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Página principal ─────────────────────────────────────────────────── */
export default function Leads({ veiculos }) {
  const { session } = useAuth()
  const userId      = session?.user?.id

  const {
    leads, loading, error,
    saveLead, removeLead, moverLead,
    registrarAtividade, buscarAtividades,
  } = useLeads()

  const [leadAberto,    setLeadAberto]    = useState(null)
  const [filtroStatus,  setFiltroStatus]  = useState('todos')
  const [busca,         setBusca]         = useState('')

  if (loading) return (
    <div style={{ ...s.page, color: C.muted, fontSize: 13 }}>Carregando leads...</div>
  )

  const leadsFiltrados = leads.filter(l => {
    const matchStatus = filtroStatus === 'todos' || l.status === filtroStatus
    const matchBusca  = !busca || l.nome.toLowerCase().includes(busca.toLowerCase()) ||
                        (l.telefone || '').includes(busca)
    return matchStatus && matchBusca
  })

  const leadsPorColuna = COLUNAS_PIPELINE.reduce((acc, col) => {
    acc[col] = leadsFiltrados.filter(l => l.status === col)
    return acc
  }, {})

  const totalAtivos = leads.filter(l => !['ganho','perdido'].includes(l.status)).length

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ ...s.titulo, margin: 0 }}>CRM Leads</h2>
          <span style={{ fontSize: 12, color: C.muted }}>{totalAtivos} lead{totalAtivos !== 1 ? 's' : ''} ativos</span>
        </div>
        <button style={{ ...s.btn, ...s.btnPrimary }}
          onClick={() => setLeadAberto({ nome: '', status: 'novo', plataforma_origem: 'manual' })}>
          + Novo Lead
        </button>
      </div>

      {error && <div style={{ ...s.erro, marginBottom: 16 }}>{error}</div>}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          style={{ ...s.input, width: 200 }}
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder='Buscar por nome ou telefone...'
        />
        <select style={{ ...s.input, width: 160 }}
          value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value='todos'>Todos os status</option>
          {COLUNAS_PIPELINE.map(col => (
            <option key={col} value={col}>{STATUS_LEAD_CFG[col].label}</option>
          ))}
        </select>
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
        {COLUNAS_PIPELINE.map(col => (
          <ColunaKanban
            key={col}
            statusKey={col}
            leads={leadsPorColuna[col] || []}
            onLeadClick={setLeadAberto}
            onDrop={moverLead}
          />
        ))}
      </div>

      {leadAberto && (
        <ModalLead
          lead={leadAberto}
          onSalvar={saveLead}
          onExcluir={removeLead}
          onFechar={() => setLeadAberto(null)}
          registrarAtividade={registrarAtividade}
          buscarAtividades={buscarAtividades}
          userId={userId}
        />
      )}
    </div>
  )
}
