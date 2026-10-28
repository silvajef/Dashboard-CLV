/**
 * Camada de dados — anúncios (Supabase direto, RLS por papel) e chamadas
 * finas aos endpoints privilegiados de OAuth/publicação. Diferente da
 * versão anterior desta feature: NUNCA lê/escreve `integracoes` direto —
 * essa tabela só existe pro service-role (ver migration
 * 20260831190000_anuncios_integracoes.sql e skill oauth-integrations).
 */
import { supabase } from './supabase'
import { chamarApiAutenticada } from './apiCliente'

/* ── Anúncios (leitura direta — sem segredo nenhum nesta tabela) ────────── */

export async function getAnuncios() {
  const { data, error } = await supabase
    .from('anuncios')
    .select('*, veiculo:veiculos(id, placa, modelo, marca_nome, modelo_nome, ano_modelo, status)')
    .order('atualizado_em', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getAnunciosByVeiculo(veiculoId) {
  const { data, error } = await supabase.from('anuncios').select('*').eq('veiculo_id', veiculoId)
  if (error) throw error
  return data || []
}

/* ── Status de conexão (nunca tokens) ────────────────────────────────────── */

export function getStatusIntegracoes() {
  return chamarApiAutenticada('anuncios-status', {})
}

/* ── OAuth: troca de code por token acontece no servidor ─────────────────── */

export function trocarCodigoPorToken(plataforma, code, redirectUri) {
  return chamarApiAutenticada('anuncios-token', { plataforma, code, redirect_uri: redirectUri })
}

/* ── Publicação/transição — todas rodam server-side com o token cifrado ──── */

export function publicarAnuncio(veiculoId, plataforma, dados) {
  return chamarApiAutenticada('anuncios-publicar', { veiculo_id: veiculoId, plataforma, dados })
}

export function transicaoAnuncio(anuncioId, acao) {
  return chamarApiAutenticada('anuncios-transicao', { anuncio_id: anuncioId, acao })
}

/** Registra o webhook de leads no OLX Autoservice (uma vez, após conectar). */
export function configurarLeadsOlx() {
  return chamarApiAutenticada('anuncios-olx-configurar-leads', {})
}

/** Chamado após um veículo virar 'vendido' — encerra anúncios ativos/pausados nas plataformas conectadas. */
export function encerrarAnunciosDoVeiculo(veiculoId) {
  return chamarApiAutenticada('anuncios-vendido', { veiculo_id: veiculoId })
}

/* ── Facebook (feed de catálogo, não-OAuth) ───────────────────────────────── */

export function gerarFeedTokenFacebook() {
  return chamarApiAutenticada('anuncios-facebook-setup', { acao: 'gerar_token' })
}

export function confirmarVerificacaoFacebook() {
  return chamarApiAutenticada('anuncios-facebook-setup', { acao: 'confirmar_verificacao' })
}
