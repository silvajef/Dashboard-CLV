/**
 * Config de status e tipos de atividade do CRM de leads.
 * (A camada de anúncios/OAuth foi removida — restam só os contratos de lead.)
 */

/** @typedef {'novo'|'contato'|'qualificado'|'visita'|'proposta'|'negociacao'|'ganho'|'perdido'} StatusLead */

export const STATUS_LEAD_CFG = {
  novo:        { label: 'Novo Lead',    color: '#4f8ef7' },
  contato:     { label: 'Em Contato',   color: '#f59e0b' },
  qualificado: { label: 'Qualificado',  color: '#22d4dd' },
  visita:      { label: 'Visita',       color: '#a78bfa' },
  proposta:    { label: 'Proposta',     color: '#fb923c' },
  negociacao:  { label: 'Negociação',   color: '#f4485e' },
  ganho:       { label: 'Ganho',        color: '#22d3a0' },
  perdido:     { label: 'Perdido',      color: '#636b85' },
}

/** Motivos de perda — vira campo obrigatório na UI quando status='perdido'. */
export const MOTIVOS_PERDA = [
  'Preço',
  'Financiamento reprovado',
  'Comprou concorrente',
  'Desistiu da compra',
  'Sem veículo compatível em estoque',
  'Sem resposta',
  'Outro',
]

export const TIPOS_ATIVIDADE = [
  { value: 'mensagem',    label: 'Mensagem'    },
  { value: 'ligacao',     label: 'Ligação'     },
  { value: 'visita',      label: 'Visita'      },
  { value: 'proposta',    label: 'Proposta'    },
  { value: 'agendamento', label: 'Agendamento' },
  { value: 'nota',        label: 'Nota'        },
]
