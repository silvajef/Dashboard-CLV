/**
 * src/lib/garantia.js
 *
 * Lógica pura de cálculo de garantia pós-venda.
 *
 * Independente de React, UI e Supabase.
 * Pode ser reutilizada em qualquer ferramenta futura
 * (notificações automáticas, relatórios, BI, app mobile).
 */

// ─── Configuração padrão ─────────────────────────────────────────────────────
export const GARANTIA_CONFIG = {
  DIAS_PADRAO:    90,   // Garantia legal CDC para produtos duráveis
  DIAS_VENCENDO:  30,   // Threshold para alertar "vencendo em breve"
}

// ─── Status possíveis ────────────────────────────────────────────────────────
export const STATUS_GARANTIA = {
  ATIVA:    'ativa',     // Dentro do prazo, com folga
  VENCENDO: 'vencendo',  // Restam menos de DIAS_VENCENDO
  VENCIDA:  'vencida',   // Já passou de garantia_fim
}

// ─── Severidade (usada para ordenação e cores na UI) ─────────────────────────
export const SEVERIDADE = {
  ALTA:  'alta',   // Vencendo (atenção urgente)
  MEDIA: 'media',  // Vencida recentemente (cliente pode reclamar)
  BAIXA: 'baixa',  // Ativa com folga
}

/**
 * calcularGarantia
 *
 * Calcula o status de garantia de uma única venda.
 *
 * @param {Object} venda — objeto com garantia_inicio, garantia_dias
 * @param {Date}   hoje  — data de referência (default: agora)
 * @returns {Object}     — venda enriquecida com status, dias restantes, severidade
 */
export function calcularGarantia(venda, hoje = new Date()) {
  if (!venda?.garantia_inicio) {
    return {
      ...venda,
      status: STATUS_GARANTIA.VENCIDA,
      diasRestantes: null,
      severidade: SEVERIDADE.MEDIA,
    }
  }

  const inicio = new Date(venda.garantia_inicio)
  const dias   = venda.garantia_dias || GARANTIA_CONFIG.DIAS_PADRAO
  const fim    = new Date(inicio)
  fim.setDate(fim.getDate() + dias)

  const diffMs        = fim - hoje
  const diasRestantes = Math.ceil(diffMs / 86_400_000)

  let status, severidade

  if (diasRestantes < 0) {
    status     = STATUS_GARANTIA.VENCIDA
    severidade = SEVERIDADE.MEDIA
  } else if (diasRestantes <= GARANTIA_CONFIG.DIAS_VENCENDO) {
    status     = STATUS_GARANTIA.VENCENDO
    severidade = SEVERIDADE.ALTA
  } else {
    status     = STATUS_GARANTIA.ATIVA
    severidade = SEVERIDADE.BAIXA
  }

  return {
    ...venda,
    garantiaFim:   fim,
    diasRestantes,
    status,
    severidade,
  }
}

/**
 * calcularGarantias
 * Aplica calcularGarantia em uma lista e retorna ordenado por severidade.
 */
export function calcularGarantias(vendas = [], hoje = new Date()) {
  return vendas
    .map(v => calcularGarantia(v, hoje))
    .sort(ordenarPorSeveridade)
}

/**
 * resumoGarantias
 * Agrega contagens por status — útil para dashboards e badges.
 */
export function resumoGarantias(vendasComGarantia) {
  return {
    total:    vendasComGarantia.length,
    ativas:   vendasComGarantia.filter(v => v.status === STATUS_GARANTIA.ATIVA).length,
    vencendo: vendasComGarantia.filter(v => v.status === STATUS_GARANTIA.VENCENDO).length,
    vencidas: vendasComGarantia.filter(v => v.status === STATUS_GARANTIA.VENCIDA).length,
  }
}

/**
 * formatarStatusGarantia
 * Converte status técnico em texto humano para a UI.
 */
export function formatarStatusGarantia(garantia) {
  if (!garantia) return ''
  switch (garantia.status) {
    case STATUS_GARANTIA.ATIVA:
      return `Ativa · ${garantia.diasRestantes} dia${garantia.diasRestantes !== 1 ? 's' : ''} restante${garantia.diasRestantes !== 1 ? 's' : ''}`
    case STATUS_GARANTIA.VENCENDO:
      return `Vencendo em ${garantia.diasRestantes} dia${garantia.diasRestantes !== 1 ? 's' : ''}`
    case STATUS_GARANTIA.VENCIDA:
      return `Vencida há ${Math.abs(garantia.diasRestantes)} dia${Math.abs(garantia.diasRestantes) !== 1 ? 's' : ''}`
    default:
      return ''
  }
}

// ─── Helper interno ───────────────────────────────────────────────────────────
function ordenarPorSeveridade(a, b) {
  const peso = { [SEVERIDADE.ALTA]: 3, [SEVERIDADE.MEDIA]: 2, [SEVERIDADE.BAIXA]: 1 }
  const diff = (peso[b.severidade] || 0) - (peso[a.severidade] || 0)
  if (diff !== 0) return diff
  // Empate: menor diasRestantes primeiro (mais urgente)
  return (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999)
}
