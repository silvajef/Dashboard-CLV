import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'

const BUCKET   = 'vehicle-photos'
const MAX_IMGS = 20
const MAX_MB   = 5

/**
 * Upload de fotos para Supabase Storage.
 * A primeira foto é a capa do anúncio — indicada visualmente.
 *
 * @param {Object} props
 * @param {string}   props.folderId  - veiculoId ou UUID temporário para novos veículos
 * @param {string[]} props.fotos     - URLs atuais
 * @param {function} props.onChange  - chamada com novo array de URLs
 */
export function FotoUpload({ folderId, fotos = [], onChange }) {
  const [uploading, setUploading] = useState(false)
  const [erro,      setErro]      = useState('')
  const inputRef = useRef(null)

  async function handleFiles(files) {
    if (fotos.length >= MAX_IMGS) return setErro(`Máximo de ${MAX_IMGS} fotos.`)
    setErro('')
    setUploading(true)

    const novas = []
    for (const file of Array.from(files)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setErro(`${file.name} excede ${MAX_MB}MB.`)
        continue
      }
      const ext  = file.name.split('.').pop()
      const path = `${folderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (error) { setErro(`Erro ao enviar ${file.name}: ${error.message}`); continue }

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      novas.push(publicUrl)
    }

    if (novas.length) onChange([...fotos, ...novas].slice(0, MAX_IMGS))
    setUploading(false)
  }

  async function removerFoto(url) {
    const path = url.split(`/${BUCKET}/`)[1]
    if (path) await supabase.storage.from(BUCKET).remove([path])
    onChange(fotos.filter(u => u !== url))
  }

  return (
    <div>
      {fotos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {fotos.map((url, i) => (
            <div key={url} style={{ position: 'relative' }}>
              <img
                src={url} alt={`foto ${i + 1}`}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8,
                         border: `2px solid ${i === 0 ? C.amber : C.border}` }}
              />
              <button
                onClick={() => removerFoto(url)}
                style={{ position: 'absolute', top: -6, right: -6, background: C.red,
                         color: '#fff', border: 'none', borderRadius: '50%', width: 20,
                         height: 20, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                ✕
              </button>
              {i === 0 && (
                <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 9,
                               fontWeight: 700, background: C.amber, color: '#000',
                               borderRadius: 3, padding: '1px 4px' }}>CAPA</span>
              )}
            </div>
          ))}
        </div>
      )}

      {fotos.length < MAX_IMGS && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          style={{ border: `2px dashed ${C.border}`, borderRadius: 10,
                   padding: '14px 16px', textAlign: 'center',
                   cursor: uploading ? 'wait' : 'pointer', color: C.muted, fontSize: 12 }}
          onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = C.blue }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border }}>
          {uploading ? '⟳ Enviando...' : `📷 Clique para adicionar fotos (máx. ${MAX_IMGS}, ${MAX_MB}MB cada)`}
          <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => e.target.files?.length && handleFiles(e.target.files)} />
        </div>
      )}

      {erro && <p style={{ fontSize: 11, color: C.red, margin: '6px 0 0' }}>{erro}</p>}
    </div>
  )
}
