/**
 * FipeSearch — componente de busca FIPE em cascata
 * Exibido dentro do ModalVeiculo
 */
import { useFipe } from '../hooks/useFipe'
import { C, fmtR } from '../lib/constants'

const sel = (value, onChange, options, placeholder, disabled) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    disabled={disabled || !options.length}
    style={{
      background: C.surface, border: `1px solid ${disabled ? C.border : C.amber + '88'}`,
      borderRadius: 8, color: options.length ? C.text : C.muted,
      padding: '10px 12px', fontSize: 13, width: '100%',
      outline: 'none', fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <option value=''>{options.length ? placeholder : '— carregando —'}</option>
    {options.map(o => (
      <option key={o.codigo} value={o.codigo}>{o.nome}</option>
    ))}
  </select>
)

export default function FipeSearch({ tipoVeiculo, onSelectPreco }) {
  const fipe = useFipe(tipoVeiculo)

  const handleMarca  = v => { if (v) fipe.selecionarMarca(v) }
  const handleModelo = v => { if (v) fipe.selecionarModelo(v) }
  const handleAno    = v => { if (v) fipe.selecionarAno(v) }

  const handleUsar = () => {
    if (fipe.resultado) onSelectPreco(fipe.resultado)
  }

  return (
    <div style={{ background: C.cardHi, border: `1px solid ${C.amber}33`, borderRadius: 10, padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: C.amber }}>Consulta Tabela FIPE</span>
          <span style={{ fontSize: 10, color: C.muted, background: C.border, padding: '2px 6px', borderRadius: 10 }}>
            {fipe.tipo === 'caminhoes' ? 'Caminhões' : 'Carros/Vans'}
          </span>
        </div>
        {fipe.loading && (
          <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> buscando...
          </span>
        )}
      </div>

      {/* Seletores em cascata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>MARCA</label>
          {sel(fipe.marcaSel, handleMarca, fipe.marcas, 'Selecione a marca', false)}
        </div>
        <div>
          <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>MODELO</label>
          {sel(fipe.modeloSel, handleModelo, fipe.modelos, 'Selecione o modelo', !fipe.marcaSel)}
        </div>
        <div>
          <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>ANO</label>
          {sel(fipe.anoSel, handleAno, fipe.anos, 'Selecione o ano', !fipe.modeloSel)}
        </div>
      </div>

      {/* Erro */}
      {fipe.erro && (
        <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 7, padding: '8px 12px', fontSize: 12, color: C.red, marginBottom: 10 }}>
          ⚠️ {fipe.erro === 'FIPE 429' ? 'Limite de requisições atingido. Tente em alguns minutos.' : `Erro ao consultar FIPE: ${fipe.erro}`}
        </div>
      )}

      {/* Resultado */}
      {fipe.resultado && !fipe.loading && (
        <div style={{ background: C.surface, border: `1px solid ${C.green}44`, borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            {[
              ['Veículo FIPE', `${fipe.resultado.marca} ${fipe.resultado.modelo}`, C.text],
              ['Ano/Combustível', fipe.resultado.anoModelo + ' / ' + fipe.resultado.combustivel, C.muted],
              ['Código FIPE', fipe.resultado.codigoFipe, C.muted],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: C.card, borderRadius: 7, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 12, color: c, fontWeight: 600, wordBreak: 'break-word' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `${C.green}15`, border: `1px solid ${C.green}44`, borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 2 }}>PREÇO MÉDIO FIPE</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.green, fontFamily: "'JetBrains Mono',monospace" }}>
                {fipe.resultado.valor}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Ref: {fipe.resultado.mesReferencia}</div>
            </div>
            <button
              onClick={handleUsar}
              style={{ background: C.green, color: '#000', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← Usar este valor
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
