/**
 * Inputs especializados — Dashboard CLV
 */
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
export function MoedaInput({ label, value, onChange, required, style, placeholder, highlight }) {
  // Converte número → string formatada para exibir
  const toDisplay = (num) => {
    if (!num && num !== 0) return ''
    const cents = Math.round(Number(num) * 100)
    if (isNaN(cents) || cents === 0) return ''
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
  }

  const handleChange = (e) => {
    // Remove tudo que não é dígito
    const digits = e.target.value.replace(/\D/g, '')
    if (!digits) { onChange(0); return }
    const num = parseInt(digits, 10) / 100
    onChange(num)
  }

  const color = highlight || C.amber

  return (
    <FieldWrap label={label} required={required} style={style}>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:13, color:C.muted, fontWeight:600, pointerEvents:'none' }}>R$</span>
        <input
          type="text"
          inputMode="numeric"
          value={toDisplay(value)}
          onChange={handleChange}
          placeholder={placeholder || '0,00'}
          style={{ ...baseStyle, paddingLeft:34, fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:15, color, border:`1px solid ${color}66` }}
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

/* ── SelectFipe ───────────────────────────────────────────────── */
// onChange recebe (codigo, nome) — nome vem do texto do <option>
export function SelectFipe({ label, value, onChange, options, placeholder, loading, disabled, required }) {
  const handleChange = (e) => {
    const codigo = e.target.value
    // Pega o texto visível do option selecionado — método mais confiável
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
