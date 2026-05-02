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
    // Adicione isso dentro da função iniciar(), ANTES do getSession:
async function iniciar() {
  // Limpa formato antigo de token se existir
  const temFormatoAntigo = localStorage.getItem('access_token')
  if (temFormatoAntigo) {
    localStorage.clear()
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    // ... resto do código

        setSession(session)
        await carregarPerfil(session?.user?.id)
      } catch {
        // Qualquer erro inesperado — limpa e manda para login
        localStorage.clear()
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    iniciar()

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
    localStorage.clear()
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