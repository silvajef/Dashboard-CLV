/**
 * Config de status e tipos de atividade do CRM de leads.
 * (A camada de anúncios/OAuth foi removida — restam só os contratos de lead.)
 */

/** @typedef {'novo'|'contato'|'visita'|'proposta'|'ganho'|'perdido'} StatusLead */

export const STATUS_LEAD_CFG = {
  novo:     { label: 'Novo Lead',   color: '#4f8ef7' },
  contato:  { label: 'Em Contato',  color: '#f59e0b' },
  visita:   { label: 'Visita',      color: '#a78bfa' },
  proposta: { label: 'Proposta',    color: '#fb923c' },
  ganho:    { label: 'Ganho',       color: '#22d3a0' },
  perdido:  { label: 'Perdido',     color: '#636b85' },
}

export const TIPOS_ATIVIDADE = [
  { value: 'mensagem', label: 'Mensagem'  },
  { value: 'ligacao',  label: 'Ligação'   },
  { value: 'visita',   label: 'Visita'    },
  { value: 'proposta', label: 'Proposta'  },
  { value: 'nota',     label: 'Nota'      },
]
