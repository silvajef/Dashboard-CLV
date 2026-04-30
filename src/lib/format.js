/**
 * Dashboard CLV — Formatação de campos
 * - Moeda BRL com separação automática de casas decimais
 * - UPPER CASE automático
 */

// Converte número para string BRL "1.250,00"
export function numToMoeda(valor) {
  if (!valor && valor !== 0) return ''
  const num = typeof valor === 'string' ? parseFloat(valor) : valor
  if (isNaN(num)) return ''
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Converte string digitada "125000" → 1250.00 (divide por 100 à medida que digita)
export function moedaToNum(str) {
  if (!str) return 0
  // Remove tudo que não é dígito
  const digits = str.replace(/\D/g, '')
  if (!digits) return 0
  // Últimos 2 dígitos são centavos
  const num = parseInt(digits, 10) / 100
  return num
}

// Formata enquanto digita: "12500" → "125,00" → "1.250,00"
export function formatMoedaInput(str) {
  if (!str && str !== 0) return ''
  const digits = String(str).replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Extrai número puro da string formatada "1.250,00" → 1250
export function parseMoeda(str) {
  if (!str && str !== 0) return 0
  if (typeof str === 'number') return str
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0
}

// Extrai valor numérico do retorno FIPE "R$ 85.000,00" → 85000
export function parseFipeValor(str = '') {
  if (!str) return 0
  return parseFloat(str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0
}

// UPPER CASE seguro (mantém números/símbolos)
export const toUpper = (v) => (v || '').toUpperCase()
