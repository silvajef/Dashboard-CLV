/**
 * Inputs especializados — Dashboard CLV
 */
import { useState } from 'react'
import { C } from '../lib/constants'
import { parseMoeda, toUpper } from '../lib/format'

const baseStyle = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, padding: '10px 14px', fontSize: 14, width: '100%',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

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
export function MoedaInput({ label, value, onChange, required, style, placeholder, highlight, disabled }) {
  const toDisplay = (num) => {
    if (!num && num !== 0) return ''
    const cents = Math.round(Number(num) * 100)
    if (isNaN(cents) || cents === 0) return ''
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
  }

  const handleChange = (e) => {
    if (disabled) return
    const digits = e.target.value.replace(/\D/g, '')
    if (!digits) { onChange(0); return }
    const num = parseInt(digits, 10) / 100
    onChange(num)
  }

  const color = disabled ? C.muted : (highlight || C.amber)

  return (
    <FieldWrap label={label} required={required} style={style}>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:13, color:C.muted, fontWeight:600, pointerEvents:'none' }}>R$</span>
        <input
          type="text"
          inputMode="numeric"
          value={toDisplay(value)}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder || '0,00'}
          style={{ ...baseStyle, paddingLeft:34, fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:15, color, border:`1px solid ${color}66`, opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
        />
      </div>
    </FieldWrap>
  )
}

/* ── UpperInput ───────────────────────────────────────────────── */
export function UpperInput({ label, value, onChange, required, placeholder, style, readOnly, type='text' }) {
  return (
    <FieldWrap label={label} required={required} style={style}>
      <input
        type={type} value={value||''}
        onChange={e=>onChange((e.target.value||'').toUpperCase())}
        placeholder={placeholder} readOnly={readOnly}
        style={{ ...baseStyle, textTransform:'uppercase', ...(readOnly?{opacity:0.6,cursor:'not-allowed'}:{}) }}
      />
    </FieldWrap>
  )
}

/* ── DocInput — CPF/CNPJ com máscara automática ───────────────── */
/**
 * Detecta CPF (11 dígitos) ou CNPJ (14 dígitos) e aplica máscara:
 *   CPF:  000.000.000-00
 *   CNPJ: 00.000.000/0000-00
 * onChange retorna o valor formatado (com máscara).
 */
export function DocInput({ label, value, onChange, required, style, placeholder }) {
  function aplicarMascara(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 14)
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    } else {
      // CNPJ: 00.000.000/0000-00
      return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    }
  }

  const [focused, setFocused] = useState(false)
  const digitos = (value || '').replace(/\D/g, '').length
  const tipo = digitos > 11 ? 'CNPJ' : digitos === 11 ? 'CPF' : ''

  return (
    <FieldWrap label={label} required={required} style={style}>
      <div style={{ position:'relative' }}>
        <input
          type="text"
          inputMode="numeric"
          value={value || ''}
          onChange={e => onChange(aplicarMascara(e.target.value))}
          placeholder={placeholder || '000.000.000-00 ou 00.000.000/0000-00'}
          style={{
            ...baseStyle,
            border: `1px solid ${focused ? C.amber : C.border}`,
            fontFamily: "'JetBrains Mono',monospace",
            paddingRight: tipo ? 52 : 14,
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {tipo && (
          <span style={{
            position:'absolute', right:10, top:'50%',
            transform:'translateY(-50%)',
            fontSize:9, fontWeight:800, color:C.amber,
            background:`${C.amber}18`, padding:'2px 6px',
            borderRadius:4, pointerEvents:'none',
          }}>
            {tipo}
          </span>
        )}
      </div>
    </FieldWrap>
  )
}

/* ── DateInput — DD/MM/AAAA com conversão automática ─────────── */
/**
 * Exibe a data no formato DD/MM/AAAA para o usuário.
 * Internamente converte para YYYY-MM-DD antes de chamar onChange.
 *
 * Props:
 *   value    — string no formato YYYY-MM-DD (formato do banco)
 *   onChange — recebe string YYYY-MM-DD
 */
export function DateInput({ label, value, onChange, required, style }) {
  // Converte YYYY-MM-DD → DD/MM/AAAA para exibição
  function isoParaDisplay(iso) {
    if (!iso) return ''
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso // já é display
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    return `${d}/${m}/${y}`
  }

  // Aplica máscara DD/MM/AAAA conforme o usuário digita
  function aplicarMascaraData(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    return digits
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
  }

  // Converte DD/MM/AAAA → YYYY-MM-DD quando completo
  function displayParaIso(display) {
    const digits = display.replace(/\D/g, '')
    if (digits.length < 8) return null // incompleto
    const d = digits.slice(0, 2)
    const m = digits.slice(2, 4)
    const y = digits.slice(4, 8)
    return `${y}-${m}-${d}`
  }

  const [inputVal, setInputVal] = useState(isoParaDisplay(value))
  const [focused,  setFocused]  = useState(false)

  // Sincroniza quando value muda externamente
  if (!focused && value && isoParaDisplay(value) !== inputVal) {
    setInputVal(isoParaDisplay(value))
  }

  function handleChange(e) {
    const masked = aplicarMascaraData(e.target.value)
    setInputVal(masked)
    const iso = displayParaIso(masked)
    if (iso) onChange(iso)
  }

  const completo = inputVal.replace(/\D/g, '').length === 8
  const cor = completo ? C.green : focused ? C.amber : C.border

  return (
    <FieldWrap label={label} required={required} style={style}>
      <input
        type="text"
        inputMode="numeric"
        value={inputVal}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          // Se o campo ficou incompleto ao sair, mantém o valor atual
        }}
        placeholder="DD/MM/AAAA"
        maxLength={10}
        style={{
          ...baseStyle,
          border: `1px solid ${cor}`,
          fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: '0.05em',
        }}
      />
    </FieldWrap>
  )
}

/* ── SelectFipe ───────────────────────────────────────────────── */
export function SelectFipe({ label, value, onChange, options, placeholder, loading, disabled, required }) {
  const handleChange = (e) => {
    const codigo = e.target.value
    const idx  = e.target.selectedIndex
    const nome = idx > 0 ? e.target.options[idx].text : ''
    console.log('[SelectFipe] onChange:', { label, codigo, nome })
    onChange(codigo, nome)
  }

  return (
    <FieldWrap label={label} required={required}>
      <div style={{ position:'relative' }}>
        <select
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || loading}
          style={{
            ...baseStyle,
            border:`1px solid ${!disabled && options.length ? C.amber+'88' : C.border}`,
            color: value ? C.text : C.muted,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            paddingRight:32,
            appearance:'none', WebkitAppearance:'none',
          }}
        >
          <option value=''>
            {loading ? '⟳ carregando...' : !options.length ? '— aguarde o tipo —' : placeholder}
          </option>
          {options.map(o => (
            <option key={o.codigo} value={o.codigo}>{o.nome}</option>
          ))}
        </select>
        <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:C.muted, fontSize:10, pointerEvents:'none' }}>▼</span>
      </div>
    </FieldWrap>
  )
}

/* ── SelectInput ──────────────────────────────────────────────── */
export function SelectInput({ label, value, onChange, options, required, style, disabled }) {
  return (
    <FieldWrap label={label} required={required} style={style}>
      <div style={{ position:'relative' }}>
        <select
          value={value||''} onChange={e=>onChange(e.target.value)} disabled={disabled}
          style={{ ...baseStyle, cursor:disabled?'not-allowed':'pointer', paddingRight:32, appearance:'none', WebkitAppearance:'none' }}
        >
          <option value=''>Selecione...</option>
          {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
        </select>
        <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:C.muted, fontSize:10, pointerEvents:'none' }}>▼</span>
      </div>
    </FieldWrap>
  )
}
