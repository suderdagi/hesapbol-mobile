import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { initialState, reducer, type Action, type State } from './reducer'
import { loadGroups, STORAGE_KEY } from './persistence'

const GroupsContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null)

/**
 * Keeps all groups in memory and mirrors them to AsyncStorage.
 * The app works fully offline; there is no server.
 */
export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadGroups(AsyncStorage).then(({ groups, error }) => dispatch({ type: 'loaded', groups, error }))
  }, [])

  // Save shortly after changes stop, instead of writing on every keystroke-level update
  useEffect(() => {
    // If the saved data could not be read at all, saving would replace it with an empty list
    if (!state.ready || state.error === 'unreadable') return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.groups)).catch(() => {})
    }, 300)
  }, [state])

  return <GroupsContext.Provider value={{ state, dispatch }}>{children}</GroupsContext.Provider>
}

export function useGroups() {
  const context = useContext(GroupsContext)
  if (!context) throw new Error('useGroups must be used inside GroupsProvider')
  return context
}

export function useGroup(groupId: string | undefined) {
  const { state, dispatch } = useGroups()
  return { group: state.groups.find((g) => g.id === groupId), dispatch }
}
