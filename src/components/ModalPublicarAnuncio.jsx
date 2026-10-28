/**
 * Modal de publicação de anúncio — props: { veiculo, plataforma, onFechar,
 * onPublicar(dados) }. `dados.category_id` só é pedido pro Mercado Livre
 * (obrigatório na API de Classificados); OLX usa uma categoria fixa
 * (Carros/vans/utilitários) já embutida no adaptador.
 */
import { useState } from 'react'
import { C } from '../lib/constants'
import { getPlataforma } from '../lib/plataformas/index'

const s = {
  overlay: { position: 'fixed', inset: 0, background: '#0008', zIndex: 1000,
             display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:   { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
             padding: 28, width: 420, maxWidth: '94vw' },
  label:   { fontSize: 11, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 4 },
  input:   { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
             color: C.text, fontSize: 13, padding: '8px 12px', width: '100%',
             fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', marginBottom: 14 },
  btn:     { border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12,
             fontWeight: 700, padding: '7px 14px', fontFamily: "'Syne', sans-serif" },
  erro:    { background: C.redDim, color: C.red, borderRadius: 8, padding: '10px 14px',
             fontSize: 12, marginBottom: 12 },
}

export default function ModalPublicarAnuncio({ veiculo, plataforma, onFechar, onPublicar }) {
  const info = getPlataforma(plataforma)
  const [preco, setPreco] = useState(veiculo.valor_anuncio || veiculo.valor_fipe || '')
  const [categoryId, setCategoryId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  async function handleSalvar() {
    if (!preco || Number(preco) <= 0) return setErro('Informe um preço válido.')
    if (plataforma === 'mercadolivre' && !categoryId.trim()) {
      return setErro('Category ID do Mercado Livre é obrigatório (ver runbook de credenciais).')
    }
    setSalvando(true)
    setErro(null)
    try {
      const dados = { preco: Number(preco), fotos: veiculo.fotos || [] }
      if (plataforma === 'mercadolivre') dados.category_id = categoryId.trim()
      await onPublicar(dados)
      onFechar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={s.overlay} onClick={onFechar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>
          {info?.emoji} Publicar em {info?.nome || plataforma}
        </h3>

        {erro && <div style={s.erro}>{erro}</div>}

        <label style={s.label}>Preço anunciado (R$)</label>
        <input style={s.input} type="number" min="0" step="100" value={preco}
               onChange={e => setPreco(e.target.value)} />

        {plataforma === 'mercadolivre' && (
          <>
            <label style={s.label}>Category ID (Mercado Livre)</label>
            <input style={s.input} placeholder="ex.: MLB1744" value={categoryId}
                   onChange={e => setCategoryId(e.target.value)} />
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button style={{ ...s.btn, background: C.card, color: C.muted, border: `1px solid ${C.border}` }}
                  onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button style={{ ...s.btn, background: C.blue, color: '#fff' }}
                  onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
