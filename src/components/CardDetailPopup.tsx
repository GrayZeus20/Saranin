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
// Positioning is MEASURED, not assumed, and the panel is PORTALED to <body>
// with `position: fixed`. Two reasons:
//   • measured — a naive `left-1/2 -translate-x-1/2` w-64 panel clips on the
//     grid's edge columns, and a `bottom-full` panel on the top row slides
//     under the fixed navbar; so on open the host rect is measured once and the
//     panel is placed inside the viewport (clamped horizontally, flipped below
//     when there is no room above).
//   • portaled — a closed panel used to sit in the grid at `opacity-0`, still
//     laid out at a centred left position. On a 390px viewport that widened the
//     document to 454px and the whole page scrolled sideways. Out of flow and
//     rendered only while open, it can no longer contribute any width.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { GENRE_MAP, formatDate } from '../utils/constants'
import type { Movie } from '../utils/tmdb'

/** Panel width — must match the w-64 class below. */
const PANEL_W = 256
const NAV_H = 64 // fixed navbar + breathing room
const MARGIN = 8
/** Hover rest before the panel opens (ms) — pass-through shouldn't pop it. */
const OPEN_DELAY = 250
/** Grace period to move from the card into the panel's link (it lives in <body>). */
const CLOSE_DELAY = 400

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
  const closeTimerRef = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  // Viewport coordinates, measured on open. null = not measured yet (the panel
  // is rendered invisible for that one frame so it can be measured at all).
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  const finePointer = useCallback(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    []
  )

  const place = useCallback(() => {
    const host = hostRef.current
    if (!host) return
    const panel = panelRef.current
    const h = host.getBoundingClientRect()
    const pw = panel?.offsetWidth || PANEL_W
    const ph = panel?.offsetHeight || 0
    const vw = window.innerWidth
    const vh = window.innerHeight
    // Horizontal: center on the card, then clamp into the viewport.
    const left = Math.min(Math.max(h.left + h.width / 2 - pw / 2, MARGIN), Math.max(MARGIN, vw - MARGIN - pw))
    // Vertical: above by default; below only when above crosses the navbar and
    // below genuinely fits (the last grid row keeps above — below is the footer).
    const aboveTop = h.top - ph - MARGIN
    const belowTop = h.bottom + MARGIN
    const fitsAbove = aboveTop >= NAV_H
    const fitsBelow = belowTop + ph <= vh - MARGIN
    let top: number
    if (fitsAbove) {
      top = aboveTop
    } else if (fitsBelow) {
      top = belowTop
    } else {
      // Neither ideally fits: clamp safely within viewport so the popup is never cut off
      const maxTop = Math.max(NAV_H, vh - ph - MARGIN)
      top = Math.min(Math.max(NAV_H, aboveTop), maxTop)
    }
    setPos({ left, top })
  }, [])

  const enter = useCallback(() => {
    if (!finePointer()) return
    if (closeTimerRef.current !== null) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setOpen(true), OPEN_DELAY)
  }, [finePointer])

  const leave = useCallback(() => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      setPos(null)
    }, CLOSE_DELAY)
  }, [])

  // Measure after the panel exists (layout effect → no visible jump), and keep
  // following layout changes while open (scroll, image load reflow).
  useLayoutEffect(() => {
    if (!open) return
    place()
    const rePlace = () => place()
    window.addEventListener('scroll', rePlace, { passive: true })
    window.addEventListener('resize', rePlace)
    return () => {
      window.removeEventListener('scroll', rePlace)
      window.removeEventListener('resize', rePlace)
    }
  }, [open, place])

  // A press anywhere outside the panel is the user starting to interact with
  // the page — the popup dismisses at once instead of hanging over the card the
  // press is aimed at. A press INSIDE the panel is left alone: unmounting it
  // there would eat the click on its own "Open details" link.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return
      if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
      setOpen(false)
      setPos(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open])

  // Unmount with either timer still armed would touch a dead component.
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
  }, [])

  return (
    <div ref={hostRef} className="card-popup relative" onMouseEnter={enter} onMouseLeave={leave}>
      {children}
      {open && createPortal(
        <div
          ref={panelRef}
          role="presentation"
          // The panel is a pointer-only affordance; keyboard users take the
          // card's own link. Entering it cancels the close grace period.
          onMouseEnter={() => {
            if (closeTimerRef.current !== null) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
          }}
          onMouseLeave={leave}
          style={{
            position: 'fixed',
            left: pos?.left ?? MARGIN,
            top: pos?.top ?? NAV_H,
            visibility: pos ? 'visible' : 'hidden',
          }}
          className="z-50 w-64"
        >
          <div className="rounded-xl border border-zinc-700 bg-surface-elevated/95 backdrop-blur-md p-3.5 shadow-2xl max-h-[calc(100vh-80px)] overflow-y-auto">
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
        </div>,
        document.body,
      )}
    </div>
  )
}

export default CardDetailPopup
