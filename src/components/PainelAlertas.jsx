/**
 * Painel lateral de alertas — abre como slide-in pela direita.
 * Persistência de itens dispensados via localStorage (sem tabela no banco).
 *
 * PainelAlertas({ alertas: Alerta[], onFechar: () => void })
 */
import { useState, useEffect } from 'react'
import { C } from '../lib/constants'
import Icon from './Icon'

const STORAGE_KEY = 'clv_alertas_lidos'

function getLidos() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) }
  catch { return new Set() }
}

const SEV_COR   = { critica: C.red, alta: C.amber, media: C.blue }
const SEV_LABEL = { critica: 'Crítico', alta: 'Alto', media: 'Médio' }
const TIPO_LABEL = {
  servico_pendente:  'Serviço',
  sem_manutencao:    'Manutenção',
  garantia_vencendo: 'Garantia',
  garantia_vencida:  'Garantia',
  custo_alto:        'Custo',
}

/** Cartão individual de alerta com botão de dispensa. */
function CardAlerta({ alerta, onDismiss }) {
  const cor = SEV_COR[alerta.severidade] || C.muted
  return (
    <div style={{
      padding: '12px 14px', borderBottom: `1px solid ${C.border}`,
      borderLeft: `3px solid ${cor}`,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: `${cor}22`, color: cor, textTransform: 'uppercase',
                          letterSpacing: '0.05em' }}>
            {SEV_LABEL[alerta.severidade]}
          </span>
          <span style={{ fontSize: 10, color: C.faint }}>{TIPO_LABEL[alerta.tipo] || alerta.tipo}</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>{alerta.titulo}</p>
        {alerta.descricao && (
          <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>{alerta.descricao}</p>
        )}
      </div>
      <button onClick={() => onDismiss(alerta.id)} title="Dispensar"
        style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: C.faint, padding: 2, flexShrink: 0, display: 'flex',
                  alignItems: 'center' }}>
        <Icon name="x" size={13}/>
      </button>
    </div>
  )
}

export default function PainelAlertas({ alertas, onFechar }) {
  const [lidos, setLidos] = useState(getLidos)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...lidos]))
  }, [lidos])

  const visiveis = alertas.filter(a => !lidos.has(a.id))

  const dismiss    = id  => setLidos(prev => new Set([...prev, id]))
  const dismissAll = () => setLidos(new Set(alertas.map(a => a.id)))

  return (
    <>
      {/* Overlay de fundo */}
      <div onClick={onFechar}
        style={{ position: 'fixed', inset: 0, background: '#0005', zIndex: 300 }} />

      {/* Painel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 340, maxWidth: '90vw',
        background: C.surface, borderLeft: `1px solid ${C.border}`,
        zIndex: 400, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
        fontFamily: "'Syne', sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: '16px 14px', borderBottom: `1px solid ${C.border}`,
                       display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                       flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="bell" size={16} style={{ color: C.amber }}/>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Alertas</span>
            {visiveis.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                              background: C.redDim, color: C.red }}>
                {visiveis.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {visiveis.length > 0 && (
              <button onClick={dismissAll}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 11, color: C.muted, fontFamily: "'Syne',sans-serif" }}>
                Limpar tudo
              </button>
            )}
            <button onClick={onFechar}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: C.muted, display: 'flex', padding: 4 }}>
              <Icon name="x" size={16}/>
            </button>
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {visiveis.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                           justifyContent: 'center', height: '100%', gap: 12, padding: 24 }}>
              <Icon name="check" size={36} style={{ color: C.green }}/>
              <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', margin: 0,
                           lineHeight: 1.6 }}>
                Nenhum alerta pendente.<br/>Tudo em ordem!
              </p>
            </div>
          ) : (
            visiveis.map(a => (
              <CardAlerta key={a.id} alerta={a} onDismiss={dismiss}/>
            ))
          )}
        </div>
      </div>
    </>
  )
}
