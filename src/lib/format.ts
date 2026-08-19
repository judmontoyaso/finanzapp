/**
 * Utilidades de formateo numérico y de moneda para toda la aplicación.
 * Garantiza el separador de miles con punto (.) en TODO número >= 1.000
 * y la coma (,) para los decimales (ej. 8.500,00 o 2.000.000,00).
 */

export function formatCurrency(
  amount: number | string | null | undefined,
  options?: {
    showSign?: boolean
    type?: 'income' | 'expense'
    decimals?: number
    hideSymbol?: boolean
  }
): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0').replace(/[^\d.-]/g, '')) || 0
  const isNegative = num < 0
  const absVal = Math.abs(num)
  const decimals = options?.decimals !== undefined ? options.decimals : 2

  const fixed = absVal.toFixed(decimals)
  const parts = fixed.split('.')
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decimalPart = parts[1]

  const formattedNum = decimals > 0 ? `${integerPart},${decimalPart}` : integerPart
  const symbol = options?.hideSymbol ? '' : '$'

  if (options?.type === 'income') return `+${symbol}${formattedNum}`
  if (options?.type === 'expense') return `-${symbol}${formattedNum}`
  if (options?.showSign && isNegative) return `-${symbol}${formattedNum}`
  if (options?.showSign && !isNegative) return `+${symbol}${formattedNum}`
  if (isNegative) return `-${symbol}${formattedNum}`
  return `${symbol}${formattedNum}`
}

export function formatAmount(amount: number | string | null | undefined, decimals = 2): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0').replace(/[^\d.-]/g, '')) || 0
  const absVal = Math.abs(num)
  const fixed = absVal.toFixed(decimals)
  const parts = fixed.split('.')
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decimalPart = parts[1]
  return decimals > 0 ? `${integerPart},${decimalPart}` : integerPart
}
