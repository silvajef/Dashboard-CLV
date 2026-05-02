import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_STORAGE_KEY = 'sb-kicsrbhzgfhullgacszb-auth-token'

function lerSessaoDoStorage() {
  try {
    const raw = localStorage.getItem(SUPABASE_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.access_token || !parsed?.user) return null

    const expiresAt = parsed.expires_at
    if (!expiresAt || (Date.now() / 1000) >= (expiresAt - 60)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function limparToken() {
  localStorage.removeItem(SUPABASE_STORAGE_KEY)
  localStorage.removeItem('clv-auth')
  localStorage.removeItem('clv-auth-v2')
}

/**
 * Carrega o perfil via fetch direto na REST API.
 * Não usa o cliente Supabase porque ele trava em cold start.
 */
async function carregarPerfilViaFetch(userId, accessToken) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.[0] || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [perfil,  setPerfil]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    localStorage.removeItem('clv-auth')
    localStorage.removeItem('clv-auth-v2')

    async function iniciar() {
      const sessaoSalva = lerSessaoDoStorage()

      if (!sessaoSalva) {
        limparToken()
        setSession(null)
        setLoading(false)
        return
      }

      // Carrega perfil via fetch direto (não usa cliente Supabase)
      const perfilCarregado = await carregarPerfilViaFetch(
        sessaoSalva.user.id,
        sessaoSalva.access_token
      )

      if (!perfilCarregado) {
        // Token rejeitado pelo servidor — limpa e vai para login
        limparToken()
        setSession(null)
        setLoading(false)
        return
      }

      // Sucesso — injeta sessão no cliente Supabase em background
      // Não aguardamos para não travar a UI
      supabase.auth.setSession({
        access_token: sessaoSalva.access_token,
        refresh_token: sessaoSalva.refresh_token,
      }).catch(() => {})

      setSession(sessaoSalva)
      setPerfil(perfilCarregado)
      setLoading(false)
    }

    iniciar()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          setSession(session)
          if (session?.user?.id) {
            const p = await carregarPerfilViaFetch(session.user.id, session.access_token)
            setPerfil(p)
          }
          setLoading(false)
          return
        }
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setPerfil(null)
          setLoading(false)
          return
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    limparToken()
    await supabase.auth.signOut().catch(() => {})
    setSession(null)
    setPerfil(null)
  }

  const role       = perfil?.role || null
  const isAdmin    = role === 'admin'
  const isOperador = role === 'operador'
  const podeEditar = isAdmin || isOperador

  const value = {
    session, perfil, role,
    isAdmin, isOperador, podeEditar,
    loading, signOut,
    recarregarPerfil: async () => {
      if (session?.user?.id) {
        const p = await carregarPerfilViaFetch(session.user.id, session.access_token)
        setPerfil(p)
      }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}