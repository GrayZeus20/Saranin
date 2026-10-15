// One save-for-later control, shared by every poster card and the detail page.
// It sits inside clickable cards, so it must swallow its own click — otherwise
// saving a title would also open it.

import type { MouseEvent } from 'react'
import { toast } from 'sonner'
import { useWatchlist, type WatchlistEntry } from '../utils/watchlist'

interface WatchButtonProps {
  entry: Omit<WatchlistEntry, 'addedAt'>
  /** overlay = round badge for a poster corner; inline = labelled pill */
  variant?: 'overlay' | 'inline'
  className?: string
}

export function WatchButton({ entry, variant = 'overlay', className = '' }: WatchButtonProps) {
  const { has, toggle } = useWatchlist()
  const saved = has(entry.media_type, entry.id)

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const added = toggle(entry)
    if (added) toast.success(`Saved "${entry.title}" to watchlist`)
    else toast(`Removed "${entry.title}" from watchlist`)
  }

  const label = saved ? `Remove ${entry.title} from watchlist` : `Save ${entry.title} to watchlist`

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={`inline-flex items-center gap-2 min-h-[44px] text-xs font-bold px-5 rounded-full border transition-all active:scale-95 ${
          saved
            ? 'bg-accent text-black border-accent'
            : 'bg-surface-elevated text-text-primary border-zinc-800 hover:border-accent hover:text-accent'
        } ${className}`}
      >
        {saved ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            In Watchlist
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Watchlist
          </>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-90 ${
        saved ? 'bg-accent text-black' : 'bg-black/60 text-white hover:bg-black/80'
      } ${className}`}
    >
      {saved ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </button>
  )
}

export default WatchButton
