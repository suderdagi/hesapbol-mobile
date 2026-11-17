import type { Kurus } from './money'

export interface Member {
  id: string
  name: string
}

export interface Share {
  memberId: string
  amount: Kurus
}

export const CATEGORIES = ['food', 'transport', 'stay', 'groceries', 'fun', 'bills', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export interface Expense {
  id: string
  description: string
  amount: Kurus
  paidBy: string
  /** How much of the amount each member is responsible for; always sums to `amount` */
  shares: Share[]
  splitType: 'equal' | 'exact'
  category: Category
  createdAt: string
}

/** A payment between members to pay back what they owe */
export interface Settlement {
  id: string
  from: string
  to: string
  amount: Kurus
  createdAt: string
}

export interface Group {
  id: string
  name: string
  emoji: string
  members: Member[]
  expenses: Expense[]
  settlements: Settlement[]
  createdAt: string
}
