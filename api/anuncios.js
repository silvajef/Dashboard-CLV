/**
 * POST|GET /api/anuncios?acao=<acao> — ponto único de entrada das ações de
 * anúncios. O plano Hobby da Vercel aceita no máximo 12 funções por deploy
 * (o preview da branch falhou com exceeded_serverless_functions_per_deployment
 * quando eram 9 arquivos api/anuncios-*.js), então os handlers vivem em
 * api/_anuncios-acoes/ (pasta com "_" não vira função) e esta função despacha.
 *
 * As URLs antigas (/api/anuncios-publicar, /api/anuncios-ml-webhook…) seguem
 * valendo pelo rewrite em vercel.json — front, runbook e webhooks não mudam.
 * Ex.: POST /api/anuncios-publicar → /api/anuncios?acao=publicar
 */
import facebookFeed        from './_anuncios-acoes/facebook-feed.js'
import facebookSetup       from './_anuncios-acoes/facebook-setup.js'
import mlWebhook           from './_anuncios-acoes/ml-webhook.js'
import olxConfigurarLeads  from './_anuncios-acoes/olx-configurar-leads.js'
import publicar            from './_anuncios-acoes/publicar.js'
import status              from './_anuncios-acoes/status.js'
import token               from './_anuncios-acoes/token.js'
import transicao           from './_anuncios-acoes/transicao.js'
import vendido             from './_anuncios-acoes/vendido.js'

const ACOES = {
  'facebook-feed':        facebookFeed,
  'facebook-setup':       facebookSetup,
  'ml-webhook':           mlWebhook,
  'olx-configurar-leads': olxConfigurarLeads,
  'publicar':             publicar,
  'status':               status,
  'token':                token,
  'transicao':            transicao,
  'vendido':              vendido,
}

export default async function handler(req, res) {
  const acao = req.query?.acao
  const executar = Object.hasOwn(ACOES, acao) ? ACOES[acao] : null
  if (!executar) {
    return res.status(404).json({
      error: `Ação de anúncios desconhecida: ${JSON.stringify(acao)}; esperado uma de: ${Object.keys(ACOES).join(', ')}`,
    })
  }
  return executar(req, res)
}
