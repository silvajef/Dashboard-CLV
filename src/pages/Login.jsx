import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, APP_NAME, APP_VERSION } from '../lib/constants'
import Icon from '../components/Icon'

export default function Login() {
  const [email,       setEmail]       = useState('')
  const [senha,       setSenha]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [erro,        setErro]        = useState('')
  const [modo,        setModo]        = useState('login')
  const [enviado,     setEnviado]     = useState(false)
  const [exibirSenha, setExibirSenha] = useState(false)

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
    if (msg.includes('Invalid login'))       return 'E-mail ou senha incorretos.'
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
    if (msg.includes('rate limit'))          return 'Muitas tentativas. Aguarde alguns minutos.'
    return msg
  }

  return (
    <div style={s.wrapper}>
      {/* Luzes Neon Ambientais / Glow Orbs */}
      <div style={s.ambientBg}>
        <div style={s.glowBlue} />
        <div style={s.glowAmber} />
        <div style={s.glowPurple} />
      </div>

      {/* Grade de fundo sutil */}
      <div style={s.grid} />

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.15); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate(0px, 0px) scale(1.05); }
          33% { transform: translate(-40px, 40px) scale(0.9); }
          66% { transform: translate(30px, -40px) scale(1.15); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.45; }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-card {
          animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-error {
          animation: shake 0.2s ease-in-out 2;
        }
        .interactive-input {
          transition: border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease;
        }
        .interactive-input:focus {
          border-color: ${C.blue} !important;
          box-shadow: 0 0 0 3px ${C.blue}20, 0 0 16px ${C.blue}30 !important;
          background: rgba(8, 9, 13, 0.8) !important;
        }
        .btn-submit {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px ${C.blue}40, 0 0 0 1px ${C.blue}60 !important;
          opacity: 0.95;
        }
        .btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .link-interactive {
          transition: color 0.2s ease, opacity 0.2s ease;
        }
        .link-interactive:hover {
          color: ${C.blue} !important;
          opacity: 1 !important;
        }
      `}</style>

      <div style={s.card} className="animate-card">
        {/* Detalhe luminoso no topo do card */}
        <div style={s.cardGlowHeader} />

        <div style={s.header}>
          <div style={s.logoBox}>
            <Icon name="truck" size={32} style={{ color: '#fff' }} />
          </div>
          <h1 style={s.titulo}>{APP_NAME}</h1>
          <p style={s.sub}>Gestão de Estoque de Veículos de Carga</p>
        </div>

        {modo === 'login' && (
          <form onSubmit={handleLogin} style={s.form}>
            <Field label="E-mail">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Senha">
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Input
                  type={exibirSenha ? "text" : "password"}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ width: '100%', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setExibirSenha(!exibirSenha)}
                  style={s.eyeButton}
                  title={exibirSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  <Icon
                    name={exibirSenha ? "eyeOff" : "eye"}
                    size={18}
                    style={{ transition: 'color 0.2s', color: senha ? C.muted : C.faint }}
                  />
                </button>
              </div>
            </Field>

            {erro && <Erro>{erro}</Erro>}

            <Btn loading={loading}>Entrar</Btn>

            <button
              type="button"
              onClick={() => { setModo('recuperar'); setErro('') }}
              style={s.link}
              className="link-interactive"
            >
              Esqueci minha senha
            </button>
          </form>
        )}

        {modo === 'recuperar' && !enviado && (
          <form onSubmit={handleRecuperar} style={s.form}>
            <p style={s.info}>Informe seu e-mail para receber o link de redefinição.</p>
            <Field label="E-mail">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </Field>

            {erro && <Erro>{erro}</Erro>}

            <Btn loading={loading}>Enviar link</Btn>

            <button
              type="button"
              onClick={() => { setModo('login'); setErro('') }}
              style={s.link}
              className="link-interactive"
            >
              ← Voltar ao login
            </button>
          </form>
        )}

        {modo === 'recuperar' && enviado && (
          <div style={s.form}>
            <div style={s.successBox}>
              <div style={s.successIconBox}>
                <Icon name="check" size={24} style={{ color: C.green }} />
              </div>
              <p style={{ color: C.green, fontWeight: 700, margin: '12px 0 6px', fontSize: 15, fontFamily: "'Syne', sans-serif" }}>
                E-mail enviado!
              </p>
              <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
                Verifique sua caixa de entrada e clique no link para redefinir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setModo('login'); setEnviado(false) }}
              style={s.link}
              className="link-interactive"
            >
              ← Voltar ao login
            </button>
          </div>
        )}

        <div style={s.rodape}>
          <span style={{ color: C.faint }}>v{APP_VERSION}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.borderHi }} />
          <span>Uso Interno</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.borderHi }} />
          <span>Restrito</span>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: "'Outfit', sans-serif"
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({ style, ...props }) {
  return (
    <input
      {...props}
      className="interactive-input"
      style={{
        background: 'rgba(8, 9, 13, 0.5)',
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '12px 14px',
        color: C.text,
        fontSize: 14,
        fontFamily: "'Outfit', sans-serif",
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  )
}

function Btn({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-submit"
      style={{
        background: `linear-gradient(135deg, ${C.blue}, #1d4ed8)`,
        border: 'none',
        borderRadius: 10,
        padding: '14px',
        color: '#fff',
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "'Syne', sans-serif",
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        letterSpacing: '0.03em',
        boxShadow: `0 4px 20px ${C.blue}25`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {loading ? (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="spinner" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Aguarde...
        </>
      ) : (
        children
      )}
    </button>
  )
}

function Erro({ children }) {
  return (
    <div
      className="animate-error"
      style={{
        margin: 0,
        padding: '12px 16px',
        background: `${C.red}10`,
        border: `1px solid ${C.red}30`,
        borderRadius: 10,
        color: C.red,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "'Outfit', sans-serif",
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      <Icon name="alert" size={16} style={{ color: C.red, marginTop: 1, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  )
}

const s = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: C.bg,
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Outfit', sans-serif",
  },
  ambientBg: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    zIndex: 0,
    pointerEvents: 'none',
  },
  glowBlue: {
    position: 'absolute',
    width: '40vw',
    height: '40vw',
    minWidth: 350,
    minHeight: 350,
    top: '-10%',
    left: '-10%',
    background: `radial-gradient(circle, ${C.blue}15 0%, transparent 70%)`,
    borderRadius: '50%',
    animation: 'float-slow 22s ease-in-out infinite',
  },
  glowAmber: {
    position: 'absolute',
    width: '35vw',
    height: '35vw',
    minWidth: 300,
    minHeight: 300,
    bottom: '-10%',
    right: '-5%',
    background: `radial-gradient(circle, ${C.amber}10 0%, transparent 75%)`,
    borderRadius: '50%',
    animation: 'float-reverse 26s ease-in-out infinite',
  },
  glowPurple: {
    position: 'absolute',
    width: '30vw',
    height: '30vw',
    minWidth: 250,
    minHeight: 250,
    top: '30%',
    right: '25%',
    background: `radial-gradient(circle, ${C.purple}08 0%, transparent 70%)`,
    borderRadius: '50%',
    animation: 'pulse-glow 8s ease-in-out infinite',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(${C.border}30 1px, transparent 1px),
                      linear-gradient(90deg, ${C.border}30 1px, transparent 1px)`,
    backgroundSize: '48px 48px',
    maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)',
    WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(14, 16, 24, 0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: '48px 36px 36px',
    boxShadow: '0 24px 64px -16px rgba(0, 0, 0, 0.7)',
    position: 'relative',
    zIndex: 10,
    overflow: 'hidden',
  },
  cardGlowHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${C.blue}80, ${C.blue}, ${C.blue}80, transparent)`,
  },
  header: {
    textAlign: 'center',
    marginBottom: 36,
  },
  logoBox: {
    width: 64,
    height: 64,
    background: `linear-gradient(135deg, ${C.blue}, #1d4ed8)`,
    borderRadius: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: `0 8px 32px ${C.blue}30, inset 0 2px 8px rgba(255,255,255,0.2)`,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  titulo: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: C.text,
    letterSpacing: '-0.5px',
    fontFamily: "'Syne', sans-serif",
  },
  sub: {
    margin: '8px 0 0',
    fontSize: 13,
    color: C.muted,
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  eyeButton: {
    position: 'absolute',
    right: '4px',
    height: '100%',
    width: '40px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  link: {
    background: 'none',
    border: 'none',
    color: C.muted,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    textAlign: 'center',
    padding: '4px',
    textDecoration: 'none',
    opacity: 0.8,
  },
  info: {
    margin: 0,
    color: C.muted,
    fontSize: 13,
    lineHeight: 1.6,
    textAlign: 'center',
  },
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    background: `${C.green}08`,
    border: `1px solid ${C.green}20`,
    borderRadius: 14,
  },
  successIconBox: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: `${C.green}15`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${C.green}30`,
  },
  rodape: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontSize: 11,
    color: C.faint,
    marginTop: 36,
    marginBottom: 0,
    fontFamily: "'JetBrains Mono', monospace",
  },
}
