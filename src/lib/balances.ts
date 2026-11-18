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

interface Person {
  id: string
  amount: Kurus
}

/** The exact search below takes about n * 2^n steps, so bigger groups use the simple method only */
export const EXACT_LIMIT = 16

/**
 * Suggests payments that settle all debts, using as few payments as possible.
 *
 * A group of k people whose balances add up to zero (and that has no smaller such group inside)
 * needs exactly k - 1 payments. So the fewest payments overall is
 * "people with an open balance" minus "the most groups that can settle among themselves".
 * Up to EXACT_LIMIT people we search for that split. Beyond it everyone is treated as one
 * group, which still needs at most n - 1 payments but is not always the minimum.
 */
export function simplifyDebts(balances: Map<string, Kurus>): Transfer[] {
  const open = [...balances].filter(([, balance]) => balance !== 0).map(([id, amount]) => ({ id, amount }))
  const groups = open.length <= EXACT_LIMIT ? splitIntoSettledGroups(open) : [open]
  return groups.flatMap(settleGroup)
}

/**
 * Splits people into the largest number of groups whose balances add up to zero on their own.
 *
 * Picture everyone standing in a line and cut it wherever the running total comes back to zero:
 * every piece settles among itself. best[mask] is the most cuts any line-up of the people in
 * `mask` can have. It is built by choosing who stands last, and the choice is remembered in last[mask].
 */
function splitIntoSettledGroups(people: Person[]): Person[][] {
  const n = people.length
  const size = 1 << n
  const total = new Float64Array(size) // sum of the balances in each subset
  const best = new Uint8Array(size)
  const last = new Uint8Array(size)

  for (let mask = 1; mask < size; mask++) {
    const lowest = mask & -mask
    total[mask] = total[mask ^ lowest] + people[31 - Math.clz32(lowest)].amount

    let bestBefore = -1
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue
      const before = best[mask ^ (1 << i)]
      if (before > bestBefore) {
        bestBefore = before
        last[mask] = i
      }
    }
    best[mask] = bestBefore + (total[mask] === 0 ? 1 : 0)
  }

  // Walk back from "everyone" to recover the line-up, then cut after every zero running total
  const lineUp: Person[] = []
  for (let mask = size - 1; mask > 0; mask ^= 1 << last[mask]) lineUp.push(people[last[mask]])
  lineUp.reverse()

  const groups: Person[][] = []
  let current: Person[] = []
  let running = 0
  for (const person of lineUp) {
    current.push(person)
    running += person.amount
    if (running === 0) {
      groups.push(current)
      current = []
    }
  }
  if (current.length) groups.push(current)
  return groups
}

/**
 * Greedy settling inside one group: the person who owes the most pays the person who is owed
 * the most, as much as possible. Every step brings at least one person to zero, so a group of
 * k people needs at most k - 1 payments.
 */
function settleGroup(people: Person[]): Transfer[] {
  const debtors = people.filter((p) => p.amount < 0).map((p) => ({ id: p.id, amount: -p.amount }))
  const creditors = people.filter((p) => p.amount > 0).map((p) => ({ ...p }))
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
