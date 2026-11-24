// Network & offline-mode store.
//
// Tracks both hard offline (`navigator.onLine === false`) and "lie-fi" / poor
// network fallback (when the service worker answered from cache due to timeout
// or when an API call timed out). Driven by `useSyncExternalStore` so the
// offline banner, Navbar search, and trailer previews stay in sync.

import { useSyncExternalStore } from 'react'

export interface NetworkState {
  online: boolean
  /** True when the SW fell back to cache on a slow network or a request timed out. */
  degraded: boolean
  /** True when the app is effectively running in offline / cached fallback mode. */
  offlineMode: boolean
}

interface NetworkInformationLike {
  saveData?: boolean
  effectiveType?: string
  addEventListener?: (type: string, listener: () => void) => void
}

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection
}

export function isLowBandwidth(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!navigator.onLine) return true
  const conn = getConnection()
  if (!conn) return false
  return Boolean(conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')
}

const listeners = new Set<() => void>()

let state: NetworkState = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  degraded: false,
  offlineMode: typeof navigator !== 'undefined' ? !navigator.onLine : false,
}

function emit(nextOnline: boolean, nextDegraded: boolean) {
  const nextOfflineMode = !nextOnline || nextDegraded
  if (
    state.online === nextOnline &&
    state.degraded === nextDegraded &&
    state.offlineMode === nextOfflineMode
  ) {
    return
  }
  state = { online: nextOnline, degraded: nextDegraded, offlineMode: nextOfflineMode }
  for (const listener of listeners) listener()
}

export function getNetworkState(): NetworkState {
  return state
}

/** Mark that the app fell back to cached/offline data due to poor connectivity. */
export function markNetworkDegraded(): void {
  emit(typeof navigator !== 'undefined' ? navigator.onLine : state.online, true)
}

/** Mark that a live network response succeeded cleanly. */
export function markNetworkHealthy(): void {
  emit(typeof navigator !== 'undefined' ? navigator.onLine : true, false)
}

export function subscribeNetwork(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => emit(true, false))
  window.addEventListener('offline', () => emit(false, state.degraded))
}

export function useNetworkState(): NetworkState {
  return useSyncExternalStore(subscribeNetwork, getNetworkState, getNetworkState)
}
