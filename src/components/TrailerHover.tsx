// Drop-in hover-preview layer for any poster/backdrop box.
//
// The layer is pointer-events-none so the card underneath keeps its own click
// and hover affordances; the hover signal is taken from the *parent* element
// (the poster box it is rendered into) instead of threading handlers through
// every card variant.
//
// The root deliberately carries NO z-index and must be placed directly after
// the image: later siblings (gradients, badges, watch buttons) are positioned
// with z-index:auto/0 in the same stacking context, and an explicit z would
// lift the video above the card chrome.

import { useEffect, useRef } from 'react'
import { useTrailerHover } from '../utils/trailer'

export function TrailerHover({ mediaType, id, title, zoomClass = 'scale-[1.35]' }: {
  mediaType: 'movie' | 'tv'
  id: number
  title: string
  /** How far the embed is scaled up to hide YouTube's letterbox bars. */
  zoomClass?: string
}) {
  const { videoKey, onEnter, onLeave } = useTrailerHover(mediaType, id)
  const ref = useRef<HTMLDivElement>(null)

  // Listeners live on the DOM node's parent, so callers just drop this element
  // into a `relative` box and get previews for free.
  useEffect(() => {
    const host = ref.current?.parentElement
    if (!host) return
    host.addEventListener('pointerenter', onEnter)
    host.addEventListener('pointerleave', onLeave)
    return () => {
      host.removeEventListener('pointerenter', onEnter)
      host.removeEventListener('pointerleave', onLeave)
    }
  }, [onEnter, onLeave])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden ${videoKey ? 'opacity-100' : 'opacity-0'}`}
    >
      {videoKey && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1&rel=0&loop=1&playlist=${videoKey}&disablekb=1`}
          title={`${title} preview`}
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          className={`absolute inset-0 w-full h-full ${zoomClass}`}
        />
      )}
    </div>
  )
}

export default TrailerHover
