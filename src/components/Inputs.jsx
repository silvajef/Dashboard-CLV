/**
 * Dashboard CLV — Componentes de input especializados
 * - MoedaInput: separação automática de casas decimais
 * - UpperInput: UPPER CASE automático
 * - SelectFipe: dropdown estilizado para FIPE
 */
import { useState } from 'react'
import { C } from '../lib/constants'
import { formatMoedaInput, parseMoeda, toUpper } from '../lib/format'

const baseStyle = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

/* ── Label wrapper ────────────────────────────────────────────── */
function FieldWrap({ label, required, children, style }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, ...style }}>
      {label && (
        <label style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:0.5 }}>
          {label}{required && <span style={{ color:C.red }}> *</span>}
        </label>
      )}
      {children}
    </div>
  )
}

/* ── MoedaInput ───────────────────────────────────────────────── */
// value = número (ex: 85000)
// onChange = recebe número
export function MoedaInput({ label, value, onChange, required, style, placeholder, readOnly, highlight }) {
  const [display, setDisplay] = useState(
    value ? formatMoedaInput(String(Math.round(value * 100))) : ''
  )

  const handleChange = (e) => {
    const raw = e.target.value
    const formatted = formatMoedaInput(raw)
    setDisplay(formatted)
    onChange(parseMoeda(formatted))
  }

  // Sincroniza quando value muda externamente (ex: FIPE preenche)
  const numericDisplay = value ? formatMoedaInput(String(Math.round(value * 100))) : ''
  const currentDisplay = display !== '' ? display : numericDisplay

  return (
    <FieldWrap label={label} required={required} style={style}>
      <div style={{ position:'relative' }}>
        <span style={{
          position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
          fontSize:13, color:C.muted, fontWeight:600, pointerEvents:'none'
        }}>R$</span>
        <input
          type="text"
          inputMode="numeric"
          value={currentDisplay}
          onChange={handleChange}
          placeholder={placeholder || '0,00'}
          readOnly={readOnly}
          style={{
            ...baseStyle,
            paddingLeft: 34,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 15,
            color: highlight || C.amber,
            border: `1px solid ${(highlight || C.amber) + '66'}`,
            ...(readOnly ? { opacity:0.6, cursor:'not-allowed' } : {}),
          }}
        />
      </div>
    </FieldWrap>
  )
}

/* ── UpperInput ───────────────────────────────────────────────── */
// Campos de texto que ficam em UPPER CASE automaticamente
export function UpperInput({ label, value, onChange, required, placeholder, style, readOnly, type='text' }) {
  return (
    <FieldWrap label={label} required={required} style={style}>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(toUpper(e.target.value))}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          ...baseStyle,
          textTransform: 'uppercase',
          ...(readOnly ? { opacity:0.6, cursor:'not-allowed' } : {}),
        }}
      />
    </FieldWrap>
  )
}

/* ── SelectFipe ───────────────────────────────────────────────── */
export function SelectFipe({ label, value, onChange, options, placeholder, loading, disabled, required }) {
  return (
    <FieldWrap label={label} required={required}>
      <div style={{ position:'relative' }}>
        <select
          value={value || ''}
          onChange={e => {
            const codigo = e.target.value
            // Passa também o nome junto com o código
            const nome = e.target.options[e.target.selectedIndex]?.text || ''
            onChange(codigo, nome)
          }}
          disabled={disabled || loading}
          style={{
            ...baseStyle,
            border: `1px solid ${!disabled && options.length ? C.amber + '88' : C.border}`,
            color: value ? C.text : C.muted,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            paddingRight: 32,
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        >
          <option value=''>
            {loading ? '⟳ carregando...' : !options.length && !loading ? '— selecione o tipo —' : placeholder}
          </option>
          {options.map(o => (
            <option key={o.codigo} value={o.codigo}>{o.nome}</option>
          ))}
        </select>
        <span style={{
          position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
          color: C.muted, fontSize:10, pointerEvents:'none'
        }}>▼</span>
      </div>
    </FieldWrap>
  )
}

/* ── SelectInput ──────────────────────────────────────────────── */
// Select genérico com as mesmas opções que Input recebe
export function SelectInput({ label, value, onChange, options, required, style, disabled }) {
  return (
    <FieldWrap label={label} required={required} style={style}>
      <div style={{ position:'relative' }}>
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{
            ...baseStyle,
            cursor: disabled ? 'not-allowed' : 'pointer',
            paddingRight: 32,
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        >
          <option value=''>Selecione...</option>
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
        <span style={{
          position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
          color:C.muted, fontSize:10, pointerEvents:'none'
        }}>▼</span>
      </div>
    </FieldWrap>
  )
}
