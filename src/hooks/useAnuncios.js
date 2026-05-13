/**
 * Hook para gerenciar anúncios e integrações OAuth com plataformas externas.
 * ML e OLX usam Authorization Code Flow — ambos retornam ?code= na query string.
 * A plataforma de origem é identificada pelo prefixo do parâmetro ?state=
 * (ex: "ml:uuid" ou "olx:uuid").
 *
 * @param {string} userId - auth.users.id do usuário logado
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import * as api from '../lib/api-anuncios'
import { getPlatforma } from '../lib/plataformas/index'
import { trocarCodigoPorToken as mlTrocarToken  } from '../lib/plataformas/mercadolivre'
import { trocarCodigoPorToken as olxTrocarToken } from '../lib/plataformas/olx'

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

  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel('anuncios_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anuncios' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadAll])

  /**
   * Processa callback OAuth quando userId está disponível.
   * Identifica a plataforma pelo prefixo do ?state= (ml: ou olx:).
   * Limpa a query string após processar para evitar reprocessamento.
   */
  async function processarCallbackOAuth() {
    const params = new URLSearchParams(window.location.search)

    const erro = params.get('error')
    if (erro) {
      const desc = params.get('error_description') || erro
      window.history.replaceState(null, '', window.location.pathname)
      setError(`Autorização recusada: ${desc}`)
      return false
    }

    const code  = params.get('code')
    const state = params.get('state') || ''
    if (!code || !userId) return false

    window.history.replaceState(null, '', window.location.pathname)

    const redirectUri  = `${window.location.origin}/`
    const plataforma   = state.startsWith('ml:') ? 'mercadolivre' : 'olx'

    try {
      if (plataforma === 'mercadolivre') {
        const tokens    = await mlTrocarToken(code, redirectUri)
        const expiresAt = new Date(Date.now() + (tokens.expires_in || 21600) * 1000).toISOString()
        await api.upsertIntegracao({
          user_id:       userId,
          plataforma:    'mercadolivre',
          access_token:  tokens.access_token,
          refresh_token: tokens.refresh_token || '',
          expires_at:    expiresAt,
        })
      } else {
        const tokens    = await olxTrocarToken(code, redirectUri)
        // OLX não retorna expires_in — validade assumida de 24h
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        await api.upsertIntegracao({
          user_id:       userId,
          plataforma:    'olx',
          access_token:  tokens.access_token,
          refresh_token: '',
          expires_at:    expiresAt,
        })
      }
      await loadAll()
    } catch (e) {
      setError(`${plataforma} OAuth: ${e.message}`)
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

  async function publicar(veiculo, plataforma, dados) {
    if (!tokenValido(plataforma)) {
      throw new Error(`Conecte sua conta ${plataforma} antes de publicar.`)
    }
    const { adaptador } = getPlatforma(plataforma)
    const integ          = integracaoPara(plataforma)
    const resultado      = await adaptador.publicarAnuncio(integ.access_token, veiculo, dados)

    const titulo = [veiculo.marca_nome, veiculo.modelo_nome || veiculo.modelo, veiculo.ano_modelo]
      .filter(Boolean).join(' ').trim()

    return api.upsertAnuncio({
      veiculo_id:      veiculo.id,
      plataforma,
      listing_id:      resultado.listing_id,
      url:             resultado.url,
      status:          'ativo',
      preco_anunciado: dados.preco,
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

    if (tokenValido(anuncio.plataforma) && anuncio.listing_id) {
      const { adaptador } = getPlatforma(anuncio.plataforma)
      const integ          = integracaoPara(anuncio.plataforma)
      await adaptador.fecharAnuncio(integ.access_token, anuncio.listing_id).catch(() => {})
    }
    return api.deleteAnuncio(anuncioId)
  }

  function conectar(plataforma) {
    const redirectUri    = `${window.location.origin}/`
    const { adaptador }  = getPlatforma(plataforma)
    window.location.href = adaptador.construirUrlAutenticacao(redirectUri)
  }

  async function desconectar(plataforma) {
    await api.deleteIntegracao(userId, plataforma)
    setIntegracoes(prev => prev.filter(i => i.plataforma !== plataforma))
  }

  /**
   * Registra webhook de leads OLX no Autoservice e persiste o token na integração.
   * Gera webhook_token único por integração (reutiliza se já existir).
   * Requer que o usuário tenha re-autorizado com scope autoservice.
   */
  /**
   * Registra webhook de leads OLX no Autoservice e persiste token + config_id.
   * Conforme docs OLX: POST /autoservice/v1/lead aceita { url, token }.
   * O id da configuração é retornado pela OLX e armazenado para PUT/DELETE futuros.
   * A URL do webhook é limpa (/api/olx-webhook) — o token vai apenas no body do registro.
   * A OLX envia esse token em Authorization: Bearer ao chamar nosso endpoint.
   */
  async function configurarLeadsOLX() {
    if (!tokenValido('olx')) throw new Error('Conecte a conta OLX primeiro.')
    const integ = integracaoPara('olx')

    const webhookToken = integ.webhook_token || crypto.randomUUID()
    const webhookUrl   = `${window.location.origin}/api/olx-webhook`

    const res  = await fetch('/api/olx-leads-config', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        access_token:  integ.access_token,
        webhook_url:   webhookUrl,
        webhook_token: webhookToken,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Erro ${res.status} ao configurar leads OLX`)

    // OLX retorna { id, url, token } — persistimos o id para atualizações futuras
    const configId = json.id || integ.webhook_config_id || ''
    await api.salvarWebhookToken(userId, 'olx', { token: webhookToken, configId })
    await loadAll()
  }

  return {
    anuncios, integracoes, loading, error,
    publicar, pausar, reativar, fechar,
    conectar, desconectar,
    tokenValido, integracaoPara,
    processarCallbackOAuth,
    configurarLeadsOLX,
    reload: loadAll,
  }
}
