import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

const SUPABASE_STORAGE_KEY = 'sb-kicsrbhzgfhullgacszb-auth-token'

function tokenEstaExpirado() {
  try {
    const raw = localStorage.getItem(SUPABASE_STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const expiresAt = parsed?.expires_at
    if (!expiresAt) return true
    return (Date.now() / 1000) >= (expiresAt - 60)
  } catch {
    return true
  }
}

function limparToken() {
  localStorage.removeItem(SUPABASE_STORAGE_KEY)
  localStorage.removeItem('clv-auth')
  localStorage.removeItem('clv-auth-v2')
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [perfil,  setPerfil]  = useState(null)
  const [loading, setLoading] = useState(true)

  async function carregarPerfil(userId) {
    if (!userId) { setPerfil(null); return }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setPerfil(data || null)
    } catch {
      setPerfil(null)
    }
  }

  useEffect(() => {
    localStorage.removeItem('clv-auth')
    localStorage.removeItem('clv-auth-v2')

    async function iniciar() {
      // Token expirado — limpa e vai para login sem travar
      if (tokenEstaExpirado()) {
        limparToken()
        await supabase.auth.signOut().catch(() => {})
        setSession(null)
        setLoading(false)
        return
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          limparToken()
          setSession(null)
        } else {
          setSession(session)
          await carregarPerfil(session.user.id)
        }
      } catch {
        limparToken()
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    iniciar()

    // Listener APENAS para SIGNED_IN e SIGNED_OUT
    // TOKEN_REFRESHED é ignorado — não altera o estado de loading
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          setSession(session)
          if (session?.user?.id) await carregarPerfil(session.user.id)
          setLoading(false)
          return
        }
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setPerfil(null)
          setLoading(false)
          return
        }
        // TOKEN_REFRESHED, INITIAL_SESSION, etc — ignora completamente
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
    recarregarPerfil: () => carregarPerfil(session?.user?.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
