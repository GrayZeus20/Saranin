// Compact status bar shown below the navbar whenever the user is offline or
// the app has fallen back to cached data on a slow ("lie-fi") connection.

import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { markNetworkHealthy, useNetworkState } from '../utils/network'

export function OfflineBanner() {
  const { online, degraded, offlineMode } = useNetworkState()
  const location = useLocation()
  const queryClient = useQueryClient()
  const wasOfflineRef = useRef(offlineMode)

  useEffect(() => {
    if (wasOfflineRef.current && !offlineMode && online) {
      toast.success('Back online')
      queryClient.invalidateQueries()
    }
    wasOfflineRef.current = offlineMode
  }, [offlineMode, online, queryClient])

  if (!offlineMode) return null

  const onWatchlist = location.pathname === '/watchlist'

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-surface-elevated border-b border-accent/30 text-text-secondary"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-accent shrink-0" aria-hidden="true" />
          <p className="truncate">
            {!online
              ? 'Offline mode — showing cached content.'
              : degraded
                ? 'Slow connection — showing cached content so you do not get stuck.'
                : 'Offline mode.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!onWatchlist && (
            <Link
              to="/watchlist"
              className="text-accent font-semibold hover:text-text-primary transition-colors"
            >
              Watchlist
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              markNetworkHealthy()
              queryClient.invalidateQueries()
            }}
            className="px-3 py-1 rounded-full bg-surface-card border border-zinc-700 text-text-primary text-[11px] font-semibold hover:border-accent transition-colors active:scale-95"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}

export default OfflineBanner
