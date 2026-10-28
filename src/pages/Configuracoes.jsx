/**
 * Aba Configurações — conectar/desconectar Mercado Livre e OLX (OAuth) e
 * configurar o feed de catálogo do Facebook. Nunca exibe token — só status
 * (conectado/expirado) vindo de api/anuncios-status.js. Props:
 * { statusIntegracoes, loading, error, conectar, gerarFeedFacebook, confirmarFacebook }
 */
import { useState } from 'react'
import { C } from '../lib/constants'
import { getPlataforma } from '../lib/plataformas/index'
import { LoadingScreen, ErrorBanner } from '../components/UI'

const s = {
  page:   { padding: '24px 20px', maxWidth: 700, margin: '0 auto' },
  titulo: { fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 20px' },
  secao:  { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
            textTransform: 'uppercase', margin: '0 0 10px' },
  card:   { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '14px 16px', marginBottom: 10 },
  row:    { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  btn:    { border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12,
            fontWeight: 700, padding: '7px 14px', fontFamily: "'Syne', sans-serif" },
  badge:  { fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20 },
  mono:   { fontFamily: 'monospace', fontSize: 11, color: C.muted, wordBreak: 'break-all',
            background: C.surface, borderRadius: 6, padding: '8px 10px', marginTop: 8 },
}

function CardConexao({ slug, status, onConectar, extra }) {
  const info = getPlataforma(slug)
  const conectado = status?.conectado
  const expirado = status?.expirado

  return (
    <div style={s.card}>
      <div style={s.row}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>{info.emoji} {info.nome}</p>
          <span style={{ fontSize: 11, color: C.muted }}>
            {!conectado ? 'Não conectado' : expirado ? 'Token expirado — reconecte' : 'Conectado'}
          </span>
        </div>
        {(!conectado || expirado) && (
          <button style={{ ...s.btn, background: C.blue, color: '#fff' }} onClick={() => onConectar(slug)}>
            Conectar
          </button>
        )}
        {conectado && !expirado && (
          <span style={{ ...s.badge, background: C.greenDim, color: C.green }}>Ativo</span>
        )}
      </div>
      {conectado && !expirado && extra}
    </div>
  )
}

function CardFacebook({ status, gerarFeedFacebook, confirmarFacebook }) {
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)

  async function handleGerar() {
    setGerando(true)
    setErro(null)
    try { await gerarFeedFacebook() }
    catch (e) { setErro(e.message) }
    finally { setGerando(false) }
  }

  return (
    <div style={s.card}>
      <div style={s.row}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>📘 Facebook — feed de catálogo</p>
          <span style={{ fontSize: 11, color: C.muted }}>
            Meta descontinuou publicação por item — o catálogo é sincronizado por feed.
          </span>
        </div>
        {status?.verificado
          ? <span style={{ ...s.badge, background: C.greenDim, color: C.green }}>Verificado</span>
          : <span style={{ ...s.badge, background: C.amberDim, color: C.amber }}>Pendente</span>}
      </div>

      {erro && <div style={{ color: C.red, fontSize: 11, marginTop: 8 }}>{erro}</div>}

      {!status?.feed_url && (
        <button style={{ ...s.btn, background: C.blue, color: '#fff', marginTop: 10 }}
                onClick={handleGerar} disabled={gerando}>
          {gerando ? 'Gerando…' : 'Gerar URL do feed'}
        </button>
      )}

      {status?.feed_url && (
        <>
          <p style={{ fontSize: 11, color: C.muted, margin: '10px 0 0' }}>
            Cole esta URL no Meta Commerce Manager (Catálogo → Inventário automotivo → Feed):
          </p>
          <div style={s.mono}>{status.feed_url}</div>
          {!status.verificado && (
            <button style={{ ...s.btn, background: C.card, color: C.muted, border: `1px solid ${C.border}`, marginTop: 10 }}
                    onClick={confirmarFacebook}>
              Marcar verificação de revendedor como concluída
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function Configuracoes({ statusIntegracoes, loading, error, conectar, gerarFeedFacebook, confirmarFacebook, configurarLeadsOlx }) {
  if (loading) return <LoadingScreen />

  const olxStatus = statusIntegracoes?.olx

  return (
    <div style={s.page}>
      <h2 style={s.titulo}>Configurações</h2>

      {error && <ErrorBanner message={error} />}

      <p style={s.secao}>Plataformas de anúncio</p>
      <CardConexao slug="mercadolivre" status={statusIntegracoes?.mercadolivre} onConectar={conectar} />
      <CardConexao
        slug="olx" status={olxStatus} onConectar={conectar}
        extra={!olxStatus?.webhook_configurado && (
          <button style={{ ...s.btn, background: C.card, color: C.muted, border: `1px solid ${C.border}`, marginTop: 10 }}
                  onClick={configurarLeadsOlx}>
            Configurar recebimento de leads
          </button>
        )}
      />
      <CardFacebook status={statusIntegracoes?.facebook} gerarFeedFacebook={gerarFeedFacebook} confirmarFacebook={confirmarFacebook} />
    </div>
  )
}
