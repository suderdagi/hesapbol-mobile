import type { Expense, Group, Member, Settlement } from '@/src/lib/types'
import type { LoadError } from './persistence'

export type Action =
  | { type: 'loaded'; groups: Group[]; error?: LoadError | null }
  | { type: 'createGroup'; group: Group }
  | { type: 'deleteGroup'; groupId: string }
  | { type: 'addMember'; groupId: string; member: Member }
  | { type: 'saveExpense'; groupId: string; expense: Expense }
  | { type: 'deleteExpense'; groupId: string; expenseId: string }
  | { type: 'addSettlement'; groupId: string; settlement: Settlement }
  | { type: 'deleteSettlement'; groupId: string; settlementId: string }

export interface State {
  ready: boolean
  groups: Group[]
  /** Set when the saved data could not be loaded normally; the screens explain it */
  error: LoadError | null
}

export const initialState: State = { ready: false, groups: [], error: null }

/** Pure function: easy to test and the only place where data changes */
export function reducer(state: State, action: Action): State {
  const updateGroup = (groupId: string, update: (g: Group) => Group): State => ({
    ...state,
    groups: state.groups.map((g) => (g.id === groupId ? update(g) : g)),
  })

  switch (action.type) {
    case 'loaded':
      return { ready: true, groups: action.groups, error: action.error ?? null }

    case 'createGroup':
      return { ...state, groups: [action.group, ...state.groups] }

    case 'deleteGroup':
      return { ...state, groups: state.groups.filter((g) => g.id !== action.groupId) }

    case 'addMember':
      return updateGroup(action.groupId, (g) => ({ ...g, members: [...g.members, action.member] }))

    case 'saveExpense':
      return updateGroup(action.groupId, (g) => {
        const exists = g.expenses.some((e) => e.id === action.expense.id)
        return {
          ...g,
          expenses: exists
            ? g.expenses.map((e) => (e.id === action.expense.id ? action.expense : e))
            : [action.expense, ...g.expenses],
        }
      })

    case 'deleteExpense':
      return updateGroup(action.groupId, (g) => ({ ...g, expenses: g.expenses.filter((e) => e.id !== action.expenseId) }))

    case 'addSettlement':
      return updateGroup(action.groupId, (g) => ({ ...g, settlements: [action.settlement, ...g.settlements] }))

    case 'deleteSettlement':
      return updateGroup(action.groupId, (g) => ({
        ...g,
        settlements: g.settlements.filter((s) => s.id !== action.settlementId),
      }))
  }
}
