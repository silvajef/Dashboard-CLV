/**
 * Login.jsx — "Cockpit Industrial" redesign
 * Split layout: left = speedometer SVG + brand identity
 *               right = minimal line-input form
 */
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { APP_NAME, APP_VERSION } from '../lib/constants'
import { useBreakpoint } from '../lib/responsive'
import Icon from '../components/Icon'
import logoImg from '../assets/logo.png'

// Design tokens for login — intentionally darker/more dramatic than the app palette
const T = {
  bg:       '#05060a',
  surface:  '#090b11',
  border:   '#1a1f2e',
  borderHi: '#252d42',
  text:     '#e8edf8',
  muted:    '#8b95b0',
  faint:    '#404d66',
  amber:    '#f59e0b',
  amberHi:  '#fbbf24',
  green:    '#22d3a0',
  red:      '#f4485e',
}

export default function Login() {
  const [email,       setEmail]       = useState('')
  const [senha,       setSenha]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [erro,        setErro]        = useState('')
  const [modo,        setModo]        = useState('login')
  const [enviado,     setEnviado]     = useState(false)
  const [exibirSenha, setExibirSenha] = useState(false)
  const { isMobile } = useBreakpoint()

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
    <div style={{ minHeight: '100vh', display: 'flex', background: T.bg, color: T.text, fontFamily: "'Outfit', sans-serif", overflow: 'hidden' }}>
      <style>{CSS}</style>

      {/* ── Left Panel: brand + speedometer ── */}
      {!isMobile && (
        <div style={s.leftPanel}>
          {/* Speedometer SVG — decorative backdrop */}
          <div style={s.gaugeBackdrop} aria-hidden="true">
            <SpeedometerSVG />
          </div>

          {/* Diagonal scan line */}
          <div style={s.scanLine} />

          {/* Brand block */}
          <div style={s.brandBlock}>
            <img src={logoImg} alt={APP_NAME} style={s.logoImg} />
            <h1 style={s.brandTitle}>{APP_NAME}</h1>
            <p style={s.brandSub}>Gestão · Estoque · Veículos de Carga</p>

            {/* Amber accent underline */}
            <div style={s.brandAccent} />
          </div>

          {/* Ghost stat teasers — blurred, inaccessible hint */}
          <div style={s.ghostRow}>
            {['ESTOQUE', 'EM VENDA', 'VENDIDOS'].map(l => (
              <div key={l} style={s.ghostCard}>
                <div style={s.ghostLabel}>{l}</div>
                <div style={s.ghostVal}>●●●</div>
              </div>
            ))}
          </div>

          <div style={s.vTag}>v{APP_VERSION} · uso interno</div>
        </div>
      )}

      {/* ── Right Panel: form ── */}
      <div style={{ ...s.rightPanel, padding: isMobile ? '44px 28px' : '64px 60px' }}>
        <div style={s.formWrap} className="clv-slide-in">

          {/* Mobile: show logo in form area */}
          {isMobile && (
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <img src={logoImg} alt={APP_NAME} style={{ maxWidth: 160, height: 'auto', margin: '0 auto 16px', display: 'block' }} />
              <div style={{ ...s.brandTitle, fontSize: 28 }}>{APP_NAME}</div>
            </div>
          )}

          {/* ── LOGIN ── */}
          {modo === 'login' && (
            <>
              <div style={s.formHead}>
                <div style={s.formTitle}>Acesso ao Sistema</div>
                <div style={s.formSub}>área restrita · credenciais obrigatórias</div>
              </div>
              <form onSubmit={handleLogin} style={s.form}>
                <FieldWrap label="E-MAIL">
                  <LineInput
                    type="email" value={email} autoComplete="email" required
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                  />
                </FieldWrap>
                <FieldWrap label="SENHA">
                  <div style={{ position: 'relative' }}>
                    <LineInput
                      type={exibirSenha ? 'text' : 'password'} value={senha}
                      autoComplete="current-password" required
                      onChange={e => setSenha(e.target.value)}
                      placeholder="••••••••"
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setExibirSenha(v => !v)} style={s.eyeBtn} tabIndex={-1}>
                      <Icon name={exibirSenha ? 'eyeOff' : 'eye'} size={15} style={{ color: T.faint }} />
                    </button>
                  </div>
                </FieldWrap>
                {erro && <ErroMsg key={erro} text={erro} />}
                <AmberBtn loading={loading}>Entrar no Sistema</AmberBtn>
                <TextBtn onClick={() => { setModo('recuperar'); setErro('') }}>Esqueci minha senha</TextBtn>
              </form>
            </>
          )}

          {/* ── RECUPERAR ── */}
          {modo === 'recuperar' && !enviado && (
            <>
              <div style={s.formHead}>
                <div style={s.formTitle}>Recuperar Acesso</div>
                <div style={s.formSub}>enviaremos um link de redefinição</div>
              </div>
              <form onSubmit={handleRecuperar} style={s.form}>
                <FieldWrap label="E-MAIL">
                  <LineInput
                    type="email" value={email} required autoComplete="email"
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                  />
                </FieldWrap>
                {erro && <ErroMsg key={erro} text={erro} />}
                <AmberBtn loading={loading}>Enviar Link</AmberBtn>
                <TextBtn onClick={() => { setModo('login'); setErro('') }}>← Voltar ao login</TextBtn>
              </form>
            </>
          )}

          {/* ── ENVIADO ── */}
          {modo === 'recuperar' && enviado && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16, color: T.green }}>✓</div>
              <div style={{ ...s.formTitle, color: T.green, fontSize: 26, marginBottom: 12 }}>E-mail Enviado</div>
              <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.7, marginBottom: 32 }}>
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
              <TextBtn onClick={() => { setModo('login'); setEnviado(false) }}>← Voltar ao login</TextBtn>
            </div>
          )}

          {/* Footer */}
          <div style={s.footer}>
            {isMobile
              ? <span>v{APP_VERSION} · uso interno · restrito</span>
              : <>
                  <span>Dashboard CLV v{APP_VERSION}</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.borderHi }} />
                  <span>Uso Interno · Restrito</span>
                </>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── SpeedometerSVG ──────────────────────────────────────────── */
function SpeedometerSVG() {
  const cx = 200, cy = 200
  const r  = 152
  const circ    = 2 * Math.PI * r                  // full circumference ≈ 955
  const arcLen  = (270 / 360) * circ               // 270° arc ≈ 716
  const arcGap  = circ - arcLen                    // ≈ 239
  const fillLen = 0.74 * arcLen                    // 74% filled ≈ 530
  const startDeg = 135                             // arc starts at 135° (7 o'clock)

  // 60 tick marks over the 270° arc
  const ticks = Array.from({ length: 61 }, (_, i) => {
    const deg = startDeg + (i / 60) * 270
    const rad = deg * (Math.PI / 180)
    const major = i % 10 === 0
    const medium = i % 5 === 0 && !major
    const r1 = 174
    const r2 = major ? 155 : medium ? 163 : 170
    return {
      x1: cx + r1 * Math.cos(rad), y1: cy + r1 * Math.sin(rad),
      x2: cx + r2 * Math.cos(rad), y2: cy + r2 * Math.sin(rad),
      major, medium,
    }
  })

  // Needle at 74% of arc
  const needleDeg = startDeg + 0.74 * 270
  const needleRad = needleDeg * (Math.PI / 180)
  const nx = cx + 128 * Math.cos(needleRad)
  const ny = cy + 128 * Math.sin(needleRad)
  // Needle tail (opposite direction, shorter)
  const tailX = cx - 22 * Math.cos(needleRad)
  const tailY = cy - 22 * Math.sin(needleRad)

  return (
    <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
      {/* Outermost ghost ring */}
      <circle cx={cx} cy={cy} r="192" fill="none" stroke={`${T.border}50`} strokeWidth="1" />

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.major ? T.borderHi : `${T.border}80`}
          strokeWidth={t.major ? 2 : t.medium ? 1.5 : 0.8}
        />
      ))}

      {/* Track arc (full 270°) */}
      <circle cx={cx} cy={cy} r={r}
        fill="none" stroke={T.border} strokeWidth="2"
        strokeDasharray={`${arcLen} ${arcGap}`}
        transform={`rotate(${startDeg}, ${cx}, ${cy})`}
      />

      {/* Amber fill arc */}
      <circle cx={cx} cy={cy} r={r}
        fill="none" stroke={T.amber} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${fillLen} ${circ - fillLen}`}
        transform={`rotate(${startDeg}, ${cx}, ${cy})`}
        className="clv-arc-glow"
        style={{ filter: `drop-shadow(0 0 10px ${T.amber}90)` }}
      />

      {/* Inner decorative rings */}
      <circle cx={cx} cy={cy} r="108" fill="none" stroke={`${T.border}60`} strokeWidth="1" />
      <circle cx={cx} cy={cy} r="66"  fill="none" stroke={`${T.amber}18`}  strokeWidth="1" />

      {/* Needle */}
      <line x1={tailX} y1={tailY} x2={nx} y2={ny}
        stroke={T.amber} strokeWidth="2.5" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${T.amber})` }}
      />

      {/* Hub */}
      <circle cx={cx} cy={cy} r="11" fill={T.surface} stroke={T.amber}  strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r="4.5" fill={T.amber} />
    </svg>
  )
}

/* ── Sub-components ──────────────────────────────────────────── */

function FieldWrap({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: T.faint, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function LineInput({ style, ...props }) {
  return (
    <input
      {...props}
      className="clv-input"
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${T.borderHi}`,
        padding: '11px 0',
        color: T.text,
        fontSize: 15,
        fontFamily: "'Outfit', sans-serif",
        outline: 'none',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  )
}

function AmberBtn({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="clv-btn"
      style={{
        width: '100%',
        background: T.amber,
        border: 'none',
        borderRadius: 2,
        padding: '13px 20px',
        color: '#000',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.65 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
        transition: 'all 0.2s',
      }}
    >
      {loading ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="3" strokeLinecap="round" style={{ animation: 'clv-spin 0.7s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
          Autenticando...
        </>
      ) : children}
    </button>
  )
}

function TextBtn({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="clv-textbtn"
      style={{
        background: 'none', border: 'none',
        color: T.faint,
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.06em',
        cursor: 'pointer',
        textAlign: 'center',
        padding: '4px 0',
        textDecoration: 'underline',
        textDecorationColor: `${T.faint}50`,
        textUnderlineOffset: 3,
        transition: 'color 0.2s',
      }}
    >
      {children}
    </button>
  )
}

function ErroMsg({ text }) {
  return (
    <div className="clv-shake" style={{
      padding: '10px 14px',
      background: `${T.red}10`,
      borderLeft: `3px solid ${T.red}`,
      borderRadius: '0 2px 2px 0',
      color: T.red,
      fontSize: 12,
      fontFamily: "'Outfit', sans-serif",
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <Icon name="alert" size={14} style={{ flexShrink: 0 }} />
      {text}
    </div>
  )
}

/* ── CSS ─────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=JetBrains+Mono:wght@400;700&family=Outfit:wght@400;500;700&display=swap');

  @keyframes clv-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes clv-slide-in {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes clv-arc-pulse {
    0%, 100% { opacity: 0.6; }
    50%      { opacity: 1;   }
  }
  @keyframes clv-shake {
    0%, 100% { transform: translateX(0); }
    20%      { transform: translateX(-5px); }
    60%      { transform: translateX(5px); }
  }
  @keyframes clv-scan {
    0%   { transform: translateY(-100%); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 0.3; }
    100% { transform: translateY(100vh); opacity: 0; }
  }

  .clv-slide-in {
    animation: clv-slide-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both;
  }
  .clv-arc-glow {
    animation: clv-arc-pulse 3.5s ease-in-out infinite;
  }
  .clv-input::placeholder { color: ${T.faint}; font-size: 14px; }
  .clv-input:focus {
    border-bottom-color: ${T.amber} !important;
    box-shadow: 0 2px 0 ${T.amber}35;
  }
  .clv-btn:hover:not(:disabled) {
    background: ${T.amberHi} !important;
    box-shadow: 0 4px 28px ${T.amber}55;
    transform: translateY(-1px);
  }
  .clv-btn:active:not(:disabled) { transform: none; }
  .clv-textbtn:hover { color: ${T.muted} !important; }
  .clv-shake { animation: clv-shake 0.3s ease-in-out; }
`

/* ── Styles ──────────────────────────────────────────────────── */
const s = {
  leftPanel: {
    flex: '0 0 54%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 52px',
    background: `linear-gradient(155deg, ${T.bg} 0%, ${T.surface} 100%)`,
    borderRight: `1px solid ${T.border}`,
    overflow: 'hidden',
  },
  gaugeBackdrop: {
    position: 'absolute',
    width: '88%',
    height: '88%',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: 0.25,
    pointerEvents: 'none',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: `linear-gradient(90deg, transparent 0%, ${T.amber}40 50%, transparent 100%)`,
    animation: 'clv-scan 8s ease-in-out infinite',
    pointerEvents: 'none',
    zIndex: 1,
  },
  brandBlock: {
    position: 'relative',
    zIndex: 2,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoImg: {
    maxWidth: 200,
    height: 'auto',
    marginBottom: 22,
    display: 'block',
    filter: `drop-shadow(0 0 28px ${T.amber}40)`,
  },
  brandTitle: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 46,
    fontWeight: 900,
    color: T.text,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    lineHeight: 1,
    marginBottom: 10,
  },
  brandSub: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: T.muted,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  brandAccent: {
    width: 40,
    height: 2,
    background: T.amber,
    borderRadius: 2,
    boxShadow: `0 0 8px ${T.amber}80`,
  },
  ghostRow: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    gap: 14,
    marginTop: 44,
    userSelect: 'none',
    pointerEvents: 'none',
  },
  ghostCard: {
    textAlign: 'center',
    padding: '10px 16px',
    background: `${T.border}28`,
    border: `1px solid ${T.border}55`,
    borderRadius: 4,
    filter: 'blur(3px)',
    opacity: 0.4,
  },
  ghostLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    color: T.faint,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  ghostVal: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: T.amber,
    letterSpacing: '0.24em',
  },
  vTag: {
    position: 'absolute',
    bottom: 20,
    right: 22,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: T.faint,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formWrap: {
    width: '100%',
    maxWidth: 360,
  },
  formHead: {
    marginBottom: 40,
  },
  formTitle: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 36,
    fontWeight: 800,
    color: T.text,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    lineHeight: 1.1,
    marginBottom: 8,
  },
  formSub: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: T.faint,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '100%',
    width: 40,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    outline: 'none',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 48,
    paddingTop: 20,
    borderTop: `1px solid ${T.border}`,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: T.faint,
    letterSpacing: '0.08em',
  },
}
