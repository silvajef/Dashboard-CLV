/**
 * Hook de anúncios — publicação em ML/OLX e status de conexão (incl.
 * Facebook, feed-based). Diferente da versão anterior: o token OAuth
 * NUNCA passa por aqui — este hook só troca ?code= por status via
 * api/anuncios-token.js e chama os endpoints de publicação, que resolvem
 * o token cifrado no servidor.
 *
 * @param {string} userId - auth.users.id do usuário logado
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import * as api from '../lib/api-anuncios'
import { getAdaptadorOAuth } from '../lib/plataformas/adaptadores'

export function useAnuncios(userId) {
  const [anuncios, setAnuncios] = useState([])
  const [statusIntegracoes, setStatusIntegracoes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    if (!userId) return
    try {
      const [a, s] = await Promise.all([api.getAnuncios(), api.getStatusIntegracoes()])
      setAnuncios(a)
      setStatusIntegracoes(s)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel('anuncios_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anuncios' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadAll])

  /**
   * Processa o retorno OAuth (?code=&state=) quando userId está disponível.
   * A plataforma vem do prefixo de ?state= (ml: ou olx:). Limpa a query
   * string após processar para evitar reprocessamento em refresh.
   */
  async function processarCallbackOAuth() {
    const params = new URLSearchParams(window.location.search)

    const erro = params.get('error')
    if (erro) {
      window.history.replaceState(null, '', window.location.pathname)
      setError(`Autorização recusada: ${params.get('error_description') || erro}`)
      return false
    }

    const code  = params.get('code')
    const state = params.get('state') || ''
    if (!code || !userId) return false

    window.history.replaceState(null, '', window.location.pathname)
    const plataforma = state.startsWith('ml:') ? 'mercadolivre' : 'olx'

    try {
      await api.trocarCodigoPorToken(plataforma, code, `${window.location.origin}/`)
      await loadAll()
    } catch (e) {
      setError(`${plataforma}: ${e.message}`)
    }
    return true
  }

  function conectar(plataforma) {
    const redirectUri = `${window.location.origin}/`
    window.location.href = getAdaptadorOAuth(plataforma).construirUrlAutenticacao(redirectUri)
  }

  async function publicar(veiculoId, plataforma, dados) {
    await api.publicarAnuncio(veiculoId, plataforma, dados)
    await loadAll()
  }

  async function pausar(anuncioId)   { await api.transicaoAnuncio(anuncioId, 'pausar');   await loadAll() }
  async function reativar(anuncioId) { await api.transicaoAnuncio(anuncioId, 'reativar'); await loadAll() }
  async function fechar(anuncioId)   { await api.transicaoAnuncio(anuncioId, 'fechar');   await loadAll() }

  async function configurarLeadsOlx() {
    await api.configurarLeadsOlx()
    await loadAll()
  }

  async function gerarFeedFacebook() {
    const resultado = await api.gerarFeedTokenFacebook()
    await loadAll()
    return resultado
  }

  async function confirmarFacebook() {
    await api.confirmarVerificacaoFacebook()
    await loadAll()
  }

  function anunciosDoVeiculo(veiculoId) {
    return anuncios.filter(a => a.veiculo_id === veiculoId)
  }

  return {
    anuncios, statusIntegracoes, loading, error,
    conectar, publicar, pausar, reativar, fechar,
    gerarFeedFacebook, confirmarFacebook, configurarLeadsOlx,
    processarCallbackOAuth, anunciosDoVeiculo,
    reload: loadAll,
  }
}
