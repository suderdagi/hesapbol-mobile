import { describe, expect, it } from 'vitest'
import { BACKUP_KEY, loadGroups, parseStoredGroups, STORAGE_KEY, type KeyValueStorage } from './persistence'
import { initialState, reducer } from './reducer'
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

/** An in-memory stand-in for AsyncStorage */
function memoryStorage(initial: Record<string, string> = {}, options: { failReads?: boolean } = {}) {
  const data = new Map(Object.entries(initial))
  const writes: string[] = []
  const storage: KeyValueStorage = {
    async getItem(key) {
      if (options.failReads) throw new Error('storage unavailable')
      return data.get(key) ?? null
    },
    async setItem(key, value) {
      writes.push(key)
      data.set(key, value)
    },
  }
  return { storage, data, writes }
}

describe('parseStoredGroups', () => {
  it('treats missing data as an empty list', () => {
    expect(parseStoredGroups(null)).toEqual([])
  })

  it('accepts a saved list of groups', () => {
    expect(parseStoredGroups(JSON.stringify([group]))).toEqual([group])
  })

  it('rejects text that is not JSON and JSON that is not a list of groups', () => {
    expect(() => parseStoredGroups('{"oops":')).toThrow()
    expect(() => parseStoredGroups('{"a":1}')).toThrow()
    expect(() => parseStoredGroups('[1, 2]')).toThrow()
    expect(() => parseStoredGroups(JSON.stringify([{ ...group, members: 'nobody' }]))).toThrow()
  })
})

describe('loadGroups', () => {
  it('returns the saved groups without an error', async () => {
    const { storage } = memoryStorage({ [STORAGE_KEY]: JSON.stringify([group]) })
    expect(await loadGroups(storage)).toEqual({ groups: [group], error: null })
  })

  it('starts empty without an error on first launch', async () => {
    const { storage } = memoryStorage()
    expect(await loadGroups(storage)).toEqual({ groups: [], error: null })
  })

  it('keeps a copy of data it cannot understand before anything can replace it', async () => {
    const { storage, data } = memoryStorage({ [STORAGE_KEY]: '{"oops":' })
    expect(await loadGroups(storage)).toEqual({ groups: [], error: 'invalid' })
    expect(data.get(BACKUP_KEY)).toBe('{"oops":')
  })

  it('reports unreadable storage and writes nothing', async () => {
    const { storage, writes } = memoryStorage({ [STORAGE_KEY]: JSON.stringify([group]) }, { failReads: true })
    expect(await loadGroups(storage)).toEqual({ groups: [], error: 'unreadable' })
    expect(writes).toEqual([])
  })
})

describe('reducer load result', () => {
  it('remembers why loading was not normal', () => {
    expect(reducer(initialState, { type: 'loaded', groups: [], error: 'unreadable' })).toEqual({
      ready: true,
      groups: [],
      error: 'unreadable',
    })
    expect(reducer(initialState, { type: 'loaded', groups: [group] }).error).toBeNull()
  })
})
