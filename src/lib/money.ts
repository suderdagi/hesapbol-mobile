/**
 * All amounts are stored as integer kuruş (1 TL = 100 kuruş).
 * Floating point numbers can't represent values like 0.1 exactly, and
 * 0.1 + 0.2 !== 0.3 would slowly corrupt balances.
 */
export type Kurus = number

// 12 or 12,50 or 12.50, optionally with spaces as thousands separators ("1 250,50").
// At most 9 digits before the decimal separator keeps every amount, and the sums of many
// of them, far below the largest integer a number can hold exactly.
const AMOUNT_PATTERN = /^(?:\d{1,9}|\d{1,3}(?:[  ]\d{3}){1,2})(?:[.,]\d{0,2})?$/

export function toKurus(input: string): Kurus | null {
  const text = input.trim()
  if (!AMOUNT_PATTERN.test(text)) return null
  const normalized = text.replace(/[  ]/g, '').replace(',', '.')
  return Math.round(Number(normalized) * 100)
}

const formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })

export function formatMoney(amount: Kurus): string {
  return formatter.format(amount / 100)
}

/** "1250" kuruş -> "12,50" for editing in a text field */
export function toInputValue(amount: Kurus): string {
  return (amount / 100).toFixed(2).replace('.', ',')
}
