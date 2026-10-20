// Shared /discover machinery — every filter in the grid column is applied by
// TMDB, never by the client.
//
// Why: the genre / platform / type / year filters used to run in the browser over
// a single 20-item TMDB page. "Anime" is the clearest failure — Japanese animation
// is roughly 1 item per 40, so the page was cut to 0-2 tiles while the header kept
// promising a full page, and `keepPreviousData` painted the previous, wrong-filter
// tiles over the wait. Server-side constraints plus a fixed GRID_PAGE_SIZE view
// mean one rendered page is always 20 correctly-filtered titles.
//
// Keeping the request shape in one place stops home, category and search drifting.

import { fetchWithRateLimit } from './api'
import { normalizeMovie, normalizeTv, dedupById, type Movie } from './tmdb'
import { DEFAULT_REGION } from './region'

export const TMDB_MAX_PAGE = 500
export const VOTE_COUNT_FLOOR = '200' // keeps vote_average.desc from surfacing 1-vote obscurities
export const REGIONAL_VOTE_COUNT_FLOOR = '5' // realistic vote floor for regional/sinetron/dramas on TMDB
export const ANIMATION_GENRE = '16' // the TV half of a combined grid strips anime
/** One visible grid page. TMDB answers 20 per kind; a merged page is sliced to this. */
export const GRID_PAGE_SIZE = 20

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

/** Which /discover endpoints back the view: one kind, or both merged into one page. */
export type DiscoverMedia = 'movie' | 'tv' | 'both'

/**
 * Age-rating band, server-side via US certifications (TMDB's `adult` flag is
 * always false on discover results — verified against the live API — so the
 * certification params are the only working constraint).
 *   'all'   → G|PG|PG-13 (movie) / TV-G|TV-Y|TV-Y7|TV-PG (tv)
 *   'adult' → R|NC-17 (movie) / TV-MA (tv)
 * Unrated (NR) titles carry no certification and land in neither band.
 */
export type AgeBand = 'all' | 'adult'

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
  /** default 'both' — one merged movie+tv page */
  media?: DiscoverMedia
  /** genre ids, OR'd together (TMDB reads `a|b` as OR) */
  genreIds?: number[]
  /** Japanese animation only — with_genres=16 + with_original_language=ja */
  animeOnly?: boolean
  /**
   * Age-rating band. TMDB's `adult` flag is useless as a filter (it is false on
   * everything discover returns), so this uses US certifications server-side:
   *   all   → certification.lte PG-13 / TV-PG (family-friendly only)
   *   adult → certification.gte R / TV-MA
   */
  ageBand?: AgeBand | null
  /**
   * Restrict to titles ORIGINATING from these countries (ISO 3166-1, OR'd —
   * TMDB reads `KR|CN` as either). This is what powers the drama presets:
   * Sinetron (ID), Drakor (KR) and Dracin (CN) are defined by origin, not by
   * genre alone.
   */
  originCountries?: string[]
  /**
   * True when this view also renders a hero from the first item (home page 1).
   * A merged request then targets GRID_PAGE_SIZE grid tiles PLUS the hero, so the
   * grid is not left one short — the "says 20, shows 19" report.
   *
   * Single-kind views draw from a two-page TMDB window (see fetchDiscoverPage),
   * so 20 grid tiles + 1 hero is reachable for movie-only and tv-only too.
   */
  heroSlot?: boolean
  /** Optional signal for cancelling out-of-date queries */
  signal?: AbortSignal
}

// Cross-media genre mapping between TMDB Movie genres and TV series genres:
//   Movie 28 (Action) & 12 (Adventure) <-> TV 10759 (Action & Adventure)
//   Movie 14 (Fantasy) & 878 (Sci-Fi)   <-> TV 10765 (Sci-Fi & Fantasy)
//   Movie 10752 (War)                   <-> TV 10768 (War & Politics)
function mapGenresForKind(genreIds: number[], kind?: 'movie' | 'tv'): number[] {
  if (!kind) return genreIds
  const result = new Set<number>()
  for (const id of genreIds) {
    result.add(id)
    if (kind === 'tv') {
      if (id === 28 || id === 12) result.add(10759)
      if (id === 14 || id === 878) result.add(10765)
      if (id === 10752) result.add(10768)
    } else if (kind === 'movie') {
      if (id === 10759) { result.add(28); result.add(12) }
      if (id === 10765) { result.add(14); result.add(878) }
      if (id === 10768) result.add(10752)
    }
  }
  return [...result]
}

export function buildDiscoverParams(opts: DiscoverOptions, kind?: 'movie' | 'tv'): URLSearchParams {
  const params = new URLSearchParams({
    language: opts.language ?? 'en-US',
    page: String(opts.page),
    sort_by: kind ? opts.sort[kind] : opts.sort.movie,
  })
  // Provider + region only constrain the query when a provider was picked;
  // watch_region alone would silently narrow every discover request.
  if (opts.providerIds.length > 0) {
    params.set('watch_region', opts.region ?? DEFAULT_REGION)
    params.set('with_watch_providers', opts.providerIds.join('|'))
    params.set('with_watch_monetization_types', 'flatrate')
  }
  if (opts.voteFloor) {
    const isRegional = (opts.originCountries || []).length > 0
    params.set('vote_count.gte', isRegional ? REGIONAL_VOTE_COUNT_FLOOR : VOTE_COUNT_FLOOR)
  }
  // Origin countries — the drama presets. Pipe = OR, so `KR|CN` accepts either.
  const countries = (opts.originCountries || []).filter(c => /^[A-Z]{2}$/.test(c))
  if (countries.length > 0) params.set('with_origin_country', countries.join('|'))
  // Age band → US certifications. The certification_* params are applied per
  // kind below (movie and tv use different rating tokens), so only the band's
  // direction is decided here.
  if (opts.ageBand) params.set('certification_country', 'US')

  // Genres. A pipe (`a|b`) is OR, a comma (`a,b`) is AND — the two cannot be
  // mixed, so the anime case ANDs the animation genre onto the picked ones
  // ("anime in Drama"), while the plain case ORs them.
  const rawGenres = [...(opts.genreIds ?? [])].filter(n => Number.isFinite(n) && n > 0)
  const genres = mapGenresForKind(rawGenres, kind)
  if (opts.animeOnly) {
    if (!genres.includes(Number(ANIMATION_GENRE))) genres.unshift(Number(ANIMATION_GENRE))
    params.set('with_genres', genres.join(','))
    params.set('with_original_language', 'ja')
  } else if (genres.length > 0) {
    params.set('with_genres', genres.join('|'))
  }
  return params
}

/**
 * One discover "page" = GRID_PAGE_SIZE titles, all of them matching the active
 * filters. `media: 'both'` merges a movie request and a tv request, dedupes them
 * and slices the result back to one full page.
 */
export async function fetchDiscoverPage(opts: DiscoverOptions, signal?: AbortSignal): Promise<CombinedPage> {
  const media = opts.media ?? 'both'
  const optSignal = signal ?? opts.signal

  const build = (kind: 'movie' | 'tv', page: number) => {
    const params = buildDiscoverParams({ ...opts, page }, kind)
    params.set('sort_by', opts.sort[kind])
    // The anime strip is a TV-half concern only — and animeOnly is the one mode
    // that must keep the animation genre.
    if (opts.excludeAnime && !opts.animeOnly && kind === 'tv') params.set('without_genres', ANIMATION_GENRE)
    // Year bounds are per-kind date fields — movie and tv do not share one.
    const dateGte = kind === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte'
    const dateLte = kind === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte'
    if (opts.yearFrom) params.set(dateGte, `${opts.yearFrom}-01-01`)
    if (opts.yearTo) params.set(dateLte, `${opts.yearTo}-12-31`)
    // Age band → the kind's own rating tokens (movie: G/PG/PG-13/R/NC-17;
    // tv: TV-Y…/TV-MA). `lte` keeps the family-friendly band inclusive of the
    // everything-under-R set; `gte` on R/TV-MA isolates the adult half.
    if (opts.ageBand === 'all') {
      params.set('certification.lte', kind === 'movie' ? 'PG-13' : 'TV-PG')
    } else if (opts.ageBand === 'adult') {
      params.set('certification.gte', kind === 'movie' ? 'R' : 'TV-MA')
    }
    return `/discover/${kind}?${params.toString()}`
  }

  const clampPages = (n: number) => Math.max(1, Math.min(TMDB_MAX_PAGE, n || 1))
  // One extra title on a hero view, so slicing off the hero still leaves a full grid.
  const takeSize = opts.heroSlot ? GRID_PAGE_SIZE + 1 : GRID_PAGE_SIZE

  if (media === 'both') {
    const [movieData, tvData] = await Promise.all([
      fetchWithRateLimit<TMDBListResponse>(build('movie', opts.page), { signal: optSignal }),
      fetchWithRateLimit<TMDBListResponse>(build('tv', opts.page), { signal: optSignal }),
    ])
    // Movie and TV live in separate id namespaces, so the two halves can never
    // collide here — a merged page always yields ~40 candidates before slicing.
    const items = dedupById(
      (movieData.results || []).map(normalizeMovie),
      (tvData.results || []).map(normalizeTv),
    ).slice(0, takeSize)
    return { items, totalPages: clampPages(Math.max(movieData.total_pages || 1, tvData.total_pages || 1)) }
  }

  // --- Single-kind views: a two-page window per view page --------------------
  // /discover returns at most 20 results per page and has no page-size param,
  // so a movie-only (or tv-only) hero page used to ship 20 titles total — one
  // became the hero and the grid rendered 19 ("kadang ga sampai 20"). Two TMDB
  // pages per view page fixes it without duplicating rows across pages:
  //   view page 1 → TMDB 1+2 · view page 2 → TMDB 3+4 · …
  // Two requests per page — exactly what the merged branch already costs.
  const firstTmdbPage = Math.min(TMDB_MAX_PAGE, (opts.page - 1) * 2 + 1)
  const secondTmdbPage = Math.min(TMDB_MAX_PAGE, firstTmdbPage + 1)
  const [data, nextData] = await Promise.all([
    fetchWithRateLimit<TMDBListResponse>(build(media, firstTmdbPage), { signal: optSignal }),
    secondTmdbPage > firstTmdbPage
      ? fetchWithRateLimit<TMDBListResponse>(build(media, secondTmdbPage), { signal: optSignal })
      : Promise.resolve<TMDBListResponse>({ results: [] }),
  ])
  const normalize = media === 'tv' ? normalizeTv : normalizeMovie
  const items = dedupById(
    (data.results || []).map(normalize),
    (nextData.results || []).map(normalize),
  ).slice(0, takeSize)
  // View pages are half as many as TMDB pages — round up so a partial tail page
  // is still reachable.
  return { items, totalPages: clampPages(Math.ceil((data.total_pages || 1) / 2)) }
}

/**
 * The curated feed page, for a view with no server-side filter active.
 *
 * Why this exists next to fetchDiscoverPage: /discover can only approximate the
 * Trending row (popularity.desc is not TMDB's trending score), so the unfiltered
 * default view keeps its real feed endpoints. As soon as any filter is on — genre,
 * type, platform, year/rating/runtime — the view switches to /discover, which is
 * the only surface that can express those constraints.
 *
 * A curated movie page and tv page are merged and sliced to one grid page, so the
 * caller gets the same shape (and the same full-page guarantee) either way.
 */
export async function fetchCuratedPage(
  movieEndpoint: string,
  tvEndpoint: string,
  page: number,
  language: string,
  opts?: { heroSlot?: boolean; signal?: AbortSignal },
): Promise<CombinedPage> {
  const [movieData, tvData] = await Promise.all([
    fetchWithRateLimit<TMDBListResponse>(`${movieEndpoint}?language=${language}&page=${page}`, { signal: opts?.signal }),
    fetchWithRateLimit<TMDBListResponse>(`${tvEndpoint}?language=${language}&page=${page}`, { signal: opts?.signal }),
  ])
  const takeSize = opts?.heroSlot ? GRID_PAGE_SIZE + 1 : GRID_PAGE_SIZE
  const items = dedupById(
    (movieData.results || []).map(normalizeMovie),
    (tvData.results || []).map(normalizeTv),
  ).slice(0, takeSize)
  const totalPages = Math.max(1, Math.min(TMDB_MAX_PAGE, Math.max(movieData.total_pages || 1, tvData.total_pages || 1)))
  return { items, totalPages }
}
