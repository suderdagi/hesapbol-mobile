/**
 * All amounts are stored as integer kuruş (1 TL = 100 kuruş).
 * Floating point numbers can't represent values like 0.1 exactly, and
 * 0.1 + 0.2 !== 0.3 would slowly corrupt balances.
 */
export type Kurus = number

export function toKurus(input: string): Kurus | null {
  // Accept both "12,50" (Turkish) and "12.50"
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null
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
