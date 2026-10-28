/**
 * Regras de preenchimento do formulário de veículo (ModalVeiculo), sem UI —
 * para o resumo de pendências por seção e para o rodapé fixo.
 */

export const SECOES_VEICULO = [
  { id: 'identificacao', label: 'Identificação' },
  { id: 'valores',       label: 'Valores'       },
  { id: 'origem',        label: 'Origem'        },
  { id: 'fotos',         label: 'Fotos'         },
]

const vazio = v => !String(v ?? '').trim()

/**
 * pendenciasVeiculo — o que falta em cada seção. `essenciais` alimentam os
 * cálculos (sem valor de compra não há lucro nem preço sugerido); as demais
 * são só recomendadas. Não bloqueia o salvar: cadastro parcial é permitido.
 * Ex.: pendenciasVeiculo({ placa: 'ABC1234', valor_compra: 0 }, [])
 *      → { identificacao: ['marca / modelo / ano', 'data de entrada'], valores: ['valor de compra'], … }
 */
export function pendenciasVeiculo(f, fotos = []) {
  return {
    identificacao: [
      vazio(f.placa) && 'placa',
      (vazio(f.marca_nome) || vazio(f.modelo_nome) || vazio(f.ano_modelo)) && 'marca / modelo / ano',
      vazio(f.data_entrada) && 'data de entrada',
    ].filter(Boolean),
    valores: [!(Number(f.valor_compra) > 0) && 'valor de compra'].filter(Boolean),
    origem:  [vazio(f.fornecedor_nome) && 'nome do vendedor'].filter(Boolean),
    fotos:   [fotos.length === 0 && 'nenhuma foto'].filter(Boolean),
  }
}

/** Seções cuja pendência afeta cálculos — destacadas em vermelho/âmbar na UI. */
export const SECOES_ESSENCIAIS = ['identificacao', 'valores']

/**
 * resumoPendencias — lista plana das pendências essenciais, para o rodapé.
 * Ex.: resumoPendencias({ identificacao: [], valores: ['valor de compra'], origem: ['…'] }) → ['valor de compra']
 */
export function resumoPendencias(pendencias) {
  return SECOES_ESSENCIAIS.flatMap(id => pendencias[id] || [])
}
