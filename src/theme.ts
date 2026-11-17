export const colors = {
  primary: '#ea580c',
  primaryDark: '#c2410c',
  primarySoft: '#fff7ed',
  text: '#1c1917',
  muted: '#78716c',
  border: '#e7e5e4',
  background: '#fafaf9',
  card: '#ffffff',
  positive: '#059669',
  negative: '#dc2626',
}

const AVATAR_COLORS = ['#ea580c', '#0891b2', '#7c3aed', '#db2777', '#059669', '#ca8a04', '#2563eb', '#475569']

/** The same member always gets the same color */
export function avatarColor(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export const CATEGORY_META = {
  food: { label: 'Food', icon: 'silverware-fork-knife' },
  transport: { label: 'Transport', icon: 'car' },
  stay: { label: 'Stay', icon: 'bed' },
  groceries: { label: 'Groceries', icon: 'cart' },
  fun: { label: 'Fun', icon: 'party-popper' },
  bills: { label: 'Bills', icon: 'file-document' },
  other: { label: 'Other', icon: 'dots-horizontal' },
} as const
