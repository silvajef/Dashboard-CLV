import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

const SUPABASE_STORAGE_KEY = 'sb-kicsrbhzgfhullgacszb-auth-token'
const log = (...args) => console.log('[AUTH]', ...args)

function tokenEstaExpirado() {
  try {
    const raw = localStorage.getItem(SUPABASE_STORAGE_KEY)
    if (!raw) { log('token: ausente'); return false }
    const parsed = JSON.parse(raw)
    const expiresAt = parsed?.expires_at
    if (!expiresAt) { log('token: sem expires_at'); return true }
    const expirou = (Date.now() / 1000) >= (expiresAt - 60)
    log('token expira em', new Date(expiresAt * 1000).toLocaleString(), '— expirou?', expirou)
    return expirou
  } catch (e) {
    log('erro ao parsear token:', e.message)
    return true
  }
}

function limparToken() {
  log('limpando tokens')
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
    log('carregando perfil para', userId)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) log('erro perfil:', error.message)
      else log('perfil carregado:', data?.role)
      setPerfil(data || null)
    } catch (e) {
      log('exception perfil:', e.message)
      setPerfil(null)
    }
  }

  useEffect(() => {
    log('AuthProvider mount')
    localStorage.removeItem('clv-auth')
    localStorage.removeItem('clv-auth-v2')

    async function iniciar() {
      log('iniciar() executando')

      if (tokenEstaExpirado()) {
        log('token expirado — indo para login')
        limparToken()
        await supabase.auth.signOut().catch(() => {})
        setSession(null)
        setLoading(false)
        log('FIM iniciar() via expirado')
        return
      }

      log('chamando getSession()...')
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        log('getSession() retornou. session?', !!session, 'error?', error?.message)
        if (error || !session) {
          limparToken()
          setSession(null)
        } else {
          setSession(session)
          await carregarPerfil(session.user.id)
        }
      } catch (e) {
        log('getSession() throw:', e.message)
        limparToken()
        setSession(null)
      } finally {
        setLoading(false)
        log('FIM iniciar() — loading=false')
      }
    }

    iniciar()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        log('onAuthStateChange:', event, 'session?', !!session)
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