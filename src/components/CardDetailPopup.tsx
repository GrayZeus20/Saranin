// Card detail popup — a small floating panel that opens over a poster card on
// hover (pointer-fine only; a touch device opens the detail page directly, so
// a popup there would only trap taps).
//
// It is intentionally minimal: the card already navigates on click, so the
// popup's job is the "look before you leap" — year, rating, genres, a synopsis
// excerpt and the same deep link the card itself has. Data comes from the
// item the grid already holds (the list payload), so opening one costs ZERO
// extra requests.
//
// Positioning is MEASURED, not assumed. A naive `left-1/2 -translate-x-1/2`
// w-64 panel clips on the grid's edge columns (a 390px viewport loses ~26px of
// the left column's panel and ~68px of the right one), and a `bottom-full`
// panel on the grid's top row slides under the fixed navbar. So on open the
// host and panel rects are measured once and the panel is placed inside the
// viewport: clamped horizontally, flipping below the card when there is not
// enough room above (and enough below to make the flip worthwhile).

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GENRE_MAP, formatDate } from '../utils/constants'
import type { Movie } from '../utils/tmdb'

/** Panel geometry — must match the w-64 class below. */
const PANEL_W = 256
const NAV_H = 64 // fixed navbar + breathing room
const MARGIN = 8
/** Hover rest before the panel opens (ms) — pass-through shouldn't pop it. */
const OPEN_DELAY = 250

export function CardDetailPopup({ movie, mediaType, children }: {
  movie: Movie
  mediaType: 'movie' | 'tv'
  /** The card's own body — rendered as-is inside the hover wrapper. */
  children: ReactNode
}) {
  const path = `/${mediaType}/${movie.id}`
  const genres = (movie.genre_ids || []).map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 3)

  const hostRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  // Placement, in coordinates local to the host card. Defaults reproduce the
  // old CSS placement (centered above) for the first paint while measuring.
  const [left, setLeft] = useState<number | null>(null)
  const [flip, setFlip] = useState(false)

  const finePointer = useCallback(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    []
  )

  // Measure once at open time (the closed panel still has layout — opacity-0
  // does not remove it — so its real height/width are readable) and pin the
  // panel inside the viewport.
  const place = useCallback(() => {
    const host = hostRef.current
    const panel = panelRef.current
    if (!host || !panel) return
    const h = host.getBoundingClientRect()
    const p = panel.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    // Horizontal: center on the card, then clamp into the viewport. The result
    // is converted to host-local coordinates for the absolutely positioned
    // panel (which therefore needs no translate-x at all).
    const viewportLeft = Math.min(Math.max(h.left + h.width / 2 - PANEL_W / 2, MARGIN), Math.max(MARGIN, vw - MARGIN - PANEL_W))
    setLeft(viewportLeft - h.left)
    // Vertical: open above by default; flip below only when above would cross
    // the navbar AND below genuinely has more room (else keep above — e.g. the
    // last grid row where below is the footer).
    const need = p.height + MARGIN
    const spaceAbove = h.top - NAV_H
    const spaceBelow = vh - h.bottom
    setFlip(spaceAbove < need && spaceBelow > spaceAbove)
  }, [])

  const enter = useCallback(() => {
    if (!finePointer()) return
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      place()
      setOpen(true)
    }, OPEN_DELAY)
  }, [finePointer, place])

  const leave = useCallback(() => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
    setOpen(false)
  }, [])

  // While open, follow layout changes (scroll, image load reflow) so the clamp
  // never pins the panel against a stale rect.
  useEffect(() => {
    if (!open) return
    const rePlace = () => place()
    window.addEventListener('scroll', rePlace, { passive: true })
    window.addEventListener('resize', rePlace)
    return () => {
      window.removeEventListener('scroll', rePlace)
      window.removeEventListener('resize', rePlace)
    }
  }, [open, place])

  // Unmount with the timer still armed would open a panel on a dead node.
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  return (
    <div ref={hostRef} className="card-popup relative" onMouseEnter={enter} onMouseLeave={leave}>
      {children}
      {/* pointer-events-none until open: the closed panel can never steal the
          click that navigates. `aria-hidden` mirrors that — the panel is a
          pointer-only affordance; keyboard users take the card's own link. */}
      <div
        ref={panelRef}
        role="presentation"
        aria-hidden={!open}
        style={left !== null ? { left } : undefined}
        className={`pointer-events-none absolute z-30 w-64 transition-[opacity,transform] duration-200 ${
          flip ? 'top-full mt-2 translate-y-1' : 'bottom-full mb-2 translate-y-1'
        } ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0'}`}
      >
        <div className="rounded-xl border border-zinc-700 bg-surface-elevated/95 backdrop-blur-md p-3.5 shadow-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-accent text-[10px] font-mono font-bold">★ {movie.vote_average?.toFixed(1)}</span>
            <span className="text-text-muted text-[10px]">{formatDate(movie.release_date)}</span>
            <span className="text-text-muted text-[10px] uppercase">{mediaType === 'tv' ? 'TV' : 'Movie'}</span>
          </div>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {genres.map(g => (
                <span key={g} className="text-[9px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 rounded">
                  {g}
                </span>
              ))}
            </div>
          )}
          {movie.overview && (
            <p className="text-text-secondary text-[11px] leading-relaxed line-clamp-4 mb-2.5">{movie.overview}</p>
          )}
          <Link
            to={path}
            // stopPropagation: the host card also navigates on click — without
            // this, activating the panel's link pushed TWO history entries.
            onClick={e => e.stopPropagation()}
            className="block text-center bg-accent text-black text-[11px] font-bold py-1.5 rounded-full hover:bg-accent/90 active:scale-95 transition-all"
          >
            Open details
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CardDetailPopup
