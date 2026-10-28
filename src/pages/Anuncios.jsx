/**
 * Aba Anúncios — visão centralizada por veículo: uma pílula por plataforma
 * publicável (ML/OLX/Facebook) mostrando se o carro já está anunciado lá,
 * pra evitar duplicar/esquecer um veículo em alguma plataforma. Props:
 * { veiculos, anuncios, statusIntegracoes, loading, error, publicar,
 *   pausar, reativar, fechar, anunciosDoVeiculo }
 */
import { useState } from 'react'
import { C, fmtR } from '../lib/constants'
import { PLATAFORMAS_PUBLICAVEIS } from '../lib/plataformas/index'
import { useBreakpoint } from '../lib/responsive'
import { LoadingScreen, ErrorBanner } from '../components/UI'
import ModalPublicarAnuncio from '../components/ModalPublicarAnuncio'

const s = {
  page:   { padding: '24px 20px', maxWidth: 1100, margin: '0 auto' },
  titulo: { fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 20px' },
  secao:  { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
            textTransform: 'uppercase', margin: '0 0 10px' },
  grid:   { display: 'grid', gap: 10, marginBottom: 28 },
  card:   { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' },
  row:    { display: 'flex', alignItems: 'center', gap: 10 },
  badge:  { fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, cursor: 'pointer', border: 'none' },
  erro:   { background: C.redDim, color: C.red, borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 12 },
}

const STATUS_ANUNCIO_CFG = {
  ativo:     { label: 'Ativo',     cor: C.green },
  pausado:   { label: 'Pausado',   cor: C.amber },
  encerrado: { label: 'Encerrado', cor: C.faint },
}

const STATUS_VEICULO_ANUNCIAVEL = ['pronto', 'em_venda']

function PillPlataforma({ plataforma, anuncio, conectado, onPublicarClick, onAcaoClick }) {
  if (!anuncio) {
    const habilitado = plataforma.slug === 'facebook' ? conectado : conectado
    return (
      <button
        style={{ ...s.badge, background: habilitado ? C.blueDim : C.subtle,
                 color: habilitado ? C.blue : C.faint, cursor: habilitado ? 'pointer' : 'not-allowed' }}
        disabled={!habilitado}
        title={habilitado ? `Publicar em ${plataforma.nome}` : `Conecte ${plataforma.nome} em Configurações`}
        onClick={() => habilitado && onPublicarClick(plataforma.slug)}
      >
        {plataforma.emoji} {plataforma.nome}
      </button>
    )
  }

  const cfg = STATUS_ANUNCIO_CFG[anuncio.status] || STATUS_ANUNCIO_CFG.ativo
  const proximaAcao =
    anuncio.status === 'ativo'   ? 'pausar'   :
    anuncio.status === 'pausado' ? 'reativar' : null

  return (
    <button
      style={{ ...s.badge, background: `${cfg.cor}22`, color: cfg.cor }}
      title={anuncio.erro_sincronizacao ? `Erro: ${anuncio.erro_sincronizacao}` : (proximaAcao ? `Clique para ${proximaAcao}` : undefined)}
      onClick={() => proximaAcao && plataforma.slug !== 'facebook' && onAcaoClick(anuncio.id, proximaAcao)}
    >
      {plataforma.emoji} {cfg.label}{anuncio.preco_anunciado ? ` · ${fmtR(anuncio.preco_anunciado)}` : ''}
      {anuncio.erro_sincronizacao ? ' ⚠' : ''}
    </button>
  )
}

export default function Anuncios({ veiculos, anuncios, statusIntegracoes, loading, error, publicar, pausar, reativar, anunciosDoVeiculo }) {
  const { cols } = useBreakpoint()
  const [modalPublicar, setModalPublicar] = useState(null) // { veiculo, plataforma }
  const [erroAcao, setErroAcao] = useState(null)

  if (loading) return <LoadingScreen />

  const veiculosRelevantes = (veiculos || []).filter(v =>
    STATUS_VEICULO_ANUNCIAVEL.includes(v.status) || (anuncios || []).some(a => a.veiculo_id === v.id))

  async function handleAcao(anuncioId, acao) {
    try {
      if (acao === 'pausar') await pausar(anuncioId)
      if (acao === 'reativar') await reativar(anuncioId)
    } catch (e) {
      setErroAcao(e.message)
    }
  }

  return (
    <div style={s.page}>
      <h2 style={s.titulo}>Anúncios</h2>

      {error && <ErrorBanner message={error} />}
      {erroAcao && <div style={s.erro}>{erroAcao}</div>}

      <p style={s.secao}>Veículos anunciáveis ({veiculosRelevantes.length})</p>
      <div style={{ ...s.grid, gridTemplateColumns: cols('1fr', '1fr', 'repeat(2, 1fr)') }}>
        {veiculosRelevantes.map(v => {
          const doVeiculo = anunciosDoVeiculo(v.id)
          const titulo = [v.marca_nome, v.modelo_nome || v.modelo, v.ano_modelo].filter(Boolean).join(' ').trim() || v.placa

          return (
            <div key={v.id} style={s.card}>
              <div style={{ ...s.row, marginBottom: 10, justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>{titulo}</p>
                  <span style={{ fontSize: 11, color: C.muted }}>{v.placa}</span>
                </div>
              </div>
              <div style={{ ...s.row, flexWrap: 'wrap', gap: 6 }}>
                {PLATAFORMAS_PUBLICAVEIS.map(plataforma => (
                  <PillPlataforma
                    key={plataforma.slug}
                    plataforma={plataforma}
                    anuncio={doVeiculo.find(a => a.plataforma === plataforma.slug)}
                    conectado={statusIntegracoes?.[plataforma.slug]?.conectado}
                    onPublicarClick={slug => setModalPublicar({ veiculo: v, plataforma: slug })}
                    onAcaoClick={handleAcao}
                  />
                ))}
              </div>
            </div>
          )
        })}
        {veiculosRelevantes.length === 0 && (
          <p style={{ color: C.faint, fontSize: 13 }}>Nenhum veículo pronto para anúncio no momento.</p>
        )}
      </div>

      {modalPublicar && (
        <ModalPublicarAnuncio
          veiculo={modalPublicar.veiculo}
          plataforma={modalPublicar.plataforma}
          onFechar={() => setModalPublicar(null)}
          onPublicar={dados => publicar(modalPublicar.veiculo.id, modalPublicar.plataforma, dados)}
        />
      )}
    </div>
  )
}
