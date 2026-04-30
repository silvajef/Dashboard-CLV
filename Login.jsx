import { useState } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg:      '#0f1117',
  surface: '#1a1d27',
  border:  '#2a2d3a',
  accent:  '#3b82f6',
  accentH: '#2563eb',
  text:    '#e2e8f0',
  muted:   '#64748b',
  danger:  '#ef4444',
  success: '#22c55e',
}

export default function Login() {
  const [email,     setEmail]     = useState('')
  const [senha,     setSenha]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState('')
  const [modo,      setModo]      = useState('login') // 'login' | 'recuperar'
  const [enviado,   setEnviado]   = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro(traduzirErro(error.message))
    setLoading(false)
  }

  async function handleRecuperar(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) setErro(traduzirErro(error.message))
    else setEnviado(true)
    setLoading(false)
  }

  function traduzirErro(msg) {
    if (msg.includes('Invalid login'))      return 'E-mail ou senha incorretos.'
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
    if (msg.includes('rate limit'))          return 'Muitas tentativas. Aguarde alguns minutos.'
    return msg
  }

  return (
    <div style={s.wrapper}>
      <div style={s.grid} />

      <div style={s.card}>
        {/* Cabeçalho */}
        <div style={s.header}>
          <div style={s.logoBox}>
            <span style={{ fontSize: 28 }}>🚛</span>
          </div>
          <h1 style={s.titulo}>Dashboard CLV</h1>
          <p style={s.sub}>Gestão de Estoque de Veículos de Carga</p>
        </div>

        {/* Form Login */}
        {modo === 'login' && (
          <form onSubmit={handleLogin} style={s.form}>
            <Field label="E-mail">
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" autoComplete="email" required />
            </Field>
            <Field label="Senha">
              <Input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required />
            </Field>

            {erro && <Erro>{erro}</Erro>}

            <Btn loading={loading}>Entrar</Btn>

            <button type="button" onClick={() => { setModo('recuperar'); setErro('') }} style={s.link}>
              Esqueci minha senha
            </button>
          </form>
        )}

        {/* Form Recuperar */}
        {modo === 'recuperar' && !enviado && (
          <form onSubmit={handleRecuperar} style={s.form}>
            <p style={s.info}>Informe seu e-mail para receber o link de redefinição de senha.</p>
            <Field label="E-mail">
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required />
            </Field>
            {erro && <Erro>{erro}</Erro>}
            <Btn loading={loading}>Enviar link</Btn>
            <button type="button" onClick={() => { setModo('login'); setErro('') }} style={s.link}>
              ← Voltar
            </button>
          </form>
        )}

        {/* Confirmação */}
        {modo === 'recuperar' && enviado && (
          <div style={s.form}>
            <div style={s.successBox}>
              <span style={{ fontSize: 32 }}>✉️</span>
              <p style={{ color: C.success, fontWeight: 700, margin: '8px 0 4px', fontSize: 14 }}>
                E-mail enviado!
              </p>
              <p style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>
                Verifique sua caixa de entrada e clique no link para redefinir.
              </p>
            </div>
            <button type="button"
              onClick={() => { setModo('login'); setEnviado(false) }} style={s.link}>
              ← Voltar ao login
            </button>
          </div>
        )}

        <p style={s.rodape}>v3.6 · Uso interno · Restrito</p>
      </div>
    </div>
  )
}

// ─── Sub-componentes locais ───────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted,
        textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({ ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={{
        background: C.bg,
        border: `1px solid ${focused ? C.accent : C.border}`,
        borderRadius: 8, padding: '10px 14px',
        color: C.text, fontSize: 14,
        fontFamily: "'Syne', sans-serif", outline: 'none',
        transition: 'border-color 0.15s',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Btn({ loading, children }) {
  return (
    <button type="submit" disabled={loading} style={{
      background: `linear-gradient(135deg, ${C.accent}, ${C.accentH})`,
      border: 'none', borderRadius: 8, padding: '12px',
      color: '#fff', fontSize: 14, fontWeight: 700,
      fontFamily: "'Syne', sans-serif", cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.6 : 1, letterSpacing: '0.03em',
      boxShadow: `0 4px 16px ${C.accent}40`,
    }}>
      {loading ? 'Aguarde...' : children}
    </button>
  )
}

function Erro({ children }) {
  return (
    <p style={{
      margin: 0, padding: '10px 14px',
      background: `${C.danger}12`, border: `1px solid ${C.danger}40`,
      borderRadius: 8, color: C.danger, fontSize: 13, fontWeight: 500,
    }}>
      {children}
    </p>
  )
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const s = {
  wrapper: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: C.bg, padding: '24px 16px',
    position: 'relative', overflow: 'hidden',
    fontFamily: "'Syne', sans-serif",
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `linear-gradient(${C.border}50 1px, transparent 1px),
                      linear-gradient(90deg, ${C.border}50 1px, transparent 1px)`,
    backgroundSize: '40px 40px',
    maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%', maxWidth: 400,
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 16, padding: '40px 36px 32px',
    boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px ${C.border}`,
    position: 'relative',
  },
  header: { textAlign: 'center', marginBottom: 32 },
  logoBox: {
    width: 60, height: 60,
    background: `linear-gradient(135deg, ${C.accent}, ${C.accentH})`,
    borderRadius: 16, display: 'flex', alignItems: 'center',
    justifyContent: 'center', margin: '0 auto 16px',
    boxShadow: `0 8px 32px ${C.accent}50`,
  },
  titulo: { margin: 0, fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.3px' },
  sub: { margin: '4px 0 0', fontSize: 12, color: C.muted },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  link: {
    background: 'none', border: 'none', color: C.muted,
    fontSize: 13, cursor: 'pointer', fontFamily: "'Syne', sans-serif",
    textAlign: 'center', padding: '4px', textDecoration: 'underline',
  },
  info: { margin: 0, color: C.muted, fontSize: 13, lineHeight: 1.6, textAlign: 'center' },
  successBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '20px', background: `${C.success}10`,
    border: `1px solid ${C.success}30`, borderRadius: 10,
  },
  rodape: { textAlign: 'center', fontSize: 11, color: C.border, marginTop: 24, marginBottom: 0 },
}
