// Tela exclusiva do perfil 'vendedor': catálogo de estoque READ-ONLY.
// Mostra só dados de venda — nunca custo de compra, custos de manutenção ou margem.
// Fronteira financeira: este componente lê de fleet.veiculos mas renderiza apenas
// campos permitidos (foto, ficha técnica, preço de anúncio, status, FIPE de
// referência, histórico de serviços SEM valores). Props: veiculos[].
import { useState, useMemo } from 'react'
import { useBreakpoint } from '../lib/responsive'
import { C, STATUS_VEICULO_CFG, fmtR, fmtN } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'

// ── Utilitários ──────────────────────────────────────────────────────────────

function nomeVeiculo(v) {
  return [v.marca_nome, v.modelo_nome].filter(Boolean).join(' ') || 'Veículo'
}

function anoVeiculo(v) {
  return v.ano_modelo || v.ano || '—'
}

// Preço mostrado ao vendedor é o valor anunciado — NUNCA o valor de compra.
function precoVenda(v) {
  return v.valor_anuncio > 0 ? fmtR(v.valor_anuncio) : 'Sob consulta'
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const s = {
  page:   { padding: '24px 20px', maxWidth: 1100, margin: '0 auto' },
  titulo: { fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 4px' },
  sub:    { fontSize: 13, color: C.muted, margin: '0 0 20px' },
  secao:  { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
            textTransform: 'uppercase', margin: '0 0 10px' },
  card:   { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' },
  pill:   { fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
            border: `1px solid ${C.border}`, background: C.surface, color: C.muted },
}

// ── Filtro de status ───────────────────────────────────────────────────────────

const STATUS_VENDAVEIS = ['pendente', 'manutencao', 'pronto', 'em_venda']

/** Pílulas de filtro por status (exclui 'vendido' — não é estoque). */
function FiltroStatus({ atual, setAtual }) {
  const opcoes = [['todos', 'Todos'], ...STATUS_VENDAVEIS.map(k => [k, STATUS_VEICULO_CFG[k]?.label || k])]
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {opcoes.map(([k, label]) => {
        const ativo = atual === k
        return (
          <button key={k} onClick={() => setAtual(k)}
            style={{ ...s.pill,
              background: ativo ? C.blueDim : C.surface,
              borderColor: ativo ? C.blue : C.border,
              color: ativo ? C.blue : C.muted }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── Lista ────────────────────────────────────────────────────────────────────

/** Card de um veículo na lista — capa, identificação, preço e status. */
function CardVeiculo({ v, onClick }) {
  const capa = v.fotos?.[0]
  const cfg  = STATUS_VEICULO_CFG[v.status] || { color: C.muted }
  return (
    <div onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${cfg.color}66`; e.currentTarget.style.background = C.cardHi }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card }}
      style={{ ...s.card, padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex', gap: 0 }}>
      <div style={{ width: 96, height: 96, flexShrink: 0, background: C.surface,
                     display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {capa
          ? <img src={capa} alt={nomeVeiculo(v)} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : <span style={{ fontSize: 24, opacity: 0.4 }}>🚗</span>}
      </div>
      <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: 'hidden',
                         textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nomeVeiculo(v)}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.green, flexShrink: 0 }}>{precoVenda(v)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: C.cyan }}>{anoVeiculo(v)}</span>
          <span style={{ fontSize: 11, color: C.muted }}>{fmtN(v.km)} km</span>
          {v.cor && <span style={{ fontSize: 11, color: C.faint }}>· {v.cor}</span>}
          <StatusBadge status={v.status} size="sm"/>
        </div>
      </div>
    </div>
  )
}

// ── Ficha (detalhe) ────────────────────────────────────────────────────────────

/** Galeria simples: foto grande + miniaturas clicáveis. */
function Galeria({ fotos }) {
  const [idx, setIdx] = useState(0)
  if (!fotos?.length) {
    return (
      <div style={{ ...s.card, height: 220, display: 'flex', alignItems: 'center',
                     justifyContent: 'center', color: C.faint, fontSize: 13 }}>
        Sem fotos
      </div>
    )
  }
  return (
    <div>
      <img src={fotos[idx]} alt="foto do veículo"
        style={{ width: '100%', height: 260, objectFit: 'cover', borderRadius: 12, border: `1px solid ${C.border}` }}/>
      {fotos.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {fotos.map((url, i) => (
            <img key={url} src={url} alt={`miniatura ${i + 1}`} onClick={() => setIdx(i)}
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, cursor: 'pointer',
                       border: `2px solid ${i === idx ? C.blue : C.border}` }}/>
          ))}
        </div>
      )}
    </div>
  )
}

/** Grade de ficha técnica — pares rótulo/valor. */
function FichaTecnica({ v }) {
  const campos = [
    ['Marca',       v.marca_nome],
    ['Modelo',      v.modelo_nome],
    ['Ano',         anoVeiculo(v)],
    ['Tipo',        v.tipo],
    ['Cor',         v.cor],
    ['KM',          v.km != null ? `${fmtN(v.km)} km` : null],
    ['Combustível', v.combustivel],
    ['Placa',       v.placa],
  ].filter(([, val]) => val)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
      {campos.map(([label, val]) => (
        <div key={label} style={{ ...s.card, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, color: C.faint, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 3 }}>{val}</div>
        </div>
      ))}
    </div>
  )
}

/** Bloco de preço de venda + FIPE de referência (lado a lado). */
function BlocoPreco({ v }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: v.valor_fipe > 0 ? '1fr 1fr' : '1fr', gap: 10 }}>
      <div style={{ ...s.card, borderTop: `2px solid ${C.green}` }}>
        <div style={{ fontSize: 9, color: C.faint, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Preço de Venda</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginTop: 4 }}>{precoVenda(v)}</div>
      </div>
      {v.valor_fipe > 0 && (
        <div style={{ ...s.card, borderTop: `2px solid ${C.cyan}` }}>
          <div style={{ fontSize: 9, color: C.faint, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>FIPE (referência)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.cyan, marginTop: 4 }}>{fmtR(v.valor_fipe)}</div>
        </div>
      )}
    </div>
  )
}

/** Linha de serviço no histórico — SEM valores de custo. */
function ServicoLinha({ srv }) {
  return (
    <div style={{ ...s.card, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{srv.tipo || 'Serviço'}</span>
        <span style={{ fontSize: 11, color: C.muted }}>{srv.data_servico || '—'}</span>
      </div>
      {srv.descricao && <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0' }}>{srv.descricao}</p>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
        {srv.prestador?.nome && <span style={{ fontSize: 11, color: C.faint }}>🔧 {srv.prestador.nome}</span>}
        {srv.garantia && <span style={{ fontSize: 11, color: C.muted }}>🛡 Garantia: {srv.garantia}</span>}
      </div>
    </div>
  )
}

/** Histórico de manutenção (sem custos) ou estado vazio. */
function SecaoManutencao({ servicos }) {
  return (
    <div>
      <p style={s.secao}>Manutenção / Revisões</p>
      {servicos?.length
        ? servicos.map(srv => <ServicoLinha key={srv.id} srv={srv}/>)
        : <div style={{ ...s.card, color: C.faint, fontSize: 12, textAlign: 'center' }}>Nenhum serviço registrado.</div>}
    </div>
  )
}

/** Ficha completa read-only de um veículo. */
function FichaVeiculo({ v, onVoltar }) {
  return (
    <div>
      <button onClick={onVoltar}
        style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer',
                 padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Syne', sans-serif" }}>
        ‹ Voltar ao estoque
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ ...s.titulo, margin: 0 }}>{nomeVeiculo(v)}</h2>
        <StatusBadge status={v.status} size="lg"/>
      </div>
      <div style={{ marginBottom: 20 }}><Galeria fotos={v.fotos}/></div>
      <div style={{ marginBottom: 20 }}><BlocoPreco v={v}/></div>
      <p style={s.secao}>Ficha Técnica</p>
      <div style={{ marginBottom: 24 }}><FichaTecnica v={v}/></div>
      <SecaoManutencao servicos={v.servicos}/>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

/** Catálogo de estoque read-only para o perfil vendedor. Props: veiculos[]. */
export default function EstoqueVendedor({ veiculos }) {
  const [filtro, setFiltro] = useState('todos')
  const [vSel,   setVSel]   = useState(null)
  const { cols } = useBreakpoint()

  // Exclui vendidos — não fazem parte do estoque disponível.
  const estoque = useMemo(
    () => (veiculos || []).filter(v => v.status !== 'vendido'),
    [veiculos]
  )
  const filtrados = useMemo(
    () => filtro === 'todos' ? estoque : estoque.filter(v => v.status === filtro),
    [estoque, filtro]
  )

  if (vSel) {
    // Relê do array (mantém atualizações de realtime) ou cai no selecionado.
    const atual = estoque.find(v => v.id === vSel.id) || vSel
    return <div style={s.page}><FichaVeiculo v={atual} onVoltar={() => setVSel(null)}/></div>
  }

  return (
    <div style={s.page}>
      <h2 style={s.titulo}>Estoque</h2>
      <p style={s.sub}>{estoque.length} veículo{estoque.length !== 1 ? 's' : ''} no estoque</p>
      <FiltroStatus atual={filtro} setAtual={setFiltro}/>
      {filtrados.length === 0
        ? <div style={{ ...s.card, color: C.faint, fontSize: 13, textAlign: 'center', padding: 40 }}>Nenhum veículo neste filtro.</div>
        : (
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: cols('1fr', '1fr', 'repeat(2, 1fr)') }}>
            {filtrados.map(v => <CardVeiculo key={v.id} v={v} onClick={() => setVSel(v)}/>)}
          </div>
        )}
    </div>
  )
}
