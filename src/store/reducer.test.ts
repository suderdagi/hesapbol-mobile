import { describe, expect, it } from 'vitest'
import { reducer, initialState } from './reducer'
import type { Group } from '@/src/lib/types'

const group: Group = {
  id: 'g1',
  name: 'Kapadokya',
  emoji: '🎈',
  members: [{ id: 'a', name: 'Ayşe' }],
  expenses: [],
  settlements: [],
  createdAt: '',
}

const expense = {
  id: 'e1',
  description: 'Balloon tour',
  amount: 5000,
  paidBy: 'a',
  shares: [{ memberId: 'a', amount: 5000 }],
  splitType: 'equal' as const,
  category: 'fun' as const,
  createdAt: '',
}

describe('reducer', () => {
  const loaded = reducer(initialState, { type: 'loaded', groups: [group] })

  it('adds and then updates an expense with the same id', () => {
    const added = reducer(loaded, { type: 'saveExpense', groupId: 'g1', expense })
    const edited = reducer(added, { type: 'saveExpense', groupId: 'g1', expense: { ...expense, amount: 6000 } })

    expect(edited.groups[0].expenses).toHaveLength(1)
    expect(edited.groups[0].expenses[0].amount).toBe(6000)
  })

  it('does not change other groups', () => {
    const other = { ...group, id: 'g2' }
    const state = reducer(reducer(loaded, { type: 'createGroup', group: other }), {
      type: 'addMember',
      groupId: 'g1',
      member: { id: 'b', name: 'Can' },
    })
    expect(state.groups.find((g) => g.id === 'g2')?.members).toHaveLength(1)
    expect(state.groups.find((g) => g.id === 'g1')?.members).toHaveLength(2)
  })
})
