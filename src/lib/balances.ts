import type { Kurus } from './money'
import type { Group } from './types'

/**
 * Net balance per member: positive means others owe them money,
 * negative means they owe money. The balances of a group always add up to zero.
 */
export function computeBalances(group: Pick<Group, 'members' | 'expenses' | 'settlements'>): Map<string, Kurus> {
  const balances = new Map<string, Kurus>(group.members.map((m) => [m.id, 0]))
  const add = (memberId: string, amount: Kurus) => balances.set(memberId, (balances.get(memberId) ?? 0) + amount)

  for (const expense of group.expenses) {
    add(expense.paidBy, expense.amount)
    for (const share of expense.shares) add(share.memberId, -share.amount)
  }

  // Paying someone back moves the payer towards zero and the receiver too
  for (const s of group.settlements) {
    add(s.from, s.amount)
    add(s.to, -s.amount)
  }

  return balances
}

export interface Transfer {
  from: string
  to: string
  amount: Kurus
}

/**
 * Suggests payments that settle all debts.
 *
 * Greedy approach: repeatedly let the person who owes the most pay the person who is owed
 * the most, as much as possible. Each step brings at least one person to zero, so a group of
 * n people needs at most n - 1 payments instead of one payment per expense.
 */
export function simplifyDebts(balances: Map<string, Kurus>): Transfer[] {
  const debtors = [...balances].filter(([, b]) => b < 0).map(([id, b]) => ({ id, amount: -b }))
  const creditors = [...balances].filter(([, b]) => b > 0).map(([id, b]) => ({ id, amount: b }))
  const transfers: Transfer[] = []

  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.amount - a.amount)
    creditors.sort((a, b) => b.amount - a.amount)

    const debtor = debtors[0]
    const creditor = creditors[0]
    const amount = Math.min(debtor.amount, creditor.amount)

    transfers.push({ from: debtor.id, to: creditor.id, amount })
    debtor.amount -= amount
    creditor.amount -= amount

    if (debtor.amount === 0) debtors.shift()
    if (creditor.amount === 0) creditors.shift()
  }

  return transfers
}

/** Total spent by the group, settlements excluded */
export const totalSpent = (group: Pick<Group, 'expenses'>): Kurus =>
  group.expenses.reduce((sum, e) => sum + e.amount, 0)
