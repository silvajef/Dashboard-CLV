import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const C = {
  bg:      '#0f1117',
  surface: '#1a1d27',
  border:  '#2a2d3a',
  accent:  '#3b82f6',
  text:    '#e2e8f0',
  muted:   '#64748b',
  danger:  '#ef4444',
  success: '#22c55e',
  warn:    '#f59e0b',
}

const ROLE_INFO = {
  admin:        { label: 'Admin',        cor: '#ef4444' },
  operador:     { label: 'Operador',     cor: '#3b82f6' },
  visualizador: { label: 'Visualizador', cor: '#64748b' },
}

const PERMISSOES = {
  admin: [
    { ok: true,  texto: 'Ver todos os dados' },
    { ok: true,  texto: 'Criar e editar veículos, serviços, prestadores' },
    { ok: true,  texto: 'Registrar e editar vendas' },
    { ok: true,  texto: 'Excluir qualquer registro' },
    { ok: true,  texto: 'Alterar metas do sistema' },
    { ok: true,  texto: 'Criar e gerenciar usuários' },
  ],
  operador: [
    { ok: true,  texto: 'Ver todos os dados' },
    { ok: true,  texto: 'Criar e editar veículos, serviços, prestadores' },
    { ok: true,  texto: 'Registrar e editar vendas' },
    { ok: false, texto: 'Excluir registros' },
    { ok: false, texto: 'Alterar metas do sistema' },
    { ok: false, texto: 'Criar ou gerenciar usuários' },
  ],
  visualizador: [
    { ok: true,  texto: 'Ver todos os dados' },
    { ok: false, texto: 'Criar, editar ou excluir qualquer dado' },
    { ok: false, texto: 'Registrar vendas' },
    { ok: false, texto: 'Alterar metas do sistema' },
    { ok: false, texto: 'Criar ou gerenciar usuários' },
  ],
}

export default function Usuarios() {
  const { isAdmin, session } = useAuth()

  if (!isAdmin) {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: "'Syne', sans-serif" }}>
        <span style={{ fontSize: 40 }}>🔒</span>
        <p style={{ color: C.muted, marginTop: 12 }}>Acesso restrito ao administrador.</p>
      </div>
    )
  }

  const [usuarios, setUsuarios] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [toast,    setToast]    = useState('')

  useEffect(() => { carregarUsuarios() }, [])

  async function carregarUsuarios() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles').select('*').order('criado_em', { ascending: true })
    if (!error) setUsuarios(data || [])
    setLoading(false)
  }

  async function criarUsuario({ email, senha, nome, role }) {
    const { data, error } = await supabase.auth.signUp({
      email, password: senha,
      options: { data: { nome, role } },
    })
    if (error) return { error: error.message }
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, nome, role, ativo: true })
    }
    await carregarUsuarios()
    return { ok: true }
  }

  async function atualizarPerfil(id, campos) {
    const { error } = await supabase.from('profiles').update(campos).eq('id', id)
    if (!error) await carregarUsuarios()
    return { error: error?.message }
  }

  async function toggleAtivo(u) {
    await atualizarPerfil(u.id, { ativo: !u.ativo })
    exibirToast(u.ativo ? '⏸ Usuário desativado' : '▶️ Usuário reativado')
  }

  function exibirToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Usuários</h2>
          <p style={s.sub}>{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('novo')} style={s.btnNovo}>+ Novo usuário</button>
      </div>

      {toast && <div style={s.toast}>{toast}</div>}

      {loading ? (
        <p style={{ color: C.muted, padding: 24, fontFamily: "'Syne', sans-serif" }}>Carregando...</p>
      ) : (
        <div style={s.tabela}>
          <div style={s.tHead}>
            <span style={{ flex: 2 }}>Nome</span>
            <span style={{ flex: 1 }}>Role</span>
            <span style={{ flex: 1 }}>Status</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Ações</span>
          </div>
          {usuarios.map(u => {
            const ehVoce = u.id === session?.user?.id
            const info   = ROLE_INFO[u.role] || ROLE_INFO.visualizador
            return (
              <div key={u.id} style={{ ...s.tRow, opacity: u.ativo ? 1 : 0.45 }}>
                <div style={{ flex: 2 }}>
                  <p style={s.nomeUsuario}>
                    {u.nome || '(sem nome)'}
                    {ehVoce && <span style={s.badgeVoce}>você</span>}
                  </p>
                  <p style={s.idTexto}>{u.id.slice(0, 8)}…</p>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ ...s.badge, background: `${info.cor}18`, color: info.cor }}>
                    {info.label}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ ...s.badge, background: u.ativo ? `${C.success}15` : `${C.muted}15`, color: u.ativo ? C.success : C.muted }}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button onClick={() => setModal({ editar: u })} style={s.btnAcao} title="Editar">✏️</button>
                  {!ehVoce && (
                    <button onClick={() => toggleAtivo(u)} style={{ ...s.btnAcao, color: u.ativo ? C.warn : C.success }} title={u.ativo ? 'Desativar' : 'Reativar'}>
                      {u.ativo ? '⏸' : '▶️'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p style={s.nota}>💡 Para ver os e-mails acesse Supabase → Authentication → Users.</p>

      {modal === 'novo' && (
        <ModalNovo
          onClose={() => setModal(null)}
          onSalvar={async dados => {
            const res = await criarUsuario(dados)
            if (res.ok) { setModal(null); exibirToast('✅ Usuário criado!') }
            return res
          }}
        />
      )}

      {modal?.editar && (
        <ModalEditar
          usuario={modal.editar}
          ehVoce={modal.editar.id === session?.user?.id}
          onClose={() => setModal(null)}
          onSalvar={async campos => {
            const res = await atualizarPerfil(modal.editar.id, campos)
            if (!res.error) { setModal(null); exibirToast('✅ Perfil atualizado!') }
            return res
          }}
        />
      )}
    </div>
  )
}

function ModalNovo({ onClose, onSalvar }) {
  const [form,   setForm]   = useState({ email: '', senha: '', nome: '', role: 'operador' })
  const [erro,   setErro]   = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.senha.length < 6) { setErro('Senha mínima de 6 caracteres.'); return }
    setSaving(true)
    const res = await onSalvar(form)
    if (res?.error) setErro(res.error)
    setSaving(false)
  }

  return (
    <Overlay onClose={onClose}>
      <h3 style={s.modalTitulo}>Novo Usuário</h3>
      <form onSubmit={handleSubmit} style={s.modalForm}>
        <MField label="Nome"><MInput value={form.nome} onChange={v => setForm(p => ({...p, nome: v}))} placeholder="Nome do funcionário" required /></MField>
        <MField label="E-mail"><MInput type="email" value={form.email} onChange={v => setForm(p => ({...p, email: v}))} placeholder="email@empresa.com" required /></MField>
        <MField label="Senha (mínimo 6 caracteres)"><MInput type="password" value={form.senha} onChange={v => setForm(p => ({...p, senha: v}))} placeholder="••••••••" required /></MField>
        <MField label="Permissão">
          <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} style={{ ...s.mInput, cursor: 'pointer' }}>
            <option value="admin">Admin — acesso total</option>
            <option value="operador">Operador — cria e edita, sem excluir</option>
            <option value="visualizador">Visualizador — somente leitura</option>
          </select>
        </MField>
        <PermCard role={form.role} />
        {erro && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={s.modalBtns}>
          <button type="button" onClick={onClose} style={s.btnCancelar}>Cancelar</button>
          <button type="submit" disabled={saving} style={{ ...s.btnSalvar, flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? 'Criando...' : 'Criar usuário'}</button>
        </div>
      </form>
    </Overlay>
  )
}

function ModalEditar({ usuario, ehVoce, onClose, onSalvar }) {
  const [form,   setForm]   = useState({ nome: usuario.nome || '', role: usuario.role })
  const [erro,   setErro]   = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const res = await onSalvar(form)
    if (res?.error) setErro(res.error)
    setSaving(false)
  }

  return (
    <Overlay onClose={onClose}>
      <h3 style={s.modalTitulo}>Editar Usuário</h3>
      <form onSubmit={handleSubmit} style={s.modalForm}>
        <MField label="Nome"><MInput value={form.nome} onChange={v => setForm(p => ({...p, nome: v}))} placeholder="Nome do funcionário" required /></MField>
        <MField label="Permissão">
          <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} disabled={ehVoce} style={{ ...s.mInput, cursor: ehVoce ? 'not-allowed' : 'pointer', opacity: ehVoce ? 0.5 : 1 }}>
            <option value="admin">Admin — acesso total</option>
            <option value="operador">Operador — cria e edita, sem excluir</option>
            <option value="visualizador">Visualizador — somente leitura</option>
          </select>
          {ehVoce && <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>Você não pode alterar seu próprio role.</p>}
        </MField>
        <PermCard role={form.role} />
        {erro && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={s.modalBtns}>
          <button type="button" onClick={onClose} style={s.btnCancelar}>Cancelar</button>
          <button type="submit" disabled={saving} style={{ ...s.btnSalvar, flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </Overlay>
  )
}

function PermCard({ role }) {
  const lista = PERMISSOES[role] || []
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
      <p style={{ fontSize: 11, color: C.muted, margin: '0 0 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Permissões</p>
      {lista.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
          <span style={{ color: p.ok ? C.success : C.danger, fontSize: 12, marginTop: 1, flexShrink: 0 }}>{p.ok ? '✓' : '✗'}</span>
          <span style={{ fontSize: 12, color: p.ok ? C.text : C.muted, lineHeight: 1.4 }}>{p.texto}</span>
        </div>
      ))}
    </div>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, fontFamily: "'Syne', sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 28px 24px', width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function MField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      {children}
    </div>
  )
}

function MInput({ onChange, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input {...props} style={{ ...s.mInput, borderColor: focused ? C.accent : C.border }}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
  )
}

const s = {
  page:        { padding: '24px 20px', fontFamily: "'Syne', sans-serif", maxWidth: 820 },
  header:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' },
  titulo:      { margin: 0, fontSize: 20, fontWeight: 800, color: C.text },
  sub:         { margin: '4px 0 0', fontSize: 13, color: C.muted },
  btnNovo:     { background: C.accent, border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: 'pointer' },
  toast:       { background: `${C.success}18`, border: `1px solid ${C.success}35`, color: C.success, borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16 },
  tabela:      { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' },
  tHead:       { display: 'flex', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' },
  tRow:        { display: 'flex', gap: 12, padding: '12px 16px', alignItems: 'center', borderBottom: `1px solid ${C.border}` },
  nomeUsuario: { margin: 0, fontSize: 14, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  idTexto:     { margin: '2px 0 0', fontSize: 10, color: C.border, fontFamily: "'JetBrains Mono', monospace" },
  badgeVoce:   { fontSize: 10, color: C.accent, fontWeight: 700, background: `${C.accent}20`, padding: '1px 6px', borderRadius: 10 },
  badge:       { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 },
  btnAcao:     { background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 14, cursor: 'pointer', color: C.muted, fontFamily: "'Syne', sans-serif" },
  nota:        { fontSize: 12, color: C.muted, margin: '16px 0 0', lineHeight: 1.5 },
  modalTitulo: { margin: '0 0 20px', fontSize: 17, fontWeight: 800, color: C.text },
  modalForm:   { display: 'flex', flexDirection: 'column', gap: 16 },
  mInput:      { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 14, fontFamily: "'Syne', sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' },
  modalBtns:   { display: 'flex', gap: 10, marginTop: 4 },
  btnCancelar: { background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 16px', color: C.muted, fontSize: 13, fontWeight: 600, fontFamily: "'Syne', sans-serif", cursor: 'pointer' },
  btnSalvar:   { background: C.accent, border: 'none', borderRadius: 8, padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: 'pointer' },
}
