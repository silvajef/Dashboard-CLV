import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
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

    let finalizado = false

    function finalizar(sess) {
      if (finalizado) return
      finalizado = true
      setSession(sess)
      setLoading(false)
    }

    // Timeout absoluto — libera em 4s independente do que aconteça
    const timeout = setTimeout(() => {
      finalizar(null)
    }, 4000)

    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        clearTimeout(timeout)
        if (error || !session) {
          finalizar(null)
          return
        }
        await carregarPerfil(session.user.id)
        finalizar(session)
      })
      .catch(() => {
        clearTimeout(timeout)
        finalizar(null)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        clearTimeout(timeout)
        setSession(session)
        if (session?.user?.id) await carregarPerfil(session.user.id)
        else setPerfil(null)
        setLoading(false)
        finalizado = true
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    localStorage.removeItem('clv-auth')
    localStorage.removeItem('clv-auth-v2')
    await supabase.auth.signOut()
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
