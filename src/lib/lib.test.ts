import { describe, expect, it } from 'vitest'
import { formatMoney, toKurus } from './money'
import { splitEqually, validateShares } from './split'
import { computeBalances, simplifyDebts } from './balances'
import type { Expense, Group } from './types'

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
