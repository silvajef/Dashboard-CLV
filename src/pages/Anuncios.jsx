import { useState, useEffect } from 'react'
import { useAnuncios } from '../hooks/useAnuncios'
import { useAuth } from '../hooks/useAuth'
import { PLATAFORMAS } from '../lib/plataformas/index'
import { STATUS_ANUNCIO_CFG } from '../lib/plataformas/types'
import { ModalPublicarAnuncio } from '../components/ModalPublicarAnuncio'
import { C, fmtR } from '../lib/constants'

const ML_CONFIGURADO  = !!import.meta.env.VITE_ML_CLIENT_ID
const OLX_CONFIGURADO = !!import.meta.env.VITE_OLX_CLIENT_ID

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
  input:      { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, fontSize: 13, padding: '8px 12px', width: '100%',
                fontFamily: "'Syne', sans-serif", boxSizing: 'border-box' },
  overlay:    { position: 'fixed', inset: 0, background: '#0008', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:      { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
                padding: 28, width: 420, maxWidth: '94vw' },
  erro:       { background: C.redDim, color: C.red, borderRadius: 8, padding: '10px 14px',
                fontSize: 12, marginBottom: 12 },
}

/* ── Avisos de configuração de plataformas ────────────────────────────── */
function AvisoConfiguracaoML() {
  const redirectUri = `${window.location.origin}/`
  return (
    <div style={{ background: '#f59e0b18', border: '1px solid #f59e0b44', borderRadius: 10,
                  padding: '14px 16px', marginBottom: 12 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: C.amber }}>
        ⚠ Mercado Livre não configurado
      </p>
      <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.muted, lineHeight: 2 }}>
        <li>
          No <strong style={{ color: C.text }}>Vercel → Settings → Environment Variables</strong>,
          adicione <code style={{ background: C.card, padding: '1px 6px', borderRadius: 4, color: C.amber }}>VITE_ML_CLIENT_ID</code> e
          faça um novo deploy.
        </li>
        <li>
          No <strong style={{ color: C.text }}>ML Developers → Seu App → Redirect URIs</strong>,
          cadastre exatamente:{' '}
          <code style={{ background: C.card, padding: '2px 8px', borderRadius: 4, color: C.green, wordBreak: 'break-all' }}>
            {redirectUri}
          </code>
        </li>
      </ol>
    </div>
  )
}

function AvisoConfiguracaoOLX() {
  const redirectUri = `${window.location.origin}/`
  return (
    <div style={{ background: '#f2850018', border: '1px solid #f2850044', borderRadius: 10,
                  padding: '14px 16px', marginBottom: 12 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: '#f28500' }}>
        ⚠ OLX não configurado
      </p>
      <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.muted, lineHeight: 2 }}>
        <li>
          No <strong style={{ color: C.text }}>Vercel → Settings → Environment Variables</strong>,
          adicione <code style={{ background: C.card, padding: '1px 6px', borderRadius: 4, color: '#f28500' }}>VITE_OLX_CLIENT_ID</code> e{' '}
          <code style={{ background: C.card, padding: '1px 6px', borderRadius: 4, color: '#f28500' }}>VITE_OLX_CLIENT_SECRET</code> e
          faça um novo deploy.
        </li>
        <li>
          No <strong style={{ color: C.text }}>OLX Developers → Seu App → Redirect URIs</strong>,
          cadastre exatamente:{' '}
          <code style={{ background: C.card, padding: '2px 8px', borderRadius: 4, color: C.green, wordBreak: 'break-all' }}>
            {redirectUri}
          </code>
        </li>
      </ol>
    </div>
  )
}

/* ── Cartão de conexão de plataforma ──────────────────────────────────── */
function PlataformaCard({ config, conectado, expirou, onConectar, onDesconectar }) {
  const statusColor = conectado && !expirou ? C.green : conectado ? C.amber : C.faint
  const statusLabel = conectado && !expirou ? 'Conectado' : conectado ? 'Token expirado' : 'Desconectado'
  const bloqueado   =
    (config.slug === 'mercadolivre' && !ML_CONFIGURADO) ||
    (config.slug === 'olx'          && !OLX_CONFIGURADO)

  return (
    <div style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={s.row}>
        <span style={{ fontSize: 22 }}>{config.emoji}</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>{config.nome}</p>
          <span style={{ fontSize: 11, color: bloqueado ? C.amber : statusColor }}>
            {bloqueado ? 'Configuração pendente' : statusLabel}
          </span>
          {!config.implementado && (
            <span style={{ fontSize: 10, color: C.faint, display: 'block' }}>Em breve</span>
          )}
        </div>
      </div>

      {config.implementado && !bloqueado && (
        conectado
          ? <button style={{ ...s.btn, ...s.btnDanger }} onClick={onDesconectar}>Desconectar</button>
          : <button style={{ ...s.btn, ...s.btnPrimary }} onClick={onConectar}>Conectar</button>
      )}
    </div>
  )
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
    conectar, desconectar, tokenValido, integracaoPara,
    processarCallbackOAuth,
  } = useAnuncios(userId)

  const [veiculoParaPublicar, setVeiculoParaPublicar] = useState(null)
  const [erroAcao,            setErroAcao]            = useState('')

  // Processa callback OAuth (ML e OLX) quando userId fica disponível
  useEffect(() => {
    if (userId) processarCallbackOAuth()
  }, [userId]) // eslint-disable-line

  // Veículos disponíveis para anúncio: pronto ou em_venda
  const veiculosAnunciavel = (veiculos || [])
    .filter(v => ['pronto', 'em_venda'].includes(v.status))

  // Mapa veiculo_id → { plataforma: anuncio }
  const anunciosPorVeiculo = anuncios.reduce((acc, a) => {
    if (!acc[a.veiculo_id]) acc[a.veiculo_id] = {}
    acc[a.veiculo_id][a.plataforma] = a
    return acc
  }, {})

  function integracaoConectada(plataforma) {
    return integracoes.some(i => i.plataforma === plataforma)
  }

  function integracaoExpirou(plataforma) {
    const integ = integracoes.find(i => i.plataforma === plataforma)
    if (!integ?.expires_at) return false
    return new Date(integ.expires_at) <= new Date()
  }

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
        <div style={{ ...s.erro, marginBottom: 20 }}>{error || erroAcao}</div>
      )}

      {!ML_CONFIGURADO  && <AvisoConfiguracaoML />}
      {!OLX_CONFIGURADO && <AvisoConfiguracaoOLX />}

      {/* Conexões de plataforma */}
      <p style={s.secao}>Plataformas</p>
      <div style={{ ...s.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {PLATAFORMAS.map(p => (
          <PlataformaCard
            key={p.slug}
            config={p}
            conectado={integracaoConectada(p.slug)}
            expirou={integracaoExpirou(p.slug)}
            onConectar={() => handleAcao(conectar, p.slug)}
            onDesconectar={() => handleAcao(desconectar, p.slug)}
          />
        ))}
      </div>

      {/* Veículos disponíveis */}
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
