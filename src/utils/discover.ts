// Shared /discover machinery for watch-provider ("platform") filtering.
//
// Home and CategoryPage both offer a Netflix / Prime / … filter. The filter is
// server-side: instead of loading a page of 20 titles and client-filtering them
// down to nothing, we ask TMDB for titles carried by that provider in the region.
// Keeping the request shape in one place stops the two pages drifting apart.

import { fetchWithRateLimit } from './api'
import { normalizeMovie, normalizeTv, dedupById, type Movie } from './tmdb'
import { DEFAULT_REGION } from './region'

export const TMDB_MAX_PAGE = 500
export const VOTE_COUNT_FLOOR = '200' // keeps vote_average.desc from surfacing 1-vote obscurities
export const ANIMATION_GENRE = '16' // the TV half of a combined grid strips anime

export interface CombinedPage {
  items: Movie[]
  totalPages: number
}

export interface TMDBListResponse {
  results?: any[]
  total_pages?: number
}

// Sort field per media kind. /discover/tv only honours TV sort fields — sending a
// movie field (e.g. primary_release_date) makes TMDB silently fall back to its
// default order instead of erroring, which quietly scrambled the TV half.
export interface DiscoverSort {
  movie: string
  tv: string
}

/** Runtime filter presets — minutes. Bands keep the UI to three pills. */
export type RuntimeBand = 'short' | 'medium' | 'long'

export function runtimeRange(band: RuntimeBand): { from: number | null; to: number | null } {
  if (band === 'short') return { from: null, to: 90 }
  if (band === 'medium') return { from: 90, to: 120 }
  return { from: 120, to: null }
}

export interface DiscoverOptions {
  /** movie + tv sort fields */
  sort: DiscoverSort
  /** provider ids are OR'd together by TMDB; empty = no provider constraint */
  providerIds: number[]
  page: number
  /** true keeps vote_average.desc from surfacing 1-vote obscurities */
  voteFloor?: boolean
  /** strip anime (genre 16) from the TV half so TV Series + Anime stay disjoint */
  excludeAnime?: boolean
  region?: string
  /** content language for titles/overviews */
  language?: string
  /** earliest release/air year, inclusive */
  yearFrom?: number | null
  /** latest release/air year, inclusive */
  yearTo?: number | null
  /** vote_average.gte — a floor, so 7 shows 7.0 and up */
  ratingFloor?: number | null
  /** with_runtime.gte / .lte in minutes */
  runtimeFrom?: number | null
  runtimeTo?: number | null
}

export function buildDiscoverParams(opts: DiscoverOptions): URLSearchParams {
  const params = new URLSearchParams({
    language: opts.language ?? 'en-US',
    page: String(opts.page),
    sort_by: opts.sort.movie,
  })
  // Provider + region only constrain the query when a provider was picked;
  // watch_region alone would silently narrow every discover request.
  if (opts.providerIds.length > 0) {
    params.set('watch_region', opts.region ?? DEFAULT_REGION)
    params.set('with_watch_providers', opts.providerIds.join('|'))
    params.set('with_watch_monetization_types', 'flatrate')
  }
  if (opts.voteFloor) params.set('vote_count.gte', VOTE_COUNT_FLOOR)
  if (opts.ratingFloor) params.set('vote_average.gte', String(opts.ratingFloor))
  if (opts.runtimeFrom) params.set('with_runtime.gte', String(opts.runtimeFrom))
  if (opts.runtimeTo) params.set('with_runtime.lte', String(opts.runtimeTo))
  return params
}

/** One discover "page" = a movie request + a tv request, deduped into one list. */
export async function fetchDiscoverPage(opts: DiscoverOptions): Promise<CombinedPage> {
  const build = (kind: 'movie' | 'tv') => {
    const params = buildDiscoverParams(opts)
    params.set('sort_by', opts.sort[kind])
    if (opts.excludeAnime && kind === 'tv') params.set('without_genres', ANIMATION_GENRE)
    // Year bounds are per-kind date fields — movie and tv do not share one.
    const dateGte = kind === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte'
    const dateLte = kind === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte'
    if (opts.yearFrom) params.set(dateGte, `${opts.yearFrom}-01-01`)
    if (opts.yearTo) params.set(dateLte, `${opts.yearTo}-12-31`)
    return `/discover/${kind}?${params.toString()}`
  }
  const [movieData, tvData] = await Promise.all([
    fetchWithRateLimit<TMDBListResponse>(build('movie')),
    fetchWithRateLimit<TMDBListResponse>(build('tv')),
  ])
  const items = dedupById(
    (movieData.results || []).map(normalizeMovie),
    (tvData.results || []).map(normalizeTv),
  )
  const totalPages = Math.max(1, Math.min(TMDB_MAX_PAGE, Math.max(movieData.total_pages || 1, tvData.total_pages || 1)))
  return { items, totalPages }
}
