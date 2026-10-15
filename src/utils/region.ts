// Watch region — which country's streaming catalog the app shows.
//
// Same shape as the watchlist store: one owner for the storage key, an external
// store so the navbar selector, the platform filter, and every detail page's
// "Available in …" block re-render together when it changes.

import { useCallback, useSyncExternalStore } from 'react'
import { REGION_MAP } from './constants'

export const DEFAULT_REGION = 'ID'

const STORAGE_KEY = 'saranin:region:v1'

const listeners = new Set<() => void>()
let snapshot = DEFAULT_REGION

function isValid(code: string | null): code is string {
  return !!code && Object.prototype.hasOwnProperty.call(REGION_MAP, code)
}

function read(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return isValid(raw) ? raw : DEFAULT_REGION
  } catch {
    return DEFAULT_REGION
  }
}

function notify() {
  for (const listener of listeners) listener()
}

snapshot = read()

export function getRegion(): string {
  return snapshot
}

export function setRegion(code: string): void {
  if (!isValid(code) || code === snapshot) return
  snapshot = code
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // Private mode / blocked storage — the choice still holds for this session.
  }
  notify()
}

export function subscribeRegion(listener: () => void): () => void {
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

export function useRegion() {
  const region = useSyncExternalStore(subscribeRegion, getRegion, getRegion)
  const update = useCallback((code: string) => setRegion(code), [])
  return { region, setRegion: update }
}
