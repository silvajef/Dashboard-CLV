/**
 * AbaDocumentos — aba de documentos de um veículo.
 * Props: veiculo (objeto), processo (processo ativo ou null para vendidos)
 * Gerencia upload, visualização e exclusão de documentos no Supabase Storage.
 * Para veículos vendidos, reconstrói o processo a partir dos dados do veículo.
 */
import { useState, useEffect, useRef } from 'react'
import { C } from '../lib/constants'
import {
  getDocumentos, uploadDocumento, uploadContratoGerado,
  deleteDocumento, getDocumentoUrl,
} from '../lib/api'
import { imprimirDocumento, gerarBlobContrato } from '../lib/documento'

const russo  = "'Russo One', sans-serif"
const chakra = "'Chakra Petch', monospace"

const CATEGORIAS = [
  { key: 'contrato_venda', label: 'Contrato de Compra e Venda', icon: '📄', cor: C.purple },
  { key: 'crv_dut',        label: 'CRV / DUT (Transferência)',   icon: '🚗', cor: C.blue   },
  { key: 'nota_fiscal',    label: 'Nota Fiscal de Compra',       icon: '🧾', cor: C.green  },
  { key: 'vistoria',       label: 'Laudo de Vistoria Cautelar',  icon: '🔍', cor: C.cyan   },
  { key: 'fornecedor',     label: 'Documentos do Fornecedor',    icon: '👤', cor: C.amber  },
  { key: 'outro',          label: 'Outros Documentos',           icon: '📎', cor: C.muted  },
]

function tamanhoLegivel(kb) {
  if (!kb) return ''
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

// Reconstrói um objeto de processo a partir dos dados armazenados no veículo vendido
function processoDeVeiculo(v) {
  return {
    comprador_nome:     v.comprador_nome     || '',
    comprador_doc:      v.comprador_doc      || '',
    comprador_endereco: '',
    vendedor_nome:      v.vendedor_nome      || '',
    valor_venda:        v.valor_venda        || 0,
    forma_pagamento:    'avista',
    valor_entrada:      0,
    qtd_parcelas:       0,
    valor_parcela:      0,
    banco_financiamento:'',
    troca_placa:        '',
  }
}

export default function AbaDocumentos({ veiculo, processo }) {
  const [docs,      setDocs]      = useState([])
  const [carregando,setCarregando]= useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting,  setDeleting]  = useState(null)
  const [erro,      setErro]      = useState('')
  const [catUpload, setCatUpload] = useState('outro')
  const inputRef = useRef(null)

  const procAtivo = processo || (veiculo.status === 'vendido' ? processoDeVeiculo(veiculo) : null)
  const podeGerar = !!(procAtivo && (procAtivo.comprador_nome || veiculo.comprador_nome))

  useEffect(() => {
    carregarDocs()
  }, [veiculo.id])

  async function carregarDocs() {
    setCarregando(true)
    try { setDocs(await getDocumentos(veiculo.id)) }
    catch (e) { setErro(e.message) }
    finally { setCarregando(false) }
  }

  async function handleUpload(files) {
    if (!files?.length) return
    setErro('')
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          setErro(`${file.name} excede 20 MB.`)
          continue
        }
        const nome = file.name.replace(/\.[^.]+$/, '')
        await uploadDocumento({ veiculoId: veiculo.id, file, categoria: catUpload, nome })
      }
      await carregarDocs()
    } catch (e) { setErro(e.message) }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }

  async function gerarESalvarContrato() {
    if (!procAtivo) return
    setErro('')
    setUploading(true)
    try {
      imprimirDocumento(procAtivo, veiculo)
      const blob     = gerarBlobContrato(procAtivo, veiculo)
      const dataStr  = new Date().toISOString().split('T')[0]
      const nomearq  = `Contrato_${veiculo.placa || veiculo.id}_${dataStr}`
      await uploadContratoGerado({ veiculoId: veiculo.id, blob, nomeArquivo: nomearq })
      await carregarDocs()
    } catch (e) { setErro(e.message) }
    finally { setUploading(false) }
  }

  async function abrirDoc(doc) {
    const url = getDocumentoUrl(doc.storage_path)
    if (url) window.open(url, '_blank')
  }

  async function excluirDoc(doc) {
    if (!window.confirm(`Excluir "${doc.nome}"?`)) return
    setDeleting(doc.id)
    try {
      await deleteDocumento(doc.id, doc.storage_path)
      setDocs(prev => prev.filter(d => d.id !== doc.id))
    } catch (e) { setErro(e.message) }
    finally { setDeleting(null) }
  }

  const docsPorCategoria = CATEGORIAS.map(cat => ({
    ...cat,
    docs: docs.filter(d => d.categoria === cat.key),
  }))

  const btn   = { border:'none', borderRadius:5, cursor:'pointer', fontSize:10, fontFamily:russo, letterSpacing:'0.06em', padding:'5px 12px' }
  const input = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontSize:11, fontFamily:russo, letterSpacing:'0.04em', padding:'7px 10px', outline:'none' }

  return (
    <div>
      {erro && (
        <div style={{ background:C.redDim, color:C.red, borderRadius:8, padding:'8px 14px', fontSize:12, marginBottom:14 }}>{erro}</div>
      )}

      {/* ── Gerar Contrato de Venda ─────────────────────────────── */}
      <div style={{ background:`${C.purple}10`, border:`1px solid ${C.purple}33`, borderRadius:8, padding:'14px 16px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:russo, fontSize:11, color:C.purple, letterSpacing:'0.08em', marginBottom:3 }}>CONTRATO DE COMPRA E VENDA</div>
          <div style={{ fontSize:11, color:C.muted }}>
            {podeGerar
              ? `Comprador: ${procAtivo.comprador_nome || '—'} · Veículo: ${veiculo.placa || '—'}`
              : 'Inicie o processo de venda para gerar o contrato.'}
          </div>
        </div>
        <button
          onClick={gerarESalvarContrato}
          disabled={!podeGerar || uploading}
          style={{ ...btn, background: podeGerar ? C.purple : C.border, color: podeGerar ? '#fff' : C.faint, fontWeight:700, padding:'8px 18px', opacity: uploading ? 0.7 : 1 }}>
          {uploading ? '⟳ GERANDO...' : '🖨️ GERAR E IMPRIMIR'}
        </button>
      </div>

      {/* ── Upload de documentos ────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:16 }}>
        <select value={catUpload} onChange={e => setCatUpload(e.target.value)} style={{ ...input, flex:'0 0 auto' }}>
          {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
        </select>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ ...btn, background:C.blue, color:'#fff', fontWeight:700, padding:'8px 16px', opacity: uploading ? 0.7 : 1 }}>
          {uploading ? '⟳ ENVIANDO...' : '+ ADICIONAR DOCUMENTO'}
        </button>
        <input ref={inputRef} type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          multiple style={{ display:'none' }}
          onChange={e => handleUpload(e.target.files)}/>
        <span style={{ fontSize:10, color:C.faint, fontFamily:chakra }}>PDF · JPG · PNG — máx. 20 MB</span>
      </div>

      {/* ── Lista por categoria ─────────────────────────────────── */}
      {carregando ? (
        <div style={{ textAlign:'center', color:C.faint, padding:40, fontFamily:russo, fontSize:12, letterSpacing:'0.08em' }}>CARREGANDO...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign:'center', color:C.faint, padding:50, fontFamily:russo, fontSize:12, letterSpacing:'0.08em' }}>NENHUM DOCUMENTO ANEXADO</div>
      ) : (
        docsPorCategoria.filter(c => c.docs.length > 0).map(cat => (
          <div key={cat.key} style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span>{cat.icon}</span>
              <span style={{ fontFamily:russo, fontSize:10, color:cat.cor, letterSpacing:'0.1em' }}>{cat.label.toUpperCase()}</span>
              <span style={{ fontFamily:chakra, fontSize:9, color:C.faint, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'1px 7px' }}>{cat.docs.length}</span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {cat.docs.map(doc => (
                <div key={doc.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:russo, fontSize:12, color:C.text, letterSpacing:'0.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.nome}</div>
                    <div style={{ fontFamily:chakra, fontSize:10, color:C.faint, marginTop:3 }}>
                      {doc.tipo_mime?.split('/')[1]?.toUpperCase() || 'DOC'}
                      {doc.tamanho_kb ? ` · ${tamanhoLegivel(doc.tamanho_kb)}` : ''}
                      {' · '}
                      {new Date(doc.criado_em).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => abrirDoc(doc)}
                      style={{ ...btn, background:C.surface, color:C.text, border:`1px solid ${C.border}` }}>
                      👁 VER
                    </button>
                    <button onClick={() => excluirDoc(doc)}
                      disabled={deleting === doc.id}
                      style={{ ...btn, background:C.redDim, color:C.red, opacity: deleting === doc.id ? 0.6 : 1 }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
