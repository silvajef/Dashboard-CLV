import { useState, useEffect } from 'react'
import { C, fmtR } from '../lib/constants'
import { descobrirCategoria, buscarAtributos, preFillAtributos } from '../lib/plataformas/ml-catalogo'

const s = {
  overlay: { position: 'fixed', inset: 0, background: '#0008', zIndex: 1000,
             display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal:   { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
             padding: 24, width: 520, maxWidth: '100%', maxHeight: '90vh',
             overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  label:   { fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: '0.08em',
             display: 'block', marginBottom: 5 },
  input:   { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
             color: C.text, fontSize: 13, padding: '8px 12px', width: '100%',
             fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', outline: 'none' },
  select:  { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
             color: C.text, fontSize: 13, padding: '8px 12px', width: '100%',
             fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', appearance: 'auto' },
  erro:    { background: '#f4485e18', color: '#f4485e', borderRadius: 8,
             padding: '10px 14px', fontSize: 12 },
  secao:   { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
             textTransform: 'uppercase', marginBottom: 10 },
  btn:     { border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
             fontWeight: 700, padding: '10px 18px', fontFamily: "'Syne', sans-serif" },
}

const LISTING_TYPES = [
  { value: 'gold_premium', label: 'Gold Premium — máxima visibilidade' },
  { value: 'gold_special', label: 'Gold Special — boa visibilidade' },
  { value: 'gold_pro',     label: 'Gold Pro — profissional' },
  { value: 'free',         label: 'Grátis' },
]

function AtributoField({ attr, valor, onChange }) {
  const obrigatorio = attr.tags?.required || attr.tags?.catalog_required
  const label = `${attr.name}${obrigatorio ? ' *' : ''}`

  if (attr.allowed_values?.length > 0) {
    return (
      <div>
        <label style={s.label}>{label}</label>
        <select
          value={valor?.value_id || valor?.value_name || ''}
          onChange={e => {
            const opt = attr.allowed_values.find(v => v.id === e.target.value)
            onChange(opt?.id, opt?.name || e.target.value)
          }}
          style={{ ...s.input, appearance: 'auto' }}>
          <option value=''>Selecione...</option>
          {attr.allowed_values.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div>
      <label style={s.label}>{label}</label>
      <input
        type={attr.value_type === 'number' ? 'number' : 'text'}
        value={valor?.value_name || ''}
        onChange={e => onChange(undefined, e.target.value)}
        placeholder={attr.name}
        style={s.input}
      />
    </div>
  )
}

/**
 * Modal de publicação de anúncio com suporte a múltiplas plataformas.
 * Para ML: descoberta dinâmica de categoria e atributos via API.
 *
 * @param {{ veiculo, plataformas, tokenValido, integracaoPara, onSalvar, onFechar }} props
 */
export function ModalPublicarAnuncio({ veiculo, plataformas, tokenValido, integracaoPara, onSalvar, onFechar }) {
  const fotos = veiculo?.fotos || []

  const [plataforma,   setPlataforma]   = useState('')
  const [preco,        setPreco]        = useState(veiculo?.valor_anuncio || veiculo?.valor_compra || '')
  const [listingType,  setListingType]  = useState('gold_special')
  const [fotosSel,     setFotosSel]     = useState(fotos.slice(0, 20))
  const [categoriaML,  setCategoriaML]  = useState(null)
  const [atributosML,  setAtributosML]  = useState([])
  const [valAtributos, setValAtributos] = useState({})
  const [loadingML,    setLoadingML]    = useState(false)
  const [erroML,       setErroML]       = useState('')
  const [erro,         setErro]         = useState('')
  const [salvando,     setSalvando]     = useState(false)

  const titulo = [veiculo?.marca_nome, veiculo?.modelo_nome, veiculo?.ano_modelo]
    .filter(Boolean).join(' ')

  useEffect(() => {
    if (plataforma !== 'mercadolivre' || !tokenValido('mercadolivre')) return
    const integ = integracaoPara('mercadolivre')
    if (!integ?.access_token) return

    setLoadingML(true)
    setErroML('')

    descobrirCategoria(titulo, integ.access_token)
      .then(cat => {
        if (!cat?.category_id) throw new Error('Categoria não encontrada para este veículo.')
        setCategoriaML(cat)
        return buscarAtributos(cat.category_id, integ.access_token)
      })
      .then(attrs => {
        setAtributosML(attrs)
        setValAtributos(preFillAtributos(attrs, veiculo))
      })
      .catch(e => setErroML(e.message))
      .finally(() => setLoadingML(false))
  }, [plataforma]) // eslint-disable-line

  function setAtributo(id, valueId, valueName) {
    setValAtributos(prev => ({
      ...prev,
      [id]: valueId ? { value_id: valueId, value_name: valueName } : { value_name: valueName },
    }))
  }

  function toggleFoto(url) {
    setFotosSel(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url])
  }

  async function handleSalvar() {
    if (!plataforma)                         return setErro('Selecione uma plataforma.')
    if (!preco || Number(preco) <= 0)        return setErro('Informe um preço válido.')
    if (!tokenValido(plataforma))            return setErro(`Conecte a conta ${plataforma} antes de publicar.`)
    if (fotosSel.length === 0)               return setErro('Selecione pelo menos 1 foto. Adicione fotos ao veículo na aba Veículos.')

    if (plataforma === 'mercadolivre') {
      const faltando = atributosML
        .filter(a => (a.tags?.required || a.tags?.catalog_required) && !valAtributos[a.id]?.value_name)
        .map(a => a.name)
      if (faltando.length) return setErro(`Preencha os atributos obrigatórios: ${faltando.join(', ')}`)
    }

    setErro('')
    setSalvando(true)
    try {
      await onSalvar(plataforma, {
        preco:          Number(preco),
        fotos:          fotosSel,
        listing_type_id: listingType,
        category_id:    categoriaML?.category_id,
        atributos:      atributosML
          .filter(a => valAtributos[a.id]?.value_name)
          .map(a => ({
            id:         a.id,
            value_name: valAtributos[a.id].value_name,
            ...(valAtributos[a.id].value_id ? { value_id: valAtributos[a.id].value_id } : {}),
          })),
      })
      onFechar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const plataformasAtivas = plataformas.filter(p => p.implementado)

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={s.modal}>
        <div>
          <h3 style={{ margin: '0 0 4px', color: C.text, fontSize: 16 }}>Publicar Anúncio</h3>
          <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>{titulo}</p>
        </div>

        {erro && <div style={s.erro}>{erro}</div>}

        {/* Plataforma */}
        <div>
          <label style={s.label}>PLATAFORMA</label>
          <select value={plataforma} onChange={e => setPlataforma(e.target.value)} style={{ ...s.input, appearance: 'auto' }}>
            <option value=''>Selecione...</option>
            {plataformasAtivas.map(p => (
              <option key={p.slug} value={p.slug}>{p.emoji} {p.nome}</option>
            ))}
          </select>
        </div>

        {/* Preço */}
        <div>
          <label style={s.label}>PREÇO ANUNCIADO (R$)</label>
          <input type='number' value={preco} min={0}
            onChange={e => setPreco(e.target.value)}
            placeholder='Ex: 85000' style={s.input} />
          {preco > 0 && (
            <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>
              {fmtR(Number(preco))}
            </p>
          )}
        </div>

        {/* listing_type — apenas ML */}
        {plataforma === 'mercadolivre' && (
          <div>
            <label style={s.label}>TIPO DE ANÚNCIO</label>
            <select value={listingType} onChange={e => setListingType(e.target.value)} style={{ ...s.input, appearance: 'auto' }}>
              {LISTING_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Fotos */}
        <div>
          <p style={s.secao}>FOTOS ({fotosSel.length} selecionadas)</p>
          {fotos.length === 0 ? (
            <div style={{ ...s.erro, background: '#f59e0b18', color: C.amber }}>
              Este veículo não tem fotos. Adicione fotos na aba Veículos antes de publicar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {fotos.map((url, i) => (
                <div key={url} onClick={() => toggleFoto(url)}
                  style={{ position: 'relative', cursor: 'pointer' }}>
                  <img src={url} alt={`foto ${i + 1}`}
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8,
                             border: `3px solid ${fotosSel.includes(url) ? C.blue : C.border}`,
                             opacity: fotosSel.includes(url) ? 1 : 0.4, transition: 'all 0.15s' }} />
                  {fotosSel.includes(url) && (
                    <span style={{ position: 'absolute', top: 3, right: 3, background: C.blue,
                                   color: '#fff', borderRadius: '50%', width: 16, height: 16,
                                   fontSize: 9, fontWeight: 700, display: 'flex',
                                   alignItems: 'center', justifyContent: 'center' }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Atributos ML dinâmicos */}
        {plataforma === 'mercadolivre' && (
          <div>
            <p style={s.secao}>ATRIBUTOS DO ANÚNCIO</p>
            {loadingML && (
              <p style={{ fontSize: 12, color: C.muted }}>⟳ Carregando atributos da categoria...</p>
            )}
            {erroML && <div style={s.erro}>{erroML}</div>}
            {!loadingML && atributosML.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {atributosML.map(attr => (
                  <AtributoField
                    key={attr.id}
                    attr={attr}
                    valor={valAtributos[attr.id]}
                    onChange={(valueId, valueName) => setAtributo(attr.id, valueId, valueName)}
                  />
                ))}
              </div>
            )}
            {categoriaML && (
              <p style={{ fontSize: 10, color: C.faint, marginTop: 8 }}>
                Categoria: {categoriaML.category_id} · Domínio: {categoriaML.domain_id}
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button style={{ ...s.btn, background: C.card, color: C.muted,
                           border: `1px solid ${C.border}` }} onClick={onFechar}>
            Cancelar
          </button>
          <button
            style={{ ...s.btn, background: salvando ? C.faint : C.blue, color: '#fff' }}
            onClick={handleSalvar}
            disabled={salvando || fotos.length === 0}>
            {salvando ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
