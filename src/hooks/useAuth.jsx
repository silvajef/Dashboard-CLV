import { useState, useEffect, useRef, createContext, useContext } from 'react'
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
  const inicializado = useRef(false) // evita que onAuthStateChange interfira no loading inicial

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

    // ── Listener de mudanças (login, logout, refresh de token) ──────────
    // Só atua APÓS a inicialização estar completa
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!inicializado.current) return // ignora eventos durante inicialização

        if (event === 'SIGNED_OUT') {
          setSession(null)
          setPerfil(null)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session)
          if (session?.user?.id) await carregarPerfil(session.user.id)
          return
        }
      }
    )

    // ── Inicialização: verifica sessão uma única vez ──────────────────
    async function iniciar() {
      // Token expirado — limpa e vai para login sem chamar getSession
      if (tokenEstaExpirado()) {
        limparToken()
        await supabase.auth.signOut().catch(() => {})
        setSession(null)
        setLoading(false)
        inicializado.current = true
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
        inicializado.current = true
      }
    }

    iniciar()

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