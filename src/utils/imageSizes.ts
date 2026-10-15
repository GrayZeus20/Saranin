// TMDB's image CDN does NOT accept one shared set of width tokens. Each image
// TYPE owns its own ladder, and a token outside it fails outright (HTTP 400)
// rather than falling back to the nearest size. Verified against the live CDN:
//
//   /t/p/w185/<person profile>   → 200
//   /t/p/w632/<person profile>   → 400   (632 exists only as h632 — a HEIGHT)
//   /t/p/h632/<person profile>   → 200
//
// The old code fed every image through ONE poster-centric ladder, so a srcset
// could hand the browser a token the CDN rejects — which is how portraits and
// logos vanished on HiDPI screens. This module is the single source of truth
// for which tokens each type owns.

import { IMG_BASE } from './api'

export const IMAGE_KINDS = ['poster', 'backdrop', 'logo', 'profile', 'still'] as const
export type ImageKind = (typeof IMAGE_KINDS)[number]

const LADDERS: Record<ImageKind, readonly string[]> = {
  poster: ['w92', 'w154', 'w185', 'w300', 'w342', 'w500', 'w780'],
  backdrop: ['w300', 'w780', 'w1280'],
  logo: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500'],
  // h632, not w632: the tallest profile variant is a HEIGHT token on the CDN
  // and w632 is answered with HTTP 400 (verified against the live service).
  profile: ['w45', 'w185', 'h632'],
  still: ['w92', 'w185', 'w300'],
}

// Sizes are pixel counts; the token prefix only says which axis it caps. The
// number drives srcset's `w` descriptor, so h632 reports 632.
const WIDTHS: Record<string, number> = {
  w45: 45, w92: 92, w154: 154, w185: 185, w300: 300,
  w342: 342, w500: 500, w780: 780, w1280: 1280,
  h632: 632,
}

/** The token used when a call site does not name one. */
export const DEFAULT_SIZE: Record<ImageKind, string> = {
  poster: 'w342',
  backdrop: 'w780',
  logo: 'w154',
  profile: 'w185',
  still: 'w185',
}

// Both token shapes TMDB serves: width tokens (w92 … w1280) and the profile
// family's height token (h632). A regex that only knew /w\d+/ reported every
// h632 URL as "not a TMDB image", which silently disabled its srcset.
const URL_RE = /^(.*\/)(w\d+|h\d+|original)(\/.*)$/

/** Pull the size token out of a TMDB image URL, or null when it is not one. */
export function sizeTokenOf(src: string): string | null {
  const m = src.match(URL_RE)
  return m ? m[2] : null
}

/** Is this token valid for that image type? The check the old code lacked. */
export function isValidSize(kind: ImageKind, token: string | null): boolean {
  return !!token && LADDERS[kind].indexOf(token) !== -1
}

/**
 * Responsive srcset for one TMDB image: only the tokens that belong to this
 * image's TYPE and sit at or above the size the call site asked for. Never a
 * smaller file than requested, and never an invalid token the browser would
 * 404 on when it picks its 2x candidate.
 *
 * Returns undefined when the call site passed no `sizes` (without one the
 * browser assumes 100vw and over-fetches), when the URL is not a TMDB image,
 * or when the token is outside the type's ladder.
 */
export function buildSrcSet(src: string, kind: ImageKind, sizes?: string): string | undefined {
  if (!src || !sizes) return undefined
  const m = src.match(URL_RE)
  if (!m) return undefined
  const prefix = m[1]
  const current = m[2]
  const suffix = m[3]
  const ladder = LADDERS[kind]
  const index = ladder.indexOf(current)
  if (index === -1) return undefined
  const variants = ladder.slice(index)
  if (variants.length < 2) return undefined
  return variants.map(size => `${prefix}${size}${suffix} ${WIDTHS[size]}w`).join(', ')
}

/**
 * Build a TMDB image URL. A size that does not belong to the type is replaced
 * by the type's default, so no call site can construct a 404 by hand.
 */
export function tmdbImage(
  path: string | null | undefined,
  kind: ImageKind,
  size: string = DEFAULT_SIZE[kind],
): string {
  if (!path) return ''
  const token = isValidSize(kind, size) ? size : DEFAULT_SIZE[kind]
  return `${IMG_BASE}/${token}${path}`
}

/**
 * Inspectable state dump for this module — the valid token set per image type.
 * `window.__saraninImageSizes` in dev, so the ladder can be read from a live
 * console instead of trusted from the source.
 */
export function imageSizeManifest(): Record<ImageKind, readonly string[]> {
  return LADDERS
}
