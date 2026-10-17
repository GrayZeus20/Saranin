import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSrcSet, isValidSize, sizeTokenOf, type ImageKind } from '../utils/imageSizes'

// One image element for the whole app. Two things it must never get wrong:
//
//  1. The srcset must only offer width tokens that belong to THIS image's type.
//     TMDB 404s a token from another type's ladder, which is how actor
//     portraits and production logos used to vanish on HiDPI screens.
//  2. A failure must leave something visible in place of the image. The old
//     bare <img> call sites hid themselves with `style.display = 'none'` and
//     left a blank hole — and because that mutation outlived the element, a
//     later valid src stayed hidden too.
export function ImageWithFallback({ src, alt, className, fallbackText, fallbackClassName, skeletonClassName, sizes, kind = 'poster', priority = false, hideOnError = false }: {
  src: string
  /**
   * Optional on purpose. The type says every caller has a title, but the API
   * does not always agree — a TV payload's nested results have `name`, not
   * `title`, so `alt` can arrive undefined. Reading `.charAt` off it crashed
   * the entire detail tree; an image component must never be able to do that.
   */
  alt?: string
  className?: string
  /** undefined → the alt text's first letter. null → render no letter at all. */
  fallbackText?: string | null
  fallbackClassName?: string
  /** Radius for the loading skeleton — matches the host box. */
  skeletonClassName?: string
  sizes?: string
  /** Which TMDB ladder this image's path belongs to. */
  kind?: ImageKind
  /** Above-the-fold hero: load eagerly instead of lazily. */
  priority?: boolean
  /**
   * Decorative layer: paint nothing at all when the image cannot load. Without
   * this a failed image still paints its placeholder box, which behind a blur
   * and a low-opacity mask reads as a grey wash over the page.
   */
  hideOnError?: boolean
}) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Only offer a srcset when the call site also declares `sizes`. Without one
  // the browser treats the srcset as 100vw and every tiny thumbnail asks for
  // the largest variant — worse than the plain src it replaced.
  const srcSet = useMemo(() => buildSrcSet(src, kind, sizes), [src, kind, sizes])

  // Dev-only watchdog for the exact class of bug this component exists to
  // survive: a call site asking for a size its image type does not ship. It is
  // invisible in production, where it would be noise rather than a fix.
  useEffect(() => {
    if (!import.meta.env?.DEV || !src) return
    const token = sizeTokenOf(src)
    if (isValidSize(kind, token)) return
    console.warn(
      `[image] "${token ?? 'unrecognised size'}" is not a valid ${kind} size — this request will 404. ` +
      `See utils/imageSizes.ts for the per-type ladder. src=${src}`
    )
  }, [src, kind])

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

  const letter = fallbackText !== undefined ? fallbackText : (alt || '').charAt(0)

  if (error || !src) {
    if (hideOnError) return null
    return (
      <div className={`flex items-center justify-center bg-zinc-800 text-zinc-600 ${className || ''} ${fallbackClassName || ''}`}>
        {letter ? <span className="text-2xl font-bold">{letter}</span> : null}
      </div>
    )
  }

  return (
    <>
      {!loaded && <div className={`absolute inset-0 skeleton ${skeletonClassName || 'rounded-xl'}`} />}
      <img
        ref={imgRef}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt || ''}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading={priority ? 'eager' : 'lazy'}
        // React 18 does not know `fetchPriority` and warns on the camelCase
        // prop; the DOM attribute itself is lowercase, so it is passed verbatim.
        {...(priority ? { fetchpriority: 'high' } as Record<string, string> : {})}
        decoding="async"
      />
    </>
  )
}

export default ImageWithFallback
