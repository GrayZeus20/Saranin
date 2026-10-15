// Content locale — which language TMDB serves titles, overviews, and taglines in.
//
// Same shape as the region store: one owner for the storage key, an external
// store so the navbar toggle, every query, and every keyed cache entry re-render
// and re-fetch together when the user flips it.

import { useCallback, useSyncExternalStore } from 'react'

export type Locale = 'en-US' | 'id-ID'

export const DEFAULT_LOCALE: Locale = 'en-US'

const STORAGE_KEY = 'saranin:locale:v1'

const listeners = new Set<() => void>()
let snapshot: Locale = DEFAULT_LOCALE

function isValid(code: string | null): code is Locale {
  return code === 'en-US' || code === 'id-ID'
}

function read(): Locale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return isValid(raw) ? raw : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

function notify() {
  for (const listener of listeners) listener()
}

snapshot = read()

export function getLocale(): Locale {
  return snapshot
}

export function setLocale(code: Locale): void {
  if (code === snapshot) return
  snapshot = code
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // Private mode / blocked storage — the choice still holds for this session.
  }
  notify()
}

export function subscribeLocale(listener: () => void): () => void {
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

export function useLocale() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale)
  const update = useCallback((code: Locale) => setLocale(code), [])
  return { locale, setLocale: update }
}
