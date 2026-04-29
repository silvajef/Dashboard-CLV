import { useState } from 'react'
import { Btn, SectionHead, ErrorBanner } from '../components/UI'
import { ModalPrestador, ModalConfirm } from '../components/Modals'
import { C, fmtR, custoV } from '../lib/constants'

const STAR_COLORS = ['','#ef4444','#f97316','#eab308','#3b82f6','#22d3a0']

export default function Prestadores({ prestadores, veiculos, savePrestador, removePrestador }) {
  const [modal, setModal]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState(null)

  const handle = async (fn, ...args) => {
    try { setSaving(true); setErro(null); await fn(...args); setModal(null) }
    catch (e) { setErro(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>Prestadores de Serviço</h2>
          <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>{prestadores.length} cadastrado(s)</p>
        </div>
        <Btn onClick={() => setModal({ type: 'prestador', data: null })}>+ Novo Prestador</Btn>
      </div>
      {erro && <ErrorBanner message={erro} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
        {prestadores.map(pr => {
          const servs = veiculos.flatMap(v => (v.servicos || []).filter(s => s.prestador_id === pr.id))
          const total = servs.reduce((s, m) => s + (m.custo_pecas || 0) + (m.custo_mao || 0) + (m.outros || 0), 0)
          const cor   = STAR_COLORS[pr.avaliacao] || C.amber
          return (
            <div key={pr.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{pr.nome}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#f59e0b18', color: '#f59e0b', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{pr.tipo}</span>
                    <span>{[1,2,3,4,5].map(n => <span key={n} style={{ color: n <= pr.avaliacao ? cor : C.border, fontSize: 13 }}>★</span>)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="ghost" small onClick={() => setModal({ type: 'prestador', data: pr })}>✏️</Btn>
                  <Btn variant="danger" small onClick={() => setModal({ type: 'del', data: pr })}>🗑</Btn>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 14 }}>
                {[['📞', pr.telefone || '—'], ['📧', pr.email || '—'], ['🏢', pr.cnpj || '—'], ['📍', pr.endereco || '—']].map(([i, v]) => (
                  <div key={i} style={{ display: 'flex', gap: 5, color: C.muted }}><span>{i}</span><span style={{ color: C.text }}>{v}</span></div>
                ))}
              </div>
              <div style={{ paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: C.muted }}>{servs.length} serviço(s)</span>
                <span style={{ color: C.amber, fontWeight: 700 }}>{fmtR(total)}</span>
              </div>
            </div>
          )
        })}
        {!prestadores.length && <div style={{ textAlign: 'center', color: C.muted, padding: 50 }}>Nenhum prestador cadastrado.</div>}
      </div>
      {modal?.type === 'prestador' && <ModalPrestador data={modal.data} onSave={d => handle(savePrestador, d)} onClose={() => setModal(null)} loading={saving} />}
      {modal?.type === 'del' && <ModalConfirm title="Excluir Prestador" message={`Excluir "${modal.data.nome}"?`} onConfirm={() => handle(removePrestador, modal.data.id)} onClose={() => setModal(null)} loading={saving} />}
    </div>
  )
}
