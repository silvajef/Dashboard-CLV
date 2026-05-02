import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// Chave padrão do Supabase para salvar sessão no localStorage
const SUPABASE_STORAGE_KEY = `sb-${
  import.meta.env.VITE_SUPABASE_URL?.split('//')?.[1]?.split('.')?.[0]
}-auth-token`

function tokenEstaExpirado() {
  try {
    const raw = localStorage.getItem(SUPABASE_STORAGE_KEY)
    if (!raw) return false // sem token salvo — sem problema
    const parsed = JSON.parse(raw)
    const expiresAt = parsed?.expires_at
    if (!expiresAt) return true // sem data de expiração = inválido
    // Expira se o tempo atual >= expires_at (com 60s de margem)
    return (Date.now() / 1000) >= (expiresAt - 60)
  } catch {
    return true // token corrompido = tratar como expirado
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
    // Remove chaves legadas de versões anteriores
    localStorage.removeItem('clv-auth')
    localStorage.removeItem('clv-auth-v2')

    async function iniciar() {
      // Intercepta token expirado ANTES de chamar getSession
      // Bug do supabase-js: getSession trava se refresh_token for inválido
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
          setLoading(false)
          return
        }
        setSession(session)
        await carregarPerfil(session.user.id)
      } catch {
        limparToken()
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    iniciar()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user?.id) await carregarPerfil(session.user.id)
        else setPerfil(null)
        setLoading(false)
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