/**
 * Hook para gerenciar anúncios e integrações OAuth com plataformas externas.
 * Lida com o callback OAuth do ML lendo o hash da URL na montagem.
 *
 * @param {string} userId - auth.users.id do usuário logado
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import * as api from '../lib/api-anuncios'
import { getPlatforma } from '../lib/plataformas/index'
import { extrairTokenDaUrl } from '../lib/plataformas/mercadolivre'
import { trocarCodigoPorToken } from '../lib/plataformas/olx'

export function useAnuncios(userId) {
  const [anuncios,    setAnuncios]    = useState([])
  const [integracoes, setIntegracoes] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  const loadAll = useCallback(async () => {
    if (!userId) return
    try {
      const [a, i] = await Promise.all([api.getAnuncios(), api.getIntegracoes(userId)])
      setAnuncios(a)
      setIntegracoes(i)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Inscreve em mudanças em tempo real
  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel('anuncios_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anuncios' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadAll])

  // Processa callback OAuth do ML (hash na URL após redirecionamento)
  function processarCallbackML() {
    const token = extrairTokenDaUrl(window.location.hash)
    if (!token || !userId) return false

    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()
    api.upsertIntegracao({
      user_id:      userId,
      plataforma:   'mercadolivre',
      access_token: token.access_token,
      ml_user_id:   token.user_id,
      expires_at:   expiresAt,
    }).then(loadAll).catch(e => setError(e.message))

    window.history.replaceState(null, '', window.location.pathname)
    return true
  }

  // Processa callback OAuth da OLX (?code= na query string após redirecionamento)
  async function processarCallbackOLX() {
    const params = new URLSearchParams(window.location.search)

    // OLX retornou erro (ex: escopo inválido, usuário negou acesso)
    const erroOlx = params.get('error')
    if (erroOlx) {
      const desc = params.get('error_description') || erroOlx
      window.history.replaceState(null, '', window.location.pathname)
      setError(`OLX recusou a autorização: ${desc}`)
      return false
    }

    const code = params.get('code')
    if (!code || !userId) return false

    // Limpa ?code= imediatamente para não reprocessar em navegações futuras
    window.history.replaceState(null, '', window.location.pathname)

    try {
      const redirectUri = `${window.location.origin}/`
      const tokens      = await trocarCodigoPorToken(code, redirectUri)
      // OLX não retorna expires_in — token válido por 24h por convenção
      const expiresAt   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      await api.upsertIntegracao({
        user_id:       userId,
        plataforma:    'olx',
        access_token:  tokens.access_token,
        refresh_token: '',
        expires_at:    expiresAt,
      })
      await loadAll()
    } catch (e) {
      setError(`OLX OAuth: ${e.message}`)
    }
    return true
  }

  function integracaoPara(plataforma) {
    return integracoes.find(i => i.plataforma === plataforma) || null
  }

  function tokenValido(plataforma) {
    const integ = integracaoPara(plataforma)
    if (!integ?.access_token) return false
    if (!integ.expires_at)    return true
    return new Date(integ.expires_at) > new Date()
  }

  async function publicar(veiculo, plataforma, preco) {
    if (!tokenValido(plataforma)) {
      throw new Error(`Conecte sua conta ${plataforma} antes de publicar.`)
    }
    const { adaptador } = getPlatforma(plataforma)
    const integ          = integracaoPara(plataforma)
    const resultado      = await adaptador.publicarAnuncio(integ.access_token, veiculo, preco)

    const titulo = [veiculo.marca_nome, veiculo.modelo_nome || veiculo.modelo, veiculo.ano_modelo]
      .filter(Boolean).join(' ').trim()

    return api.upsertAnuncio({
      veiculo_id:      veiculo.id,
      plataforma,
      listing_id:      resultado.listing_id,
      url:             resultado.url,
      status:          'ativo',
      preco_anunciado: preco,
      titulo,
    })
  }

  async function pausar(anuncioId) {
    const anuncio = anuncios.find(a => a.id === anuncioId)
    if (!anuncio) throw new Error(`Anúncio "${anuncioId}" não encontrado.`)
    if (!tokenValido(anuncio.plataforma)) throw new Error(`Token de ${anuncio.plataforma} ausente ou expirado.`)

    const { adaptador } = getPlatforma(anuncio.plataforma)
    const integ          = integracaoPara(anuncio.plataforma)
    await adaptador.pausarAnuncio(integ.access_token, anuncio.listing_id)
    return api.upsertAnuncio({ ...anuncio, status: 'pausado' })
  }

  async function reativar(anuncioId) {
    const anuncio = anuncios.find(a => a.id === anuncioId)
    if (!anuncio) throw new Error(`Anúncio "${anuncioId}" não encontrado.`)
    if (!tokenValido(anuncio.plataforma)) throw new Error(`Token de ${anuncio.plataforma} ausente ou expirado.`)

    const { adaptador } = getPlatforma(anuncio.plataforma)
    const integ          = integracaoPara(anuncio.plataforma)
    await adaptador.reativarAnuncio(integ.access_token, anuncio.listing_id)
    return api.upsertAnuncio({ ...anuncio, status: 'ativo' })
  }

  async function fechar(anuncioId) {
    const anuncio = anuncios.find(a => a.id === anuncioId)
    if (!anuncio) throw new Error(`Anúncio "${anuncioId}" não encontrado.`)

    // Tenta fechar na plataforma; falha silenciosa (pode já estar fechado)
    if (tokenValido(anuncio.plataforma) && anuncio.listing_id) {
      const { adaptador } = getPlatforma(anuncio.plataforma)
      const integ          = integracaoPara(anuncio.plataforma)
      await adaptador.fecharAnuncio(integ.access_token, anuncio.listing_id).catch(() => {})
    }
    return api.deleteAnuncio(anuncioId)
  }

  function conectar(plataforma) {
    // Raiz do domínio como redirect URI — deve ser cadastrada EXATAMENTE assim
    // no painel de cada plataforma (ML Developers, OLX Developers, etc.)
    const redirectUri    = `${window.location.origin}/`
    const { adaptador }  = getPlatforma(plataforma)
    window.location.href = adaptador.construirUrlAutenticacao(redirectUri)
  }

  async function desconectar(plataforma) {
    await api.deleteIntegracao(userId, plataforma)
    setIntegracoes(prev => prev.filter(i => i.plataforma !== plataforma))
  }

  return {
    anuncios, integracoes, loading, error,
    publicar, pausar, reativar, fechar,
    conectar, desconectar,
    tokenValido, integracaoPara,
    processarCallbackML, processarCallbackOLX,
    reload: loadAll,
  }
}
