import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, Link, useSearchParams, useNavigationType } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { ImageWithFallback } from './components/ImageWithFallback'
import { TrailerHover } from './components/TrailerHover'
import { MovieCard } from './components/MovieCard'
import { CatalogFilterPanel, DRAMA_PRESETS, mediaOf, type ContentType, type DramaKey } from './components/CatalogFilterPanel'
import Navbar from './components/Navbar'
import ScrollRow from './components/ScrollRow'
import { WatchButton } from './components/WatchButton'
import Footer from './components/Footer'
import { type DiscoverFilterValue } from './components/DiscoverFilterSections'
import { fetchWithRateLimit, TMDB_TOKEN } from './utils/api'
import { tmdbImage } from './utils/imageSizes'
import { GENRE_MAP } from './utils/constants'
import { normalizeMovie, normalizeTv, type Movie } from './utils/tmdb'
import { getRegionProviders } from './utils/providers'
import { useRegion } from './utils/region'
import { useLocale } from './utils/locale'
import { useWatchlist } from './utils/watchlist'
import { useDocumentTitle } from './utils/useDocumentTitle'
import {
  fetchDiscoverPage, fetchCuratedPage, GRID_PAGE_SIZE,
  type TMDBListResponse, type DiscoverSort, type AgeBand,
} from './utils/discover'

// Environment validation
if (!TMDB_TOKEN) {
  console.error('Missing VITE_TMDB_TOKEN in .env file. API calls will fail.')
}

type CategoryKey = 'now_playing' | 'trending' | 'popular' | 'top_rated'

const CATEGORY_ENDPOINTS: Record<CategoryKey, { label: string; movie: string; tv: string }> = {
  now_playing: { label: 'Now Playing', movie: '/movie/now_playing', tv: '/tv/on_the_air' },
  trending: { label: 'Trending', movie: '/trending/movie/week', tv: '/trending/tv/week' },
  popular: { label: 'Popular', movie: '/movie/popular', tv: '/tv/popular' },
  top_rated: { label: 'Top Rated', movie: '/movie/top_rated', tv: '/tv/top_rated' },
}

const CATEGORY_OPTIONS = (Object.keys(CATEGORY_ENDPOINTS) as CategoryKey[]).map(key => ({
  key,
  label: CATEGORY_ENDPOINTS[key].label,
}))

// Discover sort per category (see utils/discover for the per-kind field rule).
const CATEGORY_SORT: Record<CategoryKey, DiscoverSort> = {
  now_playing: { movie: 'primary_release_date.desc', tv: 'first_air_date.desc' },
  trending: { movie: 'popularity.desc', tv: 'popularity.desc' },
  popular: { movie: 'popularity.desc', tv: 'popularity.desc' },
  top_rated: { movie: 'vote_average.desc', tv: 'vote_average.desc' },
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton w-full aspect-[2/3] rounded-xl" />
      <div className="skeleton h-5 w-3/4 rounded" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="shrink-0 w-28 sm:w-32 md:w-36">
          <div className="skeleton w-full aspect-[2/3] rounded-xl" />
          <div className="skeleton h-3 w-3/4 rounded mt-1.5" />
        </div>
      ))}
    </div>
  )
}

function HorizontalSection({ title, subtitle, movies, onMovieClick, viewAllLink, isLoading, isError, onRetry }: {
  title: string
  subtitle: string
  movies: Movie[]
  onMovieClick: (m: Movie) => void
  viewAllLink?: string
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}) {
  const isEmpty = movies.length === 0

  return (
    <div className="mb-10 md:mb-14">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary truncate max-w-full">{title}</h2>
          <p className="text-text-muted text-xs">{subtitle}</p>
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="shrink-0 inline-flex items-center gap-1.5 text-sm text-accent hover:text-white font-medium transition-colors">
            See all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
          </Link>
        )}
      </div>

      {/* A failed row used to shimmer forever — it looked like the page was
          still loading. It now says so and offers a retry. */}
      {isEmpty && isError ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-surface-elevated px-4 py-5">
          <p className="text-text-muted text-xs">Couldn't load this row.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-bold text-accent hover:text-white transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      ) : isEmpty ? (
        // Skeleton only while the row is actually in flight — a row that
        // resolved with zero items must not shimmer forever.
        isLoading ? <RowSkeleton /> : (
          <p className="text-text-muted text-xs py-6">Nothing to show here right now.</p>
        )
      ) : (
        <ScrollRow label={title} className="-mx-1">
          {movies.map(m => (
            // movie and tv ids are separate TMDB namespaces and coexist in one
            // rail, so the bare id is not a unique key here.
            <div
              key={`${title}-${m.media_type ?? 'movie'}-${m.id}`}
              role="link"
              tabIndex={0}
              aria-label={`${m.title}${m.release_date ? ` (${m.release_date.slice(0, 4)})` : ''}`}
              onClick={() => onMovieClick(m)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onMovieClick(m)
                }
              }}
              className="shrink-0 w-28 sm:w-32 md:w-36 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
            >
              <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
                <ImageWithFallback
                  src={tmdbImage(m.poster_path, 'poster', 'w342')}
                  alt={m.title}
                  kind="poster"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(min-width: 768px) 144px, (min-width: 640px) 128px, 112px"
                />
                {/* Card chrome (gradient) first, then the preview — the
                    preview layer carries its own pause + title chrome, which
                    must paint ABOVE the gradient, not under it. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <TrailerHover mediaType={m.media_type === 'tv' ? 'tv' : 'movie'} id={m.id} title={m.title} />
                <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-accent text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                  &#9733; {m.vote_average?.toFixed(1)}
                </div>
                <WatchButton
                  compact
                  entry={{ id: m.id, media_type: m.media_type === 'tv' ? 'tv' : 'movie', title: m.title, poster_path: m.poster_path, vote_average: m.vote_average, release_date: m.release_date }}
                />
              </div>
              <p className="text-text-primary text-[11px] font-bold line-clamp-1 mt-1.5 group-hover:text-accent transition-colors">{m.title}</p>
            </div>
          ))}
        </ScrollRow>
      )}
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigationType = useNavigationType()

  // View state lives in the URL, not in useState: opening a title unmounts this
  // page, so component state was lost and Back dumped the user on page 1 with
  // every filter cleared.
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  // Validate every URL value: a hand-edited or stale query string must not crash
  // the grid (CATEGORY_ENDPOINTS[undefined]) or poison the query key (NaN provider).
  const rawCategory = searchParams.get('cat')
  const activeCategory: CategoryKey = rawCategory && rawCategory in CATEGORY_ENDPOINTS ? (rawCategory as CategoryKey) : 'now_playing'
  const activeGenres = useMemo(() => {
    const raw = searchParams.get('genres')
    if (!raw) return []
    return raw.split(',').map(Number).filter(n => Number.isFinite(n) && n > 0)
  }, [searchParams])
  const rawPlatform = Number(searchParams.get('provider'))
  const activePlatform = Number.isFinite(rawPlatform) && rawPlatform > 0 ? rawPlatform : null
  const rawType = searchParams.get('type')
  // 'all' is the default view. The previous default was 'movie', which then had
  // the merged movie+tv page filtered down to movies in the browser — a 20-item
  // page rendered as ~10 tiles, and in a genre/date-heavy week as none. 'all'
  // asks for both kinds server-side, so the page that arrives is the page shown.
  const contentType: ContentType = rawType === 'movie' || rawType === 'tv' || rawType === 'anime' || rawType === 'all' ? rawType : 'all'
  // Drama presets are their own URL dimension: a preset forces TV + drama genre
  // + origin country server-side, and it must survive alongside the Type pills.
  const rawDrama = searchParams.get('drama')
  const activeDrama: DramaKey | null = rawDrama && rawDrama in DRAMA_PRESETS ? (rawDrama as DramaKey) : null

  // --- Discover filters: year / age band ---
  // Validated like every other URL value — a hand-edited `year=abc` must not
  // poison the query key or ship `NaN` to TMDB.
  const yearFrom = useMemo(() => {
    const n = parseInt(searchParams.get('year_from') || '', 10)
    return Number.isFinite(n) && n > 1800 && n < 2100 ? n : null
  }, [searchParams])
  const yearTo = useMemo(() => {
    const n = parseInt(searchParams.get('year_to') || '', 10)
    return Number.isFinite(n) && n > 1800 && n < 2100 ? n : null
  }, [searchParams])
  const rawAge = searchParams.get('age')
  const ageBand: AgeBand | null = rawAge === 'all' || rawAge === 'adult' ? rawAge : null
  const discoverFilterValue: DiscoverFilterValue = { yearFrom, yearTo, ageBand }
  const discoverFilterCount = (yearFrom !== null || yearTo !== null ? 1 : 0) + (ageBand !== null ? 1 : 0)
  const hasDiscoverFilters = discoverFilterCount > 0

  const [showGenres, setShowGenres] = useState(() => searchParams.get('filters') === '1')

  const { region } = useRegion()
  const { locale } = useLocale()
  const { items: watchlistItems } = useWatchlist()

  // --- Scroll key: the URL minus the `filters` flag ---
  // Opening the filter panel writes `filters=1` to the URL (so the panel
  // survives a Back from a detail page), but it is NOT a view change. The key
  // is built from a copy of the params with `filters` removed, so panel
  // toggling is invisible to the scroll machinery below.
  const scrollKey = useMemo(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('filters')
    return next.toString()
  }, [searchParams])

  // Single writer for the URL. `replace` is the default so filter toggling does
  // not stack history entries; paging pushes so Back walks pages, and returning
  // from a detail page only scrolls (React Router has already restored the old
  // entry — a second scrollTo would fight it).
  const updateParams = useCallback((updates: Record<string, string | null>, opts?: { push?: boolean }) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      return next
    }, { replace: !opts?.push })
  }, [setSearchParams])

  // --- Page scroll ---
  // Rule, after the filter-scroll bug: only Back/Forward and a genuine view
  // change may move the viewport.
  //   POP     → restore the position saved for this exact URL
  //   REPLACE → filter writes (panel toggle, every pill) — never scroll. This
  //             was the reported bug: the open panel slid out of view.
  //   PUSH    → the pager rewrites only `page` and scrolls itself to the grid;
  //             any other push is a fresh view and starts at the top.
  const lastScrollStateRef = useRef<{ scrollKey: string; viewKey: string } | null>(null)
  useEffect(() => {
    // "The view, ignoring which page" — a page-only change is the pager.
    const params = new URLSearchParams(scrollKey)
    params.delete('page')
    const viewKey = params.toString()
    const prev = lastScrollStateRef.current
    lastScrollStateRef.current = { scrollKey, viewKey }

    if (navigationType === 'POP') {
      let saved = 0
      try {
        saved = Number(sessionStorage.getItem(`saranin:scroll:home:${scrollKey}`)) || 0
      } catch {
        // storage blocked — staying at the top is acceptable
      }
      if (saved > 0) window.scrollTo({ top: saved })
      return
    }
    if (navigationType === 'REPLACE') return
    if (prev && prev.viewKey === viewKey && prev.scrollKey !== scrollKey) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [scrollKey, navigationType])

  // Record the scroll position so a later Back can land where the user left.
  useEffect(() => {
    const key = `saranin:scroll:home:${scrollKey}`
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        try {
          sessionStorage.setItem(key, String(window.scrollY))
        } catch {
          // storage blocked — best effort only
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [scrollKey])

  const gridTopRef = useRef<HTMLDivElement>(null)

  // --- Current page query: exactly one full page per view ---
  // Two sources, one guarantee (a full, correctly-filtered page):
  //   • any filter on (genre / type / platform / year / age) → /discover,
  //     the only endpoint that can express those constraints server-side.
  //   • no filter at all → the curated feed endpoints, because /discover can only
  //     approximate Trending (popularity.desc ≠ TMDB's trending score) and the
  //     default view must be the real thing.
  // Either way, nothing is filtered down in the browser afterwards — that client
  // pass is what used to leave 19 tiles (or zero) under a "20" label.
  const endpoints = CATEGORY_ENDPOINTS[activeCategory] ?? CATEGORY_ENDPOINTS.now_playing
  const media = mediaOf(contentType)
  const animeOnly = contentType === 'anime'
  // A drama preset forces TV + its origin country server-side; it is a view of
  // its own, so it counts as "filtered" even with every other pill untouched.
  const dramaCountries = activeDrama ? DRAMA_PRESETS[activeDrama].countries : []
  const useDiscover = activePlatform !== null || hasDiscoverFilters || contentType !== 'all' || activeGenres.length > 0 || activeDrama !== null
  const pageQuery = useQuery({
    // Every constraint is part of the key: changing one is a new fetch, never a
    // re-render of the previous filter's page.
    queryKey: ['home', activeCategory, currentPage, activePlatform, region, locale, yearFrom, yearTo, ageBand, media, animeOnly, activeGenres.join(','), activeDrama],
    queryFn: ({ signal }) => useDiscover
      ? fetchDiscoverPage({
          sort: CATEGORY_SORT[activeCategory] ?? CATEGORY_SORT.now_playing,
          providerIds: activePlatform !== null ? [activePlatform] : [],
          page: currentPage,
          voteFloor: activeCategory === 'top_rated',
          // Only the Anime view keeps genre 16; every merged view strips it so
          // "TV Series" and "Anime" stay disjoint.
          excludeAnime: !animeOnly,
          region,
          language: locale,
          yearFrom,
          yearTo,
          media,
          genreIds: activeGenres,
          animeOnly,
          ageBand,
          originCountries: dramaCountries,
          // Page 1 spends one title on the hero — ask for a full grid underneath it.
          heroSlot: currentPage === 1,
          signal,
        })
      : fetchCuratedPage(endpoints.movie, endpoints.tv, currentPage, locale, { heroSlot: currentPage === 1, signal }),
    placeholderData: keepPreviousData,
  })

  // --- Region streaming catalog for the Platform filter ---
  const { data: regionProviders, isError: providersError, refetch: refetchProviders } = useQuery({
    queryKey: ['region_providers', region, locale],
    queryFn: () => getRegionProviders(region, locale),
    staleTime: Infinity,
  })
  const platformOptions = regionProviders ?? []

  // --- Row previews: fixed page 1, movie + tv per row ---
  // These rows are always the curated feeds; they are not filtered, so they never
  // need the /discover path. fetchWithRateLimit de-dupes identical in-flight GETs,
  // so a row that matches the grid's own request costs nothing extra.
  const trendingRow = useQuery({
    queryKey: ['row', 'trending', locale],
    queryFn: () => fetchCuratedPage('/trending/movie/week', '/trending/tv/week', 1, locale),
  })
  const popularRow = useQuery({
    queryKey: ['row', 'popular', locale],
    queryFn: () => fetchCuratedPage('/movie/popular', '/tv/popular', 1, locale),
  })
  const topRatedRow = useQuery({
    queryKey: ['row', 'top_rated', locale],
    queryFn: () => fetchCuratedPage('/movie/top_rated', '/tv/top_rated', 1, locale),
  })

  // --- "Because you saved X": recommendations seeded by the newest watchlist entry ---
  // The seed is the most recently ADDED title; the rail asks TMDB what it
  // recommends for it. One request, page 1, cached per seed.
  const seed = watchlistItems[0]
  const seedType = seed?.media_type === 'tv' ? 'tv' : 'movie'
  const becauseYouSaved = useQuery({
    queryKey: ['because-you-saved', seedType, seed?.id, locale],
    queryFn: async () => {
      const data = await fetchWithRateLimit<TMDBListResponse>(
        `/${seedType}/${seed!.id}/recommendations?language=${locale}&page=1`
      )
      const items = (data.results || []).map(r => (seedType === 'tv' ? normalizeTv(r) : normalizeMovie(r)))
      return items.slice(0, 16)
    },
    enabled: !!seed,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })
  const becauseYouSavedItems = useMemo(() => becauseYouSaved.data ?? [], [becauseYouSaved.data])

  const pageItems = useMemo(() => pageQuery.data?.items ?? [], [pageQuery.data])
  const totalPages = pageQuery.data?.totalPages ?? 1
  const isPageLoading = pageQuery.isLoading
  const isPageFetching = pageQuery.isFetching

  useDocumentTitle(`${endpoints.label} — SARANIN.`)

  // Failed page change must not nuke the screen — only the very first load owns the error page.
  useEffect(() => {
    if (pageQuery.isError && pageQuery.data) toast.error('Failed to load that page. Try again.')
  }, [pageQuery.isError, pageQuery.data])

  const openDetail = useCallback((movie: Movie) => {
    navigate(`/${movie.media_type === 'tv' ? 'tv' : 'movie'}/${movie.id}`)
  }, [navigate])

  // Genres for the pill rail, derived from the current page plus whatever is
  // already selected (a selected pill must always be rendered so it can be
  // toggled back off, even if no title on this page carries that genre).
  const availableGenres = useMemo(() => [...new Set([...pageItems.flatMap(m => m.genre_ids || []), ...activeGenres])]
    .map(id => ({ id, name: GENRE_MAP[id] }))
    .filter(g => g.name)
    .sort((a, b) => a.name.localeCompare(b.name)), [pageItems, activeGenres])

  // Genre, type, platform and the year/age constraints are all applied
  // by TMDB (see the pageQuery above), so the page that arrives is the final one.
  // The only local ordering is Now Playing: discover sorts the two halves but the
  // merged feed interleaves them, and a plain string sort keeps ISO dates
  // chronological (Date.getTime() on a date-only value shifts by timezone).
  const filteredMovies = useMemo(() => {
    if (activeCategory === 'now_playing' && media === 'both') {
      return [...pageItems].sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
    }
    return pageItems
  }, [pageItems, activeCategory, media])

  // Hero only exists on page 1; pages 2+ render every fetched item in the grid.
  const isFirstPage = currentPage === 1
  const featured = isFirstPage ? filteredMovies[0] : undefined
  const gridMovies = isFirstPage ? filteredMovies.slice(1) : filteredMovies

  const scrollToGrid = useCallback(() => {
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Paging is the one action that moves the viewport itself — to the top of the
  // grid, not the very top of the page. A filter that resets the page number
  // must NOT scroll, which is why the scroll effect ignores page changes.
  const goToPage = useCallback((next: number) => {
    const page = Math.max(1, next)
    // Paging is a view change, so the filter panel closes with it — it used to
    // stay open across pages, covering the grid the user had just asked for.
    // The URL flag is cleared in the same write so Back/refresh agree.
    updateParams({ page: page === 1 ? null : String(page), filters: null }, { push: true })
    setShowGenres(false)
    scrollToGrid()
  }, [updateParams, scrollToGrid])

  const toggleCategory = useCallback((key: CategoryKey) => {
    // Category defaults back to now_playing / movie / no genres — same reset the
    // old setState version performed, but written to the URL in one go.
    updateParams({
      cat: key === 'now_playing' ? null : key,
      genres: null,
      type: null,
      drama: null,
      page: null,
    })
  }, [updateParams])

  const toggleGenre = useCallback((id: number) => {
    const next = activeGenres.includes(id)
      ? activeGenres.filter(g => g !== id)
      : [...activeGenres, id]
    updateParams({
      genres: next.length > 0 ? next.join(',') : null,
      page: null,
    })
  }, [activeGenres, updateParams])

  // Single-select platform filter — 'All' clears it. Changing it re-fetches page 1.
  const selectPlatform = useCallback((id: number | null) => {
    // Region drives the provider catalog, so a stale provider from another
    // region must not survive the switch.
    updateParams({
      provider: id === null ? null : String(id),
      genres: null,
      drama: null,
      page: null,
    })
  }, [updateParams])

  const setContentTypeFilter = useCallback((type: ContentType) => {
    // 'all' is the default view, so it drops the param rather than writing it.
    // Picking any standard type clears any active drama preset so they never collide.
    updateParams({
      type: type === 'all' ? null : type,
      drama: null,
      page: null,
    })
  }, [updateParams])

  // Region changes invalidate the provider id — a provider picked in one region
  // may not exist in the newly selected region's catalog. Ref-guarded so mount
  // does not wipe a deep-linked provider.
  const prevRegionRef = useRef(region)
  useEffect(() => {
    if (prevRegionRef.current === region) return
    prevRegionRef.current = region
    updateParams({ provider: null, page: null })
  }, [region, updateParams])

  // Drama presets are single-select — picking one drops the others. A preset
  // implies TV, so the Type pill switches to 'tv' to stay truthful in the UI.
  const selectDrama = useCallback((drama: DramaKey | null) => {
    updateParams({
      drama: drama,
      type: drama ? 'tv' : null,
      page: null,
    })
  }, [updateParams])

  // Year / age are server-side constraints, so any change starts a new result
  // set — page resets, history entry replaced.
  const setDiscoverFilters = useCallback((next: DiscoverFilterValue) => {
    updateParams({
      year_from: next.yearFrom === null ? null : String(next.yearFrom),
      year_to: next.yearTo === null ? null : String(next.yearTo),
      age: next.ageBand,
      page: null,
    })
  }, [updateParams])

  // One writer for "back to defaults": every filter key plus the page number, in
  // a single history entry. Both the header Reset and the empty-state Reset All
  // Filters route through this, so the two can never drift apart.
  const resetFilters = useCallback(() => {
    updateParams({
      cat: null, genres: null, provider: null, type: null, page: null, drama: null,
      year_from: null, year_to: null, age: null,
    })
  }, [updateParams])

  // 'all' is the default view, not a filter — counting it showed a badge of 1 on
  // a pristine home. Drama presets imply type=tv, so type + drama count as one.
  const activeFilterCount = activeGenres.length + (activePlatform !== null ? 1 : 0) + (contentType !== 'all' || activeDrama !== null ? 1 : 0) + discoverFilterCount
  // `activeFilterCount` drives the badge; the Reset control must also appear when
  // only the category moved, since resetFilters clears that too.
  const hasActiveFilters = activeFilterCount > 0 || activeCategory !== 'now_playing'

  const trendingRowItems = useMemo(() => (trendingRow.data?.items ?? []).slice(0, 16), [trendingRow.data])
  const popularRowItems = useMemo(() => (popularRow.data?.items ?? []).slice(0, 16), [popularRow.data])
  const topRatedRowItems = useMemo(() => (topRatedRow.data?.items ?? []).slice(0, 16), [topRatedRow.data])
  // The seed itself must not appear in its own recommendation rail.
  const becauseYouSavedFiltered = useMemo(
    () => seed
      ? becauseYouSavedItems.filter(m => !(m.id === seed.id && (m.media_type ?? 'movie') === seed.media_type))
      : [],
    [becauseYouSavedItems, seed],
  )

  if (pageQuery.isError && !pageQuery.data) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-surface">
        <Navbar />
        <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 md:px-12 pt-6 md:pt-8 pb-8">
          <div className="flex items-center justify-center py-24 px-6">
            <div className="text-center max-w-sm">
              <p className="text-5xl mb-4">&#x1f3ac;</p>
              <p className="text-text-primary text-lg font-semibold mb-2">Something went wrong</p>
              <p className="text-text-muted text-sm">{(pageQuery.error as Error)?.message || 'Failed to load content'}</p>
              <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => pageQuery.refetch()}
                  className="bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform"
                >
                  Try Again
                </button>
                {/* A failing URL is often the fault of its own params — without this
                    escape hatch the user is stuck retrying a request that cannot heal. */}
                {(hasActiveFilters || currentPage > 1) && (
                  <button
                    onClick={resetFilters}
                    className="text-text-muted text-sm font-bold px-6 py-2.5 rounded-full border border-zinc-800 hover:border-red-500 hover:text-red-400 transition-all active:scale-95"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // NOTE: there is deliberately no full-page skeleton gate here. A filter change
  // is now a fetch with no placeholder data, so `isLoading` is true for every
  // filter interaction — an early `return` would unmount the navbar and the open
  // filter panel the user is still clicking in. The chrome and the rails stay
  // mounted; only the grid below swaps to skeletons (see the grid block).

  return (
    <div className="min-h-[100dvh] flex flex-col bg-surface">
      {/* Ambient backdrop behind the hero — page 1 only. Previously a
          radial-gradient() whose color stops were url(...) values, which is invalid
          CSS and painted nothing; this is a real image layer with a CSS fade mask. */}
      {isFirstPage && featured?.backdrop_path ? (
        <div
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-20"
          aria-hidden="true"
          style={{ maskImage: 'linear-gradient(to bottom, black, transparent 85%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 85%)' }}
        >
          <ImageWithFallback
            src={tmdbImage(featured.backdrop_path, 'backdrop', 'w1280')}
            alt=""
            kind="backdrop"
            hideOnError
            className="w-full h-[55vh] object-cover object-top blur-3xl scale-125"
          />
        </div>
      ) : null}

      {/* Navigation */}
      <Navbar />

      <div className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 pt-5 md:pt-8 pb-8">

        {/* Hero / Featured Movie — page 1 only */}
        {featured && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-12 md:mb-16 rounded-xl md:rounded-2xl overflow-hidden group"
          >
            <div className="relative h-[50vh] sm:h-[60vh] md:h-[75vh]">
              {featured.backdrop_path ? (
                <ImageWithFallback
                  src={tmdbImage(featured.backdrop_path, 'backdrop', 'w1280')}
                  alt={featured.title}
                  kind="backdrop"
                  priority
                  fallbackText={null}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-surface-card flex items-center justify-center text-zinc-700 text-4xl font-black">{featured.title}</div>
              )}
              {/* Hover the hero → muted trailer behind the copy (pointer-fine only).
                  Gradients and copy are later siblings, so they keep painting above it. */}
              <TrailerHover
                mediaType={featured.media_type === 'tv' ? 'tv' : 'movie'}
                id={featured.id}
                title={featured.title}
                zoomClass="scale-[1.18]"
              />
              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-surface/80 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 md:p-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <span className="bg-accent/10 text-accent text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full border border-accent/20">
                      Featured
                    </span>
                    <span className="text-white/70 text-xs sm:text-sm font-medium">
                      {featured.release_date?.split('-')[0]}
                    </span>
                    {featured.genre_ids?.slice(0, 2).map(gid => (
                      <span key={gid} className="text-white/70 text-xs sm:text-sm font-medium hidden sm:inline">
                        {GENRE_MAP[gid]}
                      </span>
                    ))}
                  </div>

                  <h2 className="text-2xl sm:text-4xl md:text-6xl font-black tracking-tight text-white mb-3 sm:mb-4 leading-[1.1]">
                    {featured.title}
                  </h2>

                  <p className="text-white/80 text-sm sm:text-base md:text-lg max-w-2xl mb-5 sm:mb-6 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                    {featured.overview}
                  </p>

                  <div className="flex items-center gap-3 sm:gap-4">
                    <button
                      onClick={() => openDetail(featured)}
                      className="bg-white text-black text-xs sm:text-sm font-bold px-5 sm:px-8 py-2.5 sm:py-3 rounded-full hover:bg-accent hover:text-black hover:scale-105 transition-all duration-300 active:scale-95 shadow-lg"
                    >
                      Details
                    </button>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6, duration: 0.3 }}
                      className="text-accent font-mono font-bold text-base sm:text-lg"
                    >
                      &#9733; {featured.vote_average?.toFixed(1)}
                    </motion.span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Movie Category Sections — page 1 only */}
        {isFirstPage && (
          <>
            {/* Because-you-saved sits first: it is the only personalised rail,
                and it only exists once the user has saved something. */}
            {seed && (
              <div>
                <HorizontalSection
                  title={`Because you saved ${seed.title}`}
                  subtitle="Recommendations from your watchlist"
                  movies={becauseYouSavedFiltered}
                  onMovieClick={openDetail}
                  viewAllLink="/watchlist"
                  isLoading={becauseYouSaved.isLoading}
                  isError={becauseYouSaved.isError}
                  onRetry={() => becauseYouSaved.refetch()}
                />
              </div>
            )}
            <div>
              <HorizontalSection title="Trending" subtitle="What's hot this week" movies={trendingRowItems} onMovieClick={openDetail} viewAllLink="/category/trending"
                isLoading={trendingRow.isLoading} isError={trendingRow.isError} onRetry={() => trendingRow.refetch()} />
            </div>
            <div>
              <HorizontalSection title="Popular" subtitle="Most watched right now" movies={popularRowItems} onMovieClick={openDetail} viewAllLink="/category/popular"
                isLoading={popularRow.isLoading} isError={popularRow.isError} onRetry={() => popularRow.refetch()} />
            </div>
            <div>
              <HorizontalSection title="Top Rated" subtitle="Critics' picks" movies={topRatedRowItems} onMovieClick={openDetail} viewAllLink="/category/top_rated"
                isLoading={topRatedRow.isLoading} isError={topRatedRow.isError} onRetry={() => topRatedRow.refetch()} />
            </div>
          </>
        )}

        {/* Section Header + Genre Filters */}
        <motion.div ref={gridTopRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6 md:mb-8 scroll-mt-20"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-text-primary">{endpoints.label}</h3>
              <p className="text-text-muted text-xs sm:text-sm mt-1">
                {/* Page 1 spends one title on the hero, so the grid renders one
                    fewer than the page holds. Saying only the page total is what
                    produced the "says 20, shows 19" report — the count names the
                    grid and the hero is called out beside it. */}
                {isPageFetching || pageQuery.isPlaceholderData
                  ? 'Loading…'
                  : filteredMovies.length === 0
                    ? 'No results on this page'
                    : `${gridMovies.length} in grid${featured ? ' + 1 featured' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Reset lives in the header too: the empty-state copy was
                  unreachable while the active filters still returned results. */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="bg-surface-elevated border border-zinc-800 text-text-muted text-xs font-bold px-4 py-2 rounded-full hover:border-red-500 hover:text-red-400 transition-all active:scale-95"
                >
                  Reset
                </button>
              )}
              <button
                onClick={() => {
                  const next = !showGenres
                  setShowGenres(next)
                  updateParams({ filters: next ? '1' : null })
                }}
                className="bg-surface-elevated border border-zinc-800 text-text-primary text-xs font-bold px-4 py-2 rounded-full hover:border-accent transition-all active:scale-95 flex items-center gap-2"
              >
                {showGenres ? 'Hide Filters' : 'Filters'}
                {activeFilterCount > 0 && (
                  <span className="bg-accent text-black text-[10px] px-1.5 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter pills - collapsible */}
          <CatalogFilterPanel
            open={showGenres}
            categories={CATEGORY_OPTIONS}
            activeCategory={activeCategory}
            onSelectCategory={(key) => toggleCategory(key as CategoryKey)}
            availableGenres={availableGenres}
            activeGenres={activeGenres}
            onClearGenres={() => updateParams({ genres: null, page: null })}
            onToggleGenre={toggleGenre}
            discoverFilterValue={discoverFilterValue}
            onChangeDiscoverFilters={setDiscoverFilters}
            platformOptions={platformOptions}
            activePlatform={activePlatform}
            providersError={providersError}
            onSelectPlatform={selectPlatform}
            onRetryProviders={() => refetchProviders()}
            contentType={contentType}
            activeDrama={activeDrama}
            onSelectContentType={setContentTypeFilter}
            onSelectDrama={selectDrama}
          />
        </motion.div>

        {/* Movie Grid — one full page per view. A filter change is a new query
            with no placeholderData, so there is no data for the key yet: the grid
            shows skeletons and only paints once its own page has landed. */}
        <motion.div
          animate={{ opacity: isPageFetching && !isPageLoading ? 0.45 : 1 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {isPageLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 pb-8">
              {Array.from({ length: GRID_PAGE_SIZE }).map((_, i) => <SkeletonCard key={`grid-skeleton-${i}`} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 pb-8">
              {gridMovies.map((movie) => (
                <MovieCard
                  key={`${activeCategory}-${movie.media_type ?? 'movie'}-${movie.id}`}
                  movie={movie}
                  onOpen={openDetail}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Pagination — Prev / Next only. One page in view at a time. */}
        {filteredMovies.length > 0 && !isPageLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-4 py-8 pb-12"
          >
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || isPageFetching}
              aria-label="Previous page"
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-text-primary hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 active:scale-95"
            >
              ← Prev
            </button>
            <span className="text-text-muted text-xs font-mono tabular-nums min-w-[64px] text-center" aria-live="polite">
              {isPageFetching ? '…' : `Page ${currentPage}`}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={isPageFetching || currentPage >= totalPages}
              aria-label="Next page"
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-text-primary hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 active:scale-95"
            >
              Next →
            </button>
          </motion.div>
        )}

        {/* Empty state with smart suggestions — gated on the fetch having settled,
            otherwise a page that is still loading flashes "No results". */}
        {filteredMovies.length === 0 && !isPageLoading && !isPageFetching && !pageQuery.isPlaceholderData && !pageQuery.isError && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">&#x1f50d;</p>
            <p className="text-text-primary text-sm font-bold mb-2">No results on this page</p>
            <p className="text-text-muted text-xs mb-6">Try the next page, adjust filters, or explore these suggestions</p>

            {/* Smart suggestions based on current filters */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={isPageFetching || currentPage >= totalPages}
                className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Go to Next Page
              </button>
              {contentType === 'anime' && (
                <button
                  onClick={() => setContentTypeFilter('all')}
                  className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all"
                >
                  Show All Content
                </button>
              )}
              {contentType !== 'anime' && (
                <button
                  onClick={() => setContentTypeFilter('anime')}
                  className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all"
                >
                  Browse Anime
                </button>
              )}
              <button
                onClick={resetFilters}
                className="text-xs font-medium px-4 py-2 rounded-full bg-accent text-black hover:bg-accent/90 transition-all"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TMDB attribution — required by the API terms */}
      <Footer />
    </div>
  )
}
