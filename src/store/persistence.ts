import type { Group } from '@/src/lib/types'

export const STORAGE_KEY = 'hesapbol.groups.v1'
/** Where the raw text goes when the saved data can't be understood, so a later save can't destroy it */
export const BACKUP_KEY = 'hesapbol.groups.v1.unreadable'

/** The two AsyncStorage methods used here; a plain object can stand in for it in tests */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

/** `unreadable`: storage failed to answer. `invalid`: it answered with something that isn't a list of groups. */
export type LoadError = 'unreadable' | 'invalid'

function looksLikeGroup(value: unknown): value is Group {
  if (typeof value !== 'object' || value === null) return false
  const g = value as Record<string, unknown>
  return (
    typeof g.id === 'string' &&
    typeof g.name === 'string' &&
    Array.isArray(g.members) &&
    Array.isArray(g.expenses) &&
    Array.isArray(g.settlements)
  )
}

/** Throws when the text isn't JSON or isn't a list of groups. Only the top level of each group is checked. */
export function parseStoredGroups(raw: string | null): Group[] {
  if (raw === null) return []
  const data: unknown = JSON.parse(raw)
  if (!Array.isArray(data) || !data.every(looksLikeGroup)) throw new Error('Saved data is not a list of groups')
  return data
}

/** Never throws: problems come back as `error` so the app can tell the person and avoid overwriting data. */
export async function loadGroups(storage: KeyValueStorage): Promise<{ groups: Group[]; error: LoadError | null }> {
  let raw: string | null
  try {
    raw = await storage.getItem(STORAGE_KEY)
  } catch {
    return { groups: [], error: 'unreadable' }
  }

  try {
    return { groups: parseStoredGroups(raw), error: null }
  } catch {
    // Keep a copy: the next save replaces STORAGE_KEY with the (empty) list the app starts from
    await storage.setItem(BACKUP_KEY, raw ?? '').catch(() => {})
    return { groups: [], error: 'invalid' }
  }
}
