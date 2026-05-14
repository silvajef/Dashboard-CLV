import { useState } from 'react'
import { useAnuncios } from '../hooks/useAnuncios'
import { useAuth } from '../hooks/useAuth'
import { PLATAFORMAS } from '../lib/plataformas/index'
import { STATUS_ANUNCIO_CFG } from '../lib/plataformas/types'
import { ModalPublicarAnuncio } from '../components/ModalPublicarAnuncio'
import { C } from '../lib/constants'

/* ── Estilos base ─────────────────────────────────────────────────────── */
const s = {
  page:       { padding: '24px 20px', maxWidth: 1100, margin: '0 auto' },
  titulo:     { fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 20px' },
  secao:      { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
                textTransform: 'uppercase', margin: '0 0 10px' },
  grid:       { display: 'grid', gap: 10, marginBottom: 28 },
  card:       { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '14px 16px' },
  row:        { display: 'flex', alignItems: 'center', gap: 10 },
  badge:      { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  btn:        { border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                fontWeight: 700, padding: '7px 14px', fontFamily: "'Syne', sans-serif" },
  btnPrimary: { background: C.blue, color: '#fff' },
  btnGhost:   { background: C.card, color: C.muted, border: `1px solid ${C.border}` },
  btnDanger:  { background: C.redDim, color: C.red },
  erro:       { background: C.redDim, color: C.red, borderRadius: 8, padding: '10px 14px',
                fontSize: 12, marginBottom: 12 },
}

/* ── Badge de status do anúncio ───────────────────────────────────────── */
function BadgeAnuncio({ status }) {
  const cfg = STATUS_ANUNCIO_CFG[status] || STATUS_ANUNCIO_CFG.rascunho
  return (
    <span style={{ ...s.badge, background: `${cfg.color}22`, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

/* ── Linha de veículo com anúncios por plataforma ─────────────────────── */
function VeiculoRow({ veiculo, anunciosPorPlataforma, tokenValido, onPublicar, onPausar, onReativar, onFechar }) {
  const titulo = [veiculo.marca_nome, veiculo.modelo_nome || veiculo.modelo, veiculo.ano_modelo]
    .filter(Boolean).join(' ')

  return (
    <div style={s.card}>
      <div style={{ ...s.row, justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>{titulo}</p>
          <span style={{ fontSize: 11, color: C.muted }}>{veiculo.placa}</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {PLATAFORMAS.map(p => {
            const anuncio = anunciosPorPlataforma[p.slug]
            if (!anuncio) return null
            return (
              <div key={p.slug} style={{ ...s.row, gap: 4 }}>
                <span style={{ fontSize: 14 }}>{p.emoji}</span>
                <BadgeAnuncio status={anuncio.status} />
                {anuncio.url && (
                  <a href={anuncio.url} target='_blank' rel='noreferrer'
                    style={{ fontSize: 10, color: C.blue }}>↗</a>
                )}
                {anuncio.status === 'ativo' && (
                  <button style={{ ...s.btn, ...s.btnGhost, padding: '3px 8px', fontSize: 10 }}
                    onClick={() => onPausar(anuncio.id)}>Pausar</button>
                )}
                {anuncio.status === 'pausado' && (
                  <button style={{ ...s.btn, ...s.btnPrimary, padding: '3px 8px', fontSize: 10 }}
                    onClick={() => onReativar(anuncio.id)}>Reativar</button>
                )}
                <button style={{ ...s.btn, ...s.btnDanger, padding: '3px 8px', fontSize: 10 }}
                  onClick={() => onFechar(anuncio.id)}>✕</button>
              </div>
            )
          })}
          <button style={{ ...s.btn, ...s.btnPrimary, padding: '5px 12px' }}
            onClick={() => onPublicar(veiculo)}>
            + Anunciar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Página principal ─────────────────────────────────────────────────── */
export default function Anuncios({ veiculos }) {
  const { session } = useAuth()
  const userId      = session?.user?.id

  const {
    anuncios, integracoes, loading, error,
    publicar, pausar, reativar, fechar,
    tokenValido, integracaoPara,
  } = useAnuncios(userId)

  const [veiculoParaPublicar, setVeiculoParaPublicar] = useState(null)
  const [erroAcao,            setErroAcao]            = useState('')

  const veiculosAnunciavel = (veiculos || [])
    .filter(v => ['pronto', 'em_venda'].includes(v.status))

  const anunciosPorVeiculo = anuncios.reduce((acc, a) => {
    if (!acc[a.veiculo_id]) acc[a.veiculo_id] = {}
    acc[a.veiculo_id][a.plataforma] = a
    return acc
  }, {})

  async function handleAcao(fn, ...args) {
    setErroAcao('')
    try { await fn(...args) }
    catch (e) { setErroAcao(e.message) }
  }

  async function handlePublicar(plataforma, dados) {
    await publicar(veiculoParaPublicar, plataforma, dados)
  }

  if (loading) return (
    <div style={{ ...s.page, color: C.muted, fontSize: 13 }}>Carregando anúncios...</div>
  )

  return (
    <div style={s.page}>
      <h2 style={s.titulo}>Anúncios</h2>

      {(error || erroAcao) && (
        <div style={s.erro}>{error || erroAcao}</div>
      )}

      <p style={s.secao}>Veículos disponíveis para anúncio ({veiculosAnunciavel.length})</p>
      {veiculosAnunciavel.length === 0 && (
        <p style={{ color: C.muted, fontSize: 13 }}>
          Nenhum veículo com status "Pronto" ou "Em Venda" no estoque.
        </p>
      )}
      <div style={s.grid}>
        {veiculosAnunciavel.map(v => (
          <VeiculoRow
            key={v.id}
            veiculo={v}
            anunciosPorPlataforma={anunciosPorVeiculo[v.id] || {}}
            tokenValido={tokenValido}
            onPublicar={setVeiculoParaPublicar}
            onPausar={id  => handleAcao(pausar, id)}
            onReativar={id => handleAcao(reativar, id)}
            onFechar={id  => handleAcao(fechar, id)}
          />
        ))}
      </div>

      {veiculoParaPublicar && (
        <ModalPublicarAnuncio
          veiculo={veiculoParaPublicar}
          plataformas={PLATAFORMAS}
          tokenValido={tokenValido}
          integracaoPara={integracaoPara}
          onSalvar={handlePublicar}
          onFechar={() => setVeiculoParaPublicar(null)}
        />
      )}
    </div>
  )
}
