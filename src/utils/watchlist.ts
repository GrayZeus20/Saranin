// Watchlist — "save it for later", persisted in localStorage.
//
// One module owns the storage key so every surface (poster badges, the detail
// page, the /watchlist page) reads the same list, and useSyncExternalStore
// keeps them in lockstep without context or prop drilling.

import { useCallback, useSyncExternalStore } from 'react'

export type MediaType = 'movie' | 'tv'

export interface WatchlistEntry {
  id: number
  media_type: MediaType
  title: string
  poster_path: string | null
  vote_average: number
  release_date: string
  addedAt: number
}

const STORAGE_KEY = 'saranin:watchlist:v1'
const MAX_ENTRIES = 200

const listeners = new Set<() => void>()
let snapshot: WatchlistEntry[] = []

// Storage may hold anything (an old format, a hand-edited value, another app's
// leftovers under the same key) — anything that is not a full entry is dropped.
function isEntry(value: any): value is WatchlistEntry {
  return !!value
    && typeof value.id === 'number'
    && (value.media_type === 'movie' || value.media_type === 'tv')
    && typeof value.title === 'string'
    && typeof value.addedAt === 'number'
}

function read(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry).sort((a, b) => b.addedAt - a.addedAt)
  } catch {
    // Private mode / blocked storage / corrupt JSON — an empty list, never a throw.
    return []
  }
}

function notify() {
  for (const listener of listeners) listener()
}

function persist(next: WatchlistEntry[]) {
  // Replace the snapshot reference only when the data really changed, so
  // useSyncExternalStore's identity check stays honest.
  snapshot = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota or blocked storage: the in-memory list still works for this session.
  }
  notify()
}

snapshot = read()

export function getWatchlist(): WatchlistEntry[] {
  return snapshot
}

export function isInWatchlist(mediaType: MediaType, id: number): boolean {
  return snapshot.some((entry) => entry.media_type === mediaType && entry.id === id)
}

/** Returns true when the title was ADDED, false when it was removed. */
export function toggleWatchlist(entry: Omit<WatchlistEntry, 'addedAt'>): boolean {
  if (isInWatchlist(entry.media_type, entry.id)) {
    persist(snapshot.filter((e) => !(e.media_type === entry.media_type && e.id === entry.id)))
    return false
  }
  const next = [{ ...entry, addedAt: Date.now() }, ...snapshot]
  persist(next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next)
  return true
}

export function removeFromWatchlist(mediaType: MediaType, id: number): void {
  if (!isInWatchlist(mediaType, id)) return
  persist(snapshot.filter((e) => !(e.media_type === mediaType && e.id === id)))
}

export function clearWatchlist(): void {
  if (snapshot.length === 0) return
  persist([])
}

export function subscribeWatchlist(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Another tab changed the list — pull the new value in.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    snapshot = read()
    notify()
  })
}

export function useWatchlist() {
  const items = useSyncExternalStore(subscribeWatchlist, getWatchlist, getWatchlist)
  const has = useCallback(
    (mediaType: MediaType, id: number) => items.some((e) => e.media_type === mediaType && e.id === id),
    [items],
  )
  const toggle = useCallback((entry: Omit<WatchlistEntry, 'addedAt'>) => toggleWatchlist(entry), [])
  const remove = useCallback((mediaType: MediaType, id: number) => removeFromWatchlist(mediaType, id), [])
  const clear = useCallback(() => clearWatchlist(), [])
  return { items, has, toggle, remove, clear }
}
