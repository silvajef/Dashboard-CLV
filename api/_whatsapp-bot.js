/**
 * Bot de triagem/qualificação via WhatsApp — server-only.
 * Faz perguntas fixas (script abaixo), usa Claude só pra EXTRAIR a resposta
 * em campos estruturados (não conversa, não negocia, não promete preço ou
 * disponibilidade). Assim que qualifica (ou se o lead pedir um humano, ou
 * a resposta não fizer sentido 2x seguidas), passa pro vendedor via
 * round-robin e para de mandar perguntas. Ver docs/CRM_SPEC_CLV_Dashboard.md.
 *
 * Toda transição de estado usa compare-and-swap sobre whatsapp_threads
 * (WHERE bot_pergunta_atual = X AND bot_tentativas_invalidas = Y, os valores
 * lidos no início do processamento) ANTES de enviar qualquer mensagem —
 * duas mensagens quase simultâneas do mesmo lead (comum no WhatsApp) não
 * viram perguntas duplicadas/fora de ordem: quem perde a corrida não envia
 * nada, a outra requisição concorrente já está cuidando do estado atual.
 */
import Anthropic from '@anthropic-ai/sdk'
import { admin } from './_supabaseAdmin.js'
import { enviarMensagem } from './_whatsapp-provider.js'
import { proximoResponsavel } from '../src/lib/roundRobin.js'

const anthropic = new Anthropic()
const MODELO_EXTRACAO = 'claude-haiku-4-5'
const MAX_TENTATIVAS_INVALIDAS = 2

const SAUDACAO = 'Olá! Vou te fazer algumas perguntas rápidas pra já te direcionar ao vendedor certo.'

const PERGUNTAS = [
  { campo: 'veiculo_interesse', texto: 'Qual veículo (marca/modelo) você tem interesse?' },
  { campo: 'orcamento_max',     texto: 'Qual valor máximo você pretende investir?' },
  { campo: 'prazo_compra',      texto: 'Em quanto tempo pretende comprar? (ex: essa semana, esse mês, só pesquisando)' },
]

const SCHEMA_EXTRACAO = {
  type: 'object',
  properties: {
    quer_falar_com_humano: { type: 'boolean', description: 'true se o lead pediu explicitamente pra falar com um vendedor/atendente/pessoa' },
    resposta_entendida:    { type: 'boolean', description: 'true se a mensagem responde à pergunta feita, mesmo que parcialmente' },
    valor_extraido:        { type: 'string',  description: 'a resposta em texto curto e limpo (ex: nome do modelo, valor só com dígitos, prazo em poucas palavras); vazio se resposta_entendida=false' },
  },
  required: ['quer_falar_com_humano', 'resposta_entendida', 'valor_extraido'],
  additionalProperties: false,
}

/** Pede à Claude pra classificar/extrair a resposta livre do lead — não gera texto pro lead. */
async function extrairResposta(pergunta, textoLivre) {
  const msg = await anthropic.messages.create({
    model: MODELO_EXTRACAO,
    max_tokens: 256,
    output_config: { format: { type: 'json_schema', schema: SCHEMA_EXTRACAO } },
    system: `Você extrai informação de respostas de WhatsApp de um lead de concessionária de veículos usados. A pergunta feita foi: "${pergunta.texto}". Extraia só o que foi perguntado — nunca converse com o lead nem gere uma resposta pra ele.`,
    messages: [{ role: 'user', content: textoLivre }],
  })
  const bloco = msg.content.find(b => b.type === 'text')
  if (!bloco) throw new Error('Resposta da Claude sem bloco de texto')
  return JSON.parse(bloco.text)
}

async function registrarAtividade(leadId, tipo, descricao, canal = 'whatsapp') {
  await admin.from('leads_atividades').insert({ lead_id: leadId, canal, tipo, usuario_id: null, descricao })
}

/**
 * Tenta aplicar `patch` em whatsapp_threads, mas só se o estado ainda for
 * exatamente o que foi lido no início do processamento (compare-and-swap).
 * @returns {Promise<boolean>} true se aplicou (ganhou a corrida), false se outra mensagem concorrente já mudou o estado
 */
async function tentarTransicao(threadState, patch) {
  const { data, error } = await admin
    .from('whatsapp_threads')
    .update(patch)
    .eq('id', threadState.id)
    .eq('bot_pergunta_atual', threadState.bot_pergunta_atual)
    .eq('bot_tentativas_invalidas', threadState.bot_tentativas_invalidas)
    .select('id')
    .maybeSingle()
  if (error) throw error
  return !!data
}

/** Escolhe o próximo vendedor (se o lead ainda não tiver um) via o mesmo round-robin da UI. */
async function atribuirResponsavel(lead) {
  if (lead.responsavel_id) return lead.responsavel_id
  const [{ data: vendedores }, { data: leadsAtivos }] = await Promise.all([
    admin.from('profiles').select('id, nome').eq('role', 'vendedor').eq('ativo', true).order('nome'),
    admin.from('leads').select('id, status, responsavel_id').not('status', 'in', '(ganho,perdido)'),
  ])
  return proximoResponsavel(vendedores || [], leadsAtivos || [])
}

/**
 * Encerra a triagem do bot: reivindica a transição de estado primeiro (CAS);
 * só atribui vendedor e resume as respostas se ganhou a corrida.
 */
async function handoff(lead, threadState, respostas, motivoEscalada) {
  const ganhou = await tentarTransicao(threadState, { bot_estado: 'aguardando_humano', bot_respostas: respostas })
  if (!ganhou) return

  const responsavelId = await atribuirResponsavel(lead)
  const resumo = Object.entries(respostas).map(([campo, valor]) => `${campo}: ${valor}`).join(' · ') || 'sem respostas capturadas'
  const descricao = motivoEscalada
    ? `${motivoEscalada} Respostas até aqui: ${resumo}`
    : `Qualificação via bot concluída. ${resumo}`

  const patchLead = { status: 'qualificado' }
  if (responsavelId && !lead.responsavel_id) patchLead.responsavel_id = responsavelId
  if (respostas.veiculo_interesse && !lead.veiculo_id) patchLead.veiculo_desejado_texto = respostas.veiculo_interesse
  const orcamento = respostas.orcamento_max ? Number(String(respostas.orcamento_max).replace(/\D/g, '')) : null
  if (orcamento) patchLead.valor_estimado = orcamento

  await admin.from('leads').update(patchLead).eq('id', lead.id)
  await registrarAtividade(lead.id, 'nota', descricao, 'sistema')
}

/**
 * Avança a máquina de estados do bot em resposta a UMA mensagem recebida.
 * Assume que a mensagem já foi gravada em leads_atividades pelo chamador.
 */
export async function processarMensagemBot({ lead, threadState, numero, texto }) {
  const perguntaIdx = threadState.bot_pergunta_atual

  if (perguntaIdx === 0) {
    if (!(await tentarTransicao(threadState, { bot_pergunta_atual: 1 }))) return
    const saudacaoMaisPergunta = `${SAUDACAO} ${PERGUNTAS[0].texto}`
    await enviarMensagem(numero, saudacaoMaisPergunta)
    await registrarAtividade(lead.id, 'mensagem_enviada', saudacaoMaisPergunta)
    return
  }

  const pergunta = PERGUNTAS[perguntaIdx - 1]
  if (!pergunta) return // estado inconsistente defensivo — não deveria acontecer com bot_estado='coletando'

  let extraido
  try {
    extraido = await extrairResposta(pergunta, texto)
  } catch (err) {
    console.log(JSON.stringify({ event: 'whatsapp_bot_claude_error', leadId: lead.id, error: String(err) }))
    extraido = { quer_falar_com_humano: false, resposta_entendida: false, valor_extraido: '' }
  }

  if (extraido.quer_falar_com_humano) {
    return handoff(lead, threadState, threadState.bot_respostas, `Lead pediu falar com humano (pergunta "${pergunta.campo}").`)
  }

  if (!extraido.resposta_entendida) {
    const tentativas = threadState.bot_tentativas_invalidas + 1
    if (tentativas >= MAX_TENTATIVAS_INVALIDAS) {
      return handoff(lead, threadState, threadState.bot_respostas, `Bot não entendeu a resposta após ${tentativas} tentativas (pergunta "${pergunta.campo}").`)
    }
    if (!(await tentarTransicao(threadState, { bot_tentativas_invalidas: tentativas }))) return
    const reenvio = `Desculpa, não entendi bem. ${pergunta.texto}`
    await enviarMensagem(numero, reenvio)
    await registrarAtividade(lead.id, 'mensagem_enviada', reenvio)
    return
  }

  const respostas = { ...threadState.bot_respostas, [pergunta.campo]: extraido.valor_extraido }
  const proxima = PERGUNTAS[perguntaIdx]

  if (!proxima) {
    return handoff(lead, threadState, respostas, null)
  }

  if (!(await tentarTransicao(threadState, {
    bot_pergunta_atual: perguntaIdx + 1, bot_respostas: respostas, bot_tentativas_invalidas: 0,
  }))) return
  await enviarMensagem(numero, proxima.texto)
  await registrarAtividade(lead.id, 'mensagem_enviada', proxima.texto)
}
