// Recent searches — "pick up where you left off", persisted in localStorage.
//
// Same external-store shape as the watchlist: one owner for the storage key so
// the navbar dropdown and the /search page read one shared list, and
// useSyncExternalStore keeps every surface in lockstep.

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'saranin:search-history:v1'
const MAX_ENTRIES = 8

const listeners = new Set<() => void>()
let snapshot: string[] = []

// Anything that is not a non-empty string is dropped — old formats, hand-edited
// values, another app's leftovers under the same key.
function isEntry(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry).slice(0, MAX_ENTRIES)
  } catch {
    // Private mode / blocked storage / corrupt JSON — an empty list, never a throw.
    return []
  }
}

function notify() {
  for (const listener of listeners) listener()
}

function persist(next: string[]) {
  snapshot = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota or blocked storage: the in-memory list still works this session.
  }
  notify()
}

snapshot = read()

export function getRecentSearches(): string[] {
  return snapshot
}

/** Record a committed search. Case-insensitive dedupe, newest first, capped. */
export function addRecentSearch(query: string): void {
  const trimmed = query.trim()
  if (trimmed.length < 2) return
  const lower = trimmed.toLowerCase()
  const next = [trimmed, ...snapshot.filter((q) => q.toLowerCase() !== lower)].slice(0, MAX_ENTRIES)
  // Re-committing the same top entry changes nothing — skip the write/notify.
  if (next.length === snapshot.length && next.every((q, i) => q === snapshot[i])) return
  persist(next)
}

export function removeRecentSearch(query: string): void {
  const next = snapshot.filter((q) => q !== query)
  if (next.length === snapshot.length) return
  persist(next)
}

export function clearRecentSearches(): void {
  if (snapshot.length === 0) return
  persist([])
}

export function subscribeSearchHistory(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    snapshot = read()
    notify()
  })
}

export function useSearchHistory() {
  const items = useSyncExternalStore(subscribeSearchHistory, getRecentSearches, getRecentSearches)
  const add = useCallback((query: string) => addRecentSearch(query), [])
  const remove = useCallback((query: string) => removeRecentSearch(query), [])
  const clear = useCallback(() => clearRecentSearches(), [])
  return { items, add, remove, clear }
}
