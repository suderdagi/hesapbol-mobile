import { describe, expect, it } from 'vitest'
import { formatMoney, toInputValue, toKurus } from './money'
import { splitEqually, validateShares } from './split'
import { computeBalances, EXACT_LIMIT, simplifyDebts, type Transfer } from './balances'
import type { Expense, Group } from './types'

/** Small seeded random generator so the "random" tests give the same numbers on every run */
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const members = [
  { id: 'ayse', name: 'Ayşe' },
  { id: 'can', name: 'Can' },
  { id: 'deniz', name: 'Deniz' },
  { id: 'ece', name: 'Ece' },
]

function expense(paidBy: string, amount: number, between: string[]): Expense {
  return {
    id: Math.random().toString(),
    description: 'x',
    amount,
    paidBy,
    shares: splitEqually(amount, between),
    splitType: 'equal',
    category: 'other',
    createdAt: new Date().toISOString(),
  }
}

describe('money', () => {
  it('parses Turkish and English decimal formats', () => {
    expect(toKurus('12,50')).toBe(1250)
    expect(toKurus('12.5')).toBe(1250)
    expect(toKurus('0.1')).toBe(10)
    expect(toKurus('1 250')).toBe(125000)
  })

  it('rejects invalid input', () => {
    expect(toKurus('')).toBeNull()
    expect(toKurus('-5')).toBeNull()
    expect(toKurus('1,234')).toBeNull() // more than 2 decimals
    expect(toKurus('abc')).toBeNull()
  })

  it('formats as Turkish lira', () => {
    expect(formatMoney(125050)).toMatch(/1\.250,50/)
  })

  it('only treats spaces as thousands separators when the groups have three digits', () => {
    expect(toKurus('1 250,50')).toBe(125050)
    expect(toKurus('1 250')).toBe(125000)
    expect(toKurus('12 50')).toBeNull() // used to be read as 1250 TL
    expect(toKurus('1 2500')).toBeNull()
  })

  it('refuses amounts too large to stay exact', () => {
    expect(toKurus('999999999,99')).toBe(99_999_999_999)
    expect(toKurus('1000000000')).toBeNull()
    expect(toKurus('99999999999999999')).toBeNull()
  })

  it('reads back exactly what toInputValue wrote, for any amount up to the limit', () => {
    const random = seededRandom(42)
    for (let i = 0; i < 5000; i++) {
      const kurus = Math.floor(random() * 100_000_000_000)
      expect(toKurus(toInputValue(kurus))).toBe(kurus)
    }
  })
})

describe('splitEqually', () => {
  it('distributes leftover kuruş so the total stays exact', () => {
    const shares = splitEqually(100, ['a', 'b', 'c'])
    expect(shares.map((s) => s.amount)).toEqual([34, 33, 33])
    expect(shares.reduce((s, x) => s + x.amount, 0)).toBe(100)
  })
})

describe('validateShares', () => {
  it('requires shares to add up to the total', () => {
    expect(validateShares(1000, [{ memberId: 'a', amount: 600 }, { memberId: 'b', amount: 400 }])).toEqual({ ok: true })
    expect(validateShares(1000, [{ memberId: 'a', amount: 600 }])).toMatchObject({ ok: false })
    expect(validateShares(0, [{ memberId: 'a', amount: 0 }])).toMatchObject({ ok: false })
  })
})

describe('computeBalances', () => {
  it('credits the payer and debits everyone who shared', () => {
    // Ayşe pays 300 TL dinner for 3 people
    const balances = computeBalances({ members, expenses: [expense('ayse', 30000, ['ayse', 'can', 'deniz'])], settlements: [] })
    expect(Object.fromEntries(balances)).toEqual({ ayse: 20000, can: -10000, deniz: -10000, ece: 0 })
  })

  it('always sums to zero', () => {
    const group: Pick<Group, 'members' | 'expenses' | 'settlements'> = {
      members,
      expenses: [
        expense('ayse', 12345, ['ayse', 'can', 'deniz']),
        expense('can', 9999, ['can', 'ece']),
        expense('ece', 100, ['ayse', 'can', 'deniz', 'ece']),
      ],
      settlements: [{ id: 's', from: 'deniz', to: 'ayse', amount: 1000, createdAt: '' }],
    }
    const total = [...computeBalances(group).values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(0)
  })

  it('reduces debts after a settlement', () => {
    const balances = computeBalances({
      members,
      expenses: [expense('ayse', 20000, ['ayse', 'can'])],
      settlements: [{ id: 's', from: 'can', to: 'ayse', amount: 10000, createdAt: '' }],
    })
    expect(balances.get('ayse')).toBe(0)
    expect(balances.get('can')).toBe(0)
  })
})

describe('simplifyDebts', () => {
  it('needs fewer payments than there are debts', () => {
    // A chain: Can owes Ayşe, Deniz owes Can, Ece owes Deniz → one payment is enough per person at most
    const balances = new Map([
      ['ayse', 9000],
      ['can', -3000],
      ['deniz', -3000],
      ['ece', -3000],
    ])
    const transfers = simplifyDebts(balances)
    expect(transfers).toHaveLength(3)
    expect(transfers.every((t) => t.to === 'ayse')).toBe(true)
  })

  it('settles everyone to exactly zero', () => {
    const balances = new Map([
      ['ayse', 4537],
      ['can', -1999],
      ['deniz', 1000],
      ['ece', -3538],
    ])
    const transfers = simplifyDebts(balances)
    const after = new Map(balances)
    for (const t of transfers) {
      after.set(t.from, after.get(t.from)! + t.amount)
      after.set(t.to, after.get(t.to)! - t.amount)
    }
    expect([...after.values()].every((v) => v === 0)).toBe(true)
    expect(transfers.length).toBeLessThanOrEqual(balances.size - 1)
  })

  it('returns nothing when everyone is even', () => {
    expect(simplifyDebts(new Map([['a', 0], ['b', 0]]))).toEqual([])
  })
})

/** Balances left after paying the given transfers; all zeros means everything is settled */
function leftOver(balances: Map<string, number>, transfers: Transfer[]) {
  const after = new Map(balances)
  for (const t of transfers) {
    after.set(t.from, after.get(t.from)! + t.amount)
    after.set(t.to, after.get(t.to)! - t.amount)
  }
  return [...after.values()]
}

/**
 * Reference answer by brute force: the fewest payments equal the number of people minus the most
 * groups that add up to zero, found here by trying every subset.
 */
function fewestPayments(values: number[]): number {
  const sum = (mask: number) => values.reduce((s, v, i) => (mask & (1 << i) ? s + v : s), 0)
  const memo = new Map<number, number>()
  const mostGroups = (mask: number): number => {
    if (mask === 0) return 0
    if (memo.has(mask)) return memo.get(mask)!
    const first = mask & -mask
    let best = 0
    for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
      if (sub & first && sum(sub) === 0) best = Math.max(best, 1 + mostGroups(mask ^ sub))
    }
    memo.set(mask, best)
    return best
  }
  return values.length - mostGroups((1 << values.length) - 1)
}

/** Random balances that add up to zero, none of them zero */
function randomBalances(random: () => number, people: number, max: number): number[] {
  for (;;) {
    const values = Array.from({ length: people - 1 }, () => {
      const v = Math.floor(random() * (2 * max + 1)) - max
      return v === 0 ? 1 : v
    })
    const last = -values.reduce((a, b) => a + b, 0)
    if (last !== 0) return [...values, last]
  }
}

describe('simplifyDebts finds the fewest payments', () => {
  // Paying the biggest debt to the biggest credit first needs 4 payments here.
  // Deniz paying Ece, and Can paying Ayşe and Fatih, needs only 3.
  const tricky = new Map([
    ['ayse', 2000],
    ['can', -4000],
    ['deniz', -3000],
    ['ece', 3000],
    ['fatih', 2000],
  ])

  it('beats the plain greedy method on a tricky group', () => {
    const transfers = simplifyDebts(tricky)
    expect(transfers).toHaveLength(3)
    expect(leftOver(tricky, transfers).every((v) => v === 0)).toBe(true)
  })

  it('ignores people who are already even', () => {
    const transfers = simplifyDebts(new Map([['a', 0], ['b', 500], ['c', -500], ['d', 0]]))
    expect(transfers).toEqual([{ from: 'c', to: 'b', amount: 500 }])
  })

  it('matches a brute-force search on random groups of up to 8 people', () => {
    const random = seededRandom(7)
    for (let round = 0; round < 300; round++) {
      const values = randomBalances(random, 2 + Math.floor(random() * 7), 12)
      const balances = new Map(values.map((v, i) => ['p' + i, v * 100]))
      const transfers = simplifyDebts(balances)

      expect(transfers).toHaveLength(fewestPayments(values))
      expect(leftOver(balances, transfers).every((v) => v === 0)).toBe(true)
      expect(transfers.every((t) => t.amount > 0 && t.from !== t.to)).toBe(true)
    }
  })

  it('still settles everyone, with at most n - 1 payments, beyond the exact limit', () => {
    const random = seededRandom(11)
    const people = EXACT_LIMIT + 4
    const balances = new Map(randomBalances(random, people, 500).map((v, i) => ['p' + i, v]))
    const transfers = simplifyDebts(balances)

    expect(leftOver(balances, transfers).every((v) => v === 0)).toBe(true)
    expect(transfers.length).toBeLessThanOrEqual(people - 1)
  })
})
