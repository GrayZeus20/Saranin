// One horizontal rail, shared by the home sections and the detail-page
// cast/similar strips. Previously each surface re-implemented the same
// `overflow-x-auto` + two `opacity-0` arrow buttons, which on touch produced
// invisible-but-clickable controls sitting exactly where a swipe starts.
//
// Behaviour by pointer type:
//   - touch  → nothing is intercepted; the browser pans the rail natively
//              (including momentum). Snapping is added in CSS for coarse
//              pointers only.
//   - mouse/pen → pointer events drive scrollLeft directly, because there is
//              no native panning for those; a click that ends a drag is
//              suppressed so a swipe never opens a card.
//   - keyboard → focusable region, ArrowLeft/ArrowRight page it.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

interface ScrollRowProps {
  children: ReactNode
  /** Accessible name for the rail and its arrow buttons, e.g. "Trending". */
  label: string
  /** Classes for the outer wrapper (margins, spacing…). */
  className?: string
}

const DRAG_THRESHOLD = 5

export function ScrollRow({ children, label, className = '' }: ScrollRowProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  // Kept in a ref, not state: this is written on every pointermove and must not
  // trigger a render mid-gesture.
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false })
  const [dragging, setDragging] = useState(false)
  const [hasLeft, setHasLeft] = useState(false)
  const [hasRight, setHasRight] = useState(false)

  const syncEdges = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    // A 2px slack: sub-pixel layout can leave scrollLeft at 0.5 forever, which
    // would pin the left arrow visible on a rail that is already home.
    setHasLeft(el.scrollLeft > 2)
    setHasRight(el.scrollLeft < max - 2)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', syncEdges, { passive: true })
    // ResizeObserver catches the rail itself resizing (viewport rotate, sidebar
    // collapse); MutationObserver catches the content changing as posters land
    // and pushes scrollWidth past clientWidth. Together they cover both edges
    // without re-running on every render.
    const resize = new ResizeObserver(syncEdges)
    resize.observe(el)
    const mutate = new MutationObserver(syncEdges)
    mutate.observe(el, { childList: true, subtree: true })
    syncEdges()
    return () => {
      el.removeEventListener('scroll', syncEdges)
      resize.disconnect()
      mutate.disconnect()
    }
  }, [syncEdges])

  const scrollByPage = useCallback((direction: 'left' | 'right') => {
    const el = trackRef.current
    if (!el) return
    const amount = Math.max(el.clientWidth * 0.8, 200)
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }, [])

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    const el = trackRef.current
    if (!el) return
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false }
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state.active) return
    const el = trackRef.current
    if (!el) return
    const delta = e.clientX - state.startX
    if (!state.moved) {
      if (Math.abs(delta) <= DRAG_THRESHOLD) return
      state.moved = true
      setDragging(true)
      // Capture only once a real drag is underway. Capturing on pointerdown
      // retargets the gesture's trailing click to this element, which silently
      // swallowed every plain click on a card inside the rail.
      el.setPointerCapture?.(e.pointerId)
    }
    el.scrollLeft = state.startScroll - delta
  }, [])

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state.active) return
    const el = trackRef.current
    state.active = false
    setDragging(false)
    try {
      el?.releasePointerCapture?.(e.pointerId)
    } catch {
      // Capture is already gone (pointercancel) — nothing to release.
    }
    // `state.moved` stays true on purpose: the click event fires after
    // pointerup, and onClickCapture needs to see it to swallow that click.
  }, [])

  // Capture phase so a card's own onClick never sees the click that ended a drag.
  const onClickCapture = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!drag.current.moved) return
    drag.current.moved = false
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      scrollByPage('right')
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      scrollByPage('left')
    }
  }, [scrollByPage])

  const trackClasses = [
    'scroll-row__track',
    'scrollbar-hide',
    hasLeft ? 'has-left' : '',
    hasRight ? 'has-right' : '',
    dragging ? 'is-dragging' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={`scroll-row ${className}`.trim()}>
      <div className="scroll-row__viewport">
        <button
          type="button"
          onClick={() => scrollByPage('left')}
          disabled={!hasLeft}
          aria-label={`Scroll ${label} left`}
          className="scroll-row__arrow scroll-row__arrow--left"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div
          ref={trackRef}
          role="region"
          aria-label={label}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          className={trackClasses}
        >
          {children}
        </div>

        <button
          type="button"
          onClick={() => scrollByPage('right')}
          disabled={!hasRight}
          aria-label={`Scroll ${label} right`}
          className="scroll-row__arrow scroll-row__arrow--right"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ScrollRow
