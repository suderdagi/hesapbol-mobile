import type { Kurus } from './money'
import type { Share } from './types'

/**
 * Splits an amount equally. Kuruş that can't be divided evenly go to the first members,
 * so 100 kuruş between 3 people becomes 34 + 33 + 33 and the total is always exact.
 */
export function splitEqually(amount: Kurus, memberIds: string[]): Share[] {
  if (memberIds.length === 0) return []
  const base = Math.floor(amount / memberIds.length)
  const remainder = amount - base * memberIds.length

  return memberIds.map((memberId, index) => ({
    memberId,
    amount: base + (index < remainder ? 1 : 0),
  }))
}

export type SplitValidation = { ok: true } | { ok: false; message: string }

export function validateShares(amount: Kurus, shares: Share[]): SplitValidation {
  if (amount <= 0) return { ok: false, message: 'Enter an amount greater than zero' }
  if (shares.length === 0) return { ok: false, message: 'Choose at least one person to split with' }
  if (shares.some((s) => s.amount < 0)) return { ok: false, message: 'Shares cannot be negative' }

  const total = shares.reduce((sum, s) => sum + s.amount, 0)
  if (total !== amount) {
    const diff = amount - total
    return {
      ok: false,
      message: diff > 0 ? `${(diff / 100).toFixed(2)} TL is not assigned yet` : `Shares are ${(-diff / 100).toFixed(2)} TL over the total`,
    }
  }
  return { ok: true }
}
