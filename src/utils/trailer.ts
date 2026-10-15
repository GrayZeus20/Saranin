// Trailer hover preview — one muted YouTube snippet per hovered card.
//
// The video key is fetched lazily on intent (hover + delay) and cached for the
// session, so a browsing pass costs one small /videos call per title hovered —
// never a player load until the pointer actually rests on a card.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWithRateLimit } from './api'

interface VideosResponse {
  results?: Array<{ key: string; site: string; type: string; official?: boolean }>
}

// How long a snippet plays before it returns to the poster — a preview, not a
// player. Hovering again restarts it.
export const PREVIEW_SECONDS = 6

// Fine pointer with motion allowed only: a touch device must not mount an embed
// behind a tap, and "reduce motion" users get the static poster.
function canHoverPreview(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function pickTrailerKey(results: VideosResponse['results']): string | null {
  const list = results || []
  const pick =
    list.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
    list.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    list.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ||
    null
  return pick?.key ?? null
}

export function useTrailerHover(mediaType: 'movie' | 'tv', id: number) {
  const [hovering, setHovering] = useState(false)
  const [armed, setArmed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const canHover = useMemo(canHoverPreview, [])

  // Short intent delay: a pointer crossing the card on the way somewhere else
  // must not fire a request or mount an embed.
  useEffect(() => {
    if (!canHover || !hovering) {
      setArmed(false)
      return
    }
    const timer = setTimeout(() => setArmed(true), 500)
    return () => clearTimeout(timer)
  }, [canHover, hovering])

  const { data: videoKey } = useQuery({
    queryKey: ['trailer-key', mediaType, id],
    queryFn: async () => {
      const data = await fetchWithRateLimit<VideosResponse>(`/${mediaType}/${id}/videos?language=en-US`)
      return pickTrailerKey(data.results)
    },
    enabled: canHover && armed,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 0,
  })

  // Play once the key resolves, stop after the budget.
  useEffect(() => {
    if (!hovering || !videoKey) {
      setPlaying(false)
      return
    }
    setPlaying(true)
    const timer = setTimeout(() => setPlaying(false), PREVIEW_SECONDS * 1000)
    return () => {
      clearTimeout(timer)
      setPlaying(false)
    }
  }, [hovering, videoKey])

  const onEnter = useCallback(() => setHovering(true), [])
  const onLeave = useCallback(() => setHovering(false), [])

  return { videoKey: playing ? videoKey ?? null : null, onEnter, onLeave }
}
