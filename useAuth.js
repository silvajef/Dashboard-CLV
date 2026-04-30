import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

/**
 * useAuth() — acesso ao contexto de autenticação em qualquer componente.
 *
 * Retorna:
 *   session          — objeto de sessão Supabase (ou null)
 *   perfil           — linha da tabela profiles do usuário logado
 *   role             — 'admin' | 'operador' | 'visualizador' | null
 *   isAdmin          — boolean
 *   isOperador       — boolean
 *   podeEditar       — boolean (admin OU operador)
 *   loading          — boolean (true enquanto verifica sessão inicial)
 *   signOut          — função async
 *   recarregarPerfil — força reload do perfil (útil após editar o próprio nome)
 */
export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = ainda verificando
  const [perfil,  setPerfil]  = useState(null)
  const [loading, setLoading] = useState(true)

  async function carregarPerfil(userId) {
    if (!userId) { setPerfil(null); return }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setPerfil(data || null)
  }

  useEffect(() => {
    // Verifica sessão existente ao montar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      await carregarPerfil(session?.user?.id)
      setLoading(false)
    })

    // Escuta mudanças (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        await carregarPerfil(session?.user?.id)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  const role       = perfil?.role || null
  const isAdmin    = role === 'admin'
  const isOperador = role === 'operador'
  const podeEditar = isAdmin || isOperador

  const value = {
    session,
    perfil,
    role,
    isAdmin,
    isOperador,
    podeEditar,
    loading,
    signOut,
    recarregarPerfil: () => carregarPerfil(session?.user?.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
