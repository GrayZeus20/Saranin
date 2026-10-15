import { useEffect, useMemo, useRef, useState } from 'react'

// TMDB serves every asset at a fixed ladder of widths. A poster is requested
// once per breakpoint tier and the browser picks by viewport + DPR, instead of
// every phone pulling the desktop-sized file.
const TMDB_SIZES = ['w92', 'w154', 'w185', 'w300', 'w342', 'w500', 'w780', 'original'] as const

function buildSrcSet(src: string): string | undefined {
  const match = src.match(/^(.*\/)(w\d+|original)(\/.*)$/)
  if (!match) return undefined
  const [, prefix, current, suffix] = match
  const index = TMDB_SIZES.indexOf(current as (typeof TMDB_SIZES)[number])
  if (index === -1) return undefined
  // Only offer variants at or above the requested size — never make the browser
  // download a *smaller* file than the call site asked for, and never claim
  // width descriptors we cannot know ("original" has no fixed width).
  const variants = TMDB_SIZES.slice(index, -1)
  if (variants.length < 2) return undefined
  const widths: Record<string, number> = { w92: 92, w154: 154, w185: 185, w300: 300, w342: 342, w500: 500, w780: 780 }
  return variants.map((size) => `${prefix}${size}${suffix} ${widths[size]}w`).join(', ')
}

export function ImageWithFallback({ src, alt, className, fallbackText, sizes }: {
  src: string; alt: string; className?: string; fallbackText?: string; sizes?: string
}) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Only offer a srcset when the call site also declares `sizes`. Without one
  // the browser treats the srcset as 100vw and every tiny thumbnail asks for
  // the largest variant — worse than the plain src it replaced.
  const srcSet = useMemo(() => (src && sizes ? buildSrcSet(src) : undefined), [src, sizes])

  // A mounted instance can be handed a new src (rail cards and grids get reused
  // as data swaps under them), and the previous instance's verdict no longer
  // applies: an image that errored before must retry, and a loaded one must
  // re-enter its skeleton until the new src paints. Also adopt an image that
  // finished before React attached onLoad — a browser-cached poster fires no
  // second load event, leaving it at opacity-0 behind its own skeleton forever.
  useEffect(() => {
    setError(false)
    setLoaded(false)
    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) setLoaded(true)
  }, [src])

  if (error || !src) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 text-zinc-600 ${className}`}>
        <span className="text-2xl font-bold">{fallbackText || alt.charAt(0)}</span>
      </div>
    )
  }

  return (
    <>
      {!loaded && <div className={`absolute inset-0 skeleton rounded-xl`} />}
      <img
        ref={imgRef}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
        decoding="async"
      />
    </>
  )
}
