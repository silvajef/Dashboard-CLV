import { C, fmtR, STATUS_SERV_CFG } from '../lib/constants'
import { Badge } from '../components/UI'

export default function Historico({ veiculos, prestadores }) {
  const todos = veiculos.flatMap(v =>
    (v.servicos||[]).map(s => ({ ...s, veiculo: v }))
  ).sort((a,b) => (b.data_servico||'').localeCompare(a.data_servico||''))

  const nomePrestador = id => prestadores.find(p=>p.id===id)?.nome || '—'

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>Histórico de Serviços</h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>{todos.length} serviço(s) registrado(s)</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {todos.map(s => {
          const total = (s.custo_pecas||0)+(s.custo_mao||0)+(s.outros||0)
          const cfg = STATUS_SERV_CFG[s.status]||{color:C.muted}
          return (
            <div key={`${s.id}`} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `3px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ background: C.surface, borderRadius: 8, padding: '8px 10px', textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: 10, color: C.muted }}>DATA</div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{s.data_servico}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.veiculo.modelo} — {s.veiculo.placa}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{s.tipo}: {s.descricao}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>Prestador: {nomePrestador(s.prestador_id)}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div style={{ fontWeight: 800, color: C.amber, fontSize: 15, fontFamily: "'JetBrains Mono',monospace" }}>{fmtR(total)}</div>
                <Badge status={s.status} cfg={STATUS_SERV_CFG} />
              </div>
            </div>
          )
        })}
        {!todos.length && <div style={{ textAlign: 'center', color: C.muted, padding: 50 }}>Nenhum serviço registrado.</div>}
      </div>
    </div>
  )
}
