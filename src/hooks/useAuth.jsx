import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

const SUPABASE_STORAGE_KEY = 'sb-kicsrbhzgfhullgacszb-auth-token'

/**
 * Lê o token direto do localStorage sem chamar getSession().
 * Bug do supabase-js: getSession() trava em cold start de aba.
 */
function lerSessaoDoStorage() {
  try {
    const raw = localStorage.getItem(SUPABASE_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.access_token || !parsed?.user) return null

    // Verifica se ainda é válido
    const expiresAt = parsed.expires_at
    if (!expiresAt || (Date.now() / 1000) >= (expiresAt - 60)) {
      return null // expirado
    }

    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: expiresAt,
      user: parsed.user,
    }
  } catch {
    return null
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

    // Lê sessão direto do localStorage — não chama getSession()
    const sessaoSalva = lerSessaoDoStorage()

    if (!sessaoSalva) {
      // Sem sessão válida — limpa qualquer resto e vai para login
      limparToken()
      setSession(null)
      setLoading(false)
    } else {
      // Sessão válida encontrada — usa direto sem aguardar Supabase
      setSession(sessaoSalva)
      setLoading(false)
      // Carrega perfil em background (não bloqueia a UI)
      carregarPerfil(sessaoSalva.user.id)
    }

    // Listener para mudanças (login, logout)
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
        // Outros eventos (TOKEN_REFRESHED, INITIAL_SESSION) são ignorados
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