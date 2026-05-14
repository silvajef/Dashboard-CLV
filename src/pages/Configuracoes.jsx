import { useState, useEffect } from 'react'
import { useAnuncios } from '../hooks/useAnuncios'
import { useAuth } from '../hooks/useAuth'
import { PLATAFORMAS } from '../lib/plataformas/index'
import { C } from '../lib/constants'

const ML_CONFIGURADO  = !!import.meta.env.VITE_ML_CLIENT_ID
const OLX_CONFIGURADO = !!import.meta.env.VITE_OLX_CLIENT_ID

const s = {
  page:       { padding: '24px 20px', maxWidth: 860, margin: '0 auto' },
  titulo:     { fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 20px' },
  secao:      { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
                textTransform: 'uppercase', margin: '0 0 10px' },
  grid:       { display: 'grid', gap: 10, marginBottom: 28 },
  card:       { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '14px 16px' },
  row:        { display: 'flex', alignItems: 'center', gap: 10 },
  btn:        { border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                fontWeight: 700, padding: '7px 14px', fontFamily: "'Syne', sans-serif" },
  btnPrimary: { background: C.blue, color: '#fff' },
  btnGhost:   { background: C.card, color: C.muted, border: `1px solid ${C.border}` },
  btnDanger:  { background: C.redDim, color: C.red },
  erro:       { background: C.redDim, color: C.red, borderRadius: 8, padding: '10px 14px',
                fontSize: 12, marginBottom: 12 },
}

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
          adicione{' '}
          <code style={{ background: C.card, padding: '1px 6px', borderRadius: 4, color: C.amber }}>VITE_ML_CLIENT_ID</code>{' '}
          e faça um novo deploy.
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
          adicione{' '}
          <code style={{ background: C.card, padding: '1px 6px', borderRadius: 4, color: '#f28500' }}>VITE_OLX_CLIENT_ID</code>{' '}
          e{' '}
          <code style={{ background: C.card, padding: '1px 6px', borderRadius: 4, color: '#f28500' }}>VITE_OLX_CLIENT_SECRET</code>{' '}
          e faça um novo deploy.
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

function OlxLeadsCard({ integracaoPara, onConfigurar, configurando }) {
  const integ = integracaoPara('olx')
  if (!integ?.access_token) return null

  const configurado = !!integ.webhook_configurado

  return (
    <div style={{ ...s.card, border: `1px solid ${configurado ? '#22d3a044' : C.border}` }}>
      <div style={{ ...s.row, justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={s.row}>
          <span style={{ fontSize: 20 }}>📨</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>
              Recebimento de Leads — OLX
            </p>
            <span style={{ fontSize: 11, color: configurado ? '#22d3a0' : C.amber }}>
              {configurado
                ? 'Ativo — leads chegam automaticamente na aba Leads'
                : 'Não configurado — clique para ativar'}
            </span>
          </div>
        </div>
        <button
          style={{ ...s.btn, ...(configurado ? s.btnGhost : s.btnPrimary) }}
          onClick={onConfigurar}
          disabled={configurando}>
          {configurando ? 'Configurando...' : configurado ? 'Reconfigurar' : 'Ativar Leads'}
        </button>
      </div>
      {!configurado && (
        <p style={{ fontSize: 11, color: C.faint, margin: '10px 0 0' }}>
          Se for a primeira vez, reconecte a OLX antes de ativar para garantir o escopo <code>autoservice</code>.
        </p>
      )}
    </div>
  )
}

export default function Configuracoes() {
  const { session } = useAuth()
  const userId      = session?.user?.id

  const {
    integracoes, error,
    conectar, desconectar, integracaoPara,
    processarCallbackOAuth, configurarLeadsOLX,
  } = useAnuncios(userId)

  const [erroAcao,          setErroAcao]          = useState('')
  const [configurandoLeads, setConfigurandoLeads]  = useState(false)

  useEffect(() => {
    if (userId) processarCallbackOAuth()
  }, [userId]) // eslint-disable-line

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

  async function handleConfigurarLeadsOLX() {
    setConfigurandoLeads(true)
    setErroAcao('')
    try { await configurarLeadsOLX() }
    catch (e) { setErroAcao(e.message) }
    finally { setConfigurandoLeads(false) }
  }

  return (
    <div style={s.page}>
      <h2 style={s.titulo}>Configurações</h2>

      {(error || erroAcao) && (
        <div style={s.erro}>{error || erroAcao}</div>
      )}

      {!ML_CONFIGURADO  && <AvisoConfiguracaoML />}
      {!OLX_CONFIGURADO && <AvisoConfiguracaoOLX />}

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

      {integracaoConectada('olx') && (
        <>
          <p style={s.secao}>Integração de Leads</p>
          <div style={s.grid}>
            <OlxLeadsCard
              integracaoPara={integracaoPara}
              onConfigurar={handleConfigurarLeadsOLX}
              configurando={configurandoLeads}
            />
          </div>
        </>
      )}
    </div>
  )
}
