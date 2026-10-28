import { C } from '../lib/constants'

const MAX_ATALHOS = 5

const s = {
  aviso:  { background: `${C.amber}15`, color: C.amber, border: `1px solid ${C.amber}40`,
            borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 12, lineHeight: 1.5 },
  lista:  { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
  atalho: { background: C.surface, color: C.text, border: `1px solid ${C.amber}55`, borderRadius: 6,
            cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '3px 8px',
            fontFamily: "'Syne', sans-serif" },
}

const rotuloVeiculo = v => [v.placa, v.modelo_nome || v.modelo].filter(Boolean).join(' · ') || 'Veículo sem placa'

// Props: { veiculos: object[], onCorrigir: (veiculoId) => void }
/** Atalhos que abrem a edição de cada veículo sem valor de compra (até MAX_ATALHOS). */
function AtalhosCorrecao({ veiculos, onCorrigir }) {
  const restantes = veiculos.length - MAX_ATALHOS
  return (
    <div style={s.lista}>
      {veiculos.slice(0, MAX_ATALHOS).map(v => (
        <button key={v.id} style={s.atalho} onClick={() => onCorrigir(v.id)}
          aria-label={`Informar valor de compra de ${rotuloVeiculo(v)}`}>
          ✏️ {rotuloVeiculo(v)}
        </button>
      ))}
      {restantes > 0 && <span>e mais {restantes}</span>}
    </div>
  )
}

// Props: { rv: { incompletas: number, semCusto: object[] }, onCorrigir?: (veiculoId) => void }
/**
 * Avisa quantas vendas ficaram fora de lucro/margem/ROI por falta de valor
 * de compra — sem isso o número parece definitivo quando não é. Com
 * `onCorrigir`, lista atalhos para a edição de cada veículo pendente.
 * Ex.: <AvisoVendasIncompletas rv={resultadoVendas(vendidos)} onCorrigir={id => abrirEdicao(id)}/>
 */
export default function AvisoVendasIncompletas({ rv, onCorrigir }) {
  const n = rv?.incompletas || 0
  if (n === 0) return null
  const plural = n !== 1
  return (
    <div style={s.aviso} role="status">
      <strong>{n} venda{plural ? 's' : ''} sem valor de compra</strong>{' '}
      {plural ? 'ficaram' : 'ficou'} fora do lucro, da margem e do ROI. Informe o custo de
      aquisição no cadastro do veículo para {plural ? 'incluí-las' : 'incluí-la'}.
      {onCorrigir && rv.semCusto?.length > 0 && <AtalhosCorrecao veiculos={rv.semCusto} onCorrigir={onCorrigir}/>}
    </div>
  )
}
