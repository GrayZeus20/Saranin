import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, Link, useSearchParams, useNavigationType } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { ImageWithFallback } from '../components/ImageWithFallback'
import { TrailerHover } from '../components/TrailerHover'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { WatchButton } from '../components/WatchButton'
import { fetchWithRateLimit, IMG_BASE } from '../utils/api'
import { GENRE_MAP, formatDate } from '../utils/constants'
import { normalizeMovie, normalizeTv, dedupById, type Movie } from '../utils/tmdb'
import { getRegionProviders } from '../utils/providers'
import { useRegion } from '../utils/region'
import { useLocale } from '../utils/locale'
import { useDocumentTitle } from '../utils/useDocumentTitle'
import {
  fetchDiscoverPage, runtimeRange, TMDB_MAX_PAGE,
  type CombinedPage, type TMDBListResponse, type DiscoverSort, type RuntimeBand,
} from '../utils/discover'
import { DiscoverFilterSections, type DiscoverFilterValue } from '../components/DiscoverFilterSections'

type ContentType = 'all' | 'movie' | 'tv' | 'anime'

const TITLES: Record<string, string> = {
  trending: 'Trending',
  popular: 'Popular',
  top_rated: 'Top Rated',
  now_playing: 'Now Playing',
}

// Map category to both movie and TV endpoints
const ENDPOINT_MAP: Record<string, { movie: string; tv: string }> = {
  trending: { movie: '/trending/movie/week', tv: '/trending/tv/week' },
  popular: { movie: '/movie/popular', tv: '/tv/popular' },
  top_rated: { movie: '/movie/top_rated', tv: '/tv/top_rated' },
  now_playing: { movie: '/movie/now_playing', tv: '/tv/on_the_air' },
}

// Same per-category discover sort the home page uses (see utils/discover).
const CATEGORY_SORT: Record<string, DiscoverSort> = {
  trending: { movie: 'popularity.desc', tv: 'popularity.desc' },
  popular: { movie: 'popularity.desc', tv: 'popularity.desc' },
  top_rated: { movie: 'vote_average.desc', tv: 'vote_average.desc' },
  now_playing: { movie: 'primary_release_date.desc', tv: 'first_air_date.desc' },
}

function isAnime(m: Movie): boolean {
  return !!m.genre_ids?.includes(16) && m.original_language === 'ja'
}

// Single source of truth for the Type filter. "TV Series" excludes anime so an
// anime show is not listed under both TV Series and Anime.
function matchesType(m: Movie, type: ContentType): boolean {
  if (type === 'all') return true
  if (type === 'anime') return isAnime(m)
  if (type === 'tv') return m.media_type === 'tv' && !isAnime(m)
  return m.media_type === type
}

export default function CategoryPage() {
  const { type } = useParams<{ type: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigationType = useNavigationType()

  // View state lives in the URL, same as home: opening a title unmounts this
  // page, so the old useState version dumped the user back on page 1 with every
  // filter cleared whenever they pressed Back from a detail page. Every value is
  // validated so a hand-edited query string cannot poison the query key.
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const activeGenres = useMemo(() => {
    const raw = searchParams.get('genres')
    if (!raw) return []
    return raw.split(',').map(Number).filter(n => Number.isFinite(n) && n > 0)
  }, [searchParams])
  const rawPlatform = Number(searchParams.get('provider'))
  const activePlatform = Number.isFinite(rawPlatform) && rawPlatform > 0 ? rawPlatform : null
  const rawType = searchParams.get('type')
  const contentType: ContentType = rawType === 'movie' || rawType === 'tv' || rawType === 'anime' || rawType === 'all' ? rawType : 'movie'
  const [showFilters, setShowFilters] = useState(false)

  // --- Discover filters: year / rating floor / runtime ---
  const yearFrom = useMemo(() => {
    const n = parseInt(searchParams.get('year_from') || '', 10)
    return Number.isFinite(n) && n > 1800 && n < 2100 ? n : null
  }, [searchParams])
  const yearTo = useMemo(() => {
    const n = parseInt(searchParams.get('year_to') || '', 10)
    return Number.isFinite(n) && n > 1800 && n < 2100 ? n : null
  }, [searchParams])
  const ratingFloor = useMemo(() => {
    const n = Number(searchParams.get('rating'))
    return Number.isFinite(n) && n > 0 && n <= 10 ? n : null
  }, [searchParams])
  const rawRuntime = searchParams.get('runtime')
  const runtimeBand: RuntimeBand | null = rawRuntime === 'short' || rawRuntime === 'medium' || rawRuntime === 'long' ? rawRuntime : null
  const discoverFilterValue: DiscoverFilterValue = { yearFrom, yearTo, ratingFloor, runtimeBand }
  const discoverFilterCount = (yearFrom !== null || yearTo !== null ? 1 : 0) + (ratingFloor !== null ? 1 : 0) + (runtimeBand !== null ? 1 : 0)
  const hasDiscoverFilters = discoverFilterCount > 0

  // Single writer for the URL. `replace` by default so filter toggling does not
  // stack history entries; paging pushes so Back walks pages.
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

  const categoryKey = type || 'popular'
  const endpoints = ENDPOINT_MAP[categoryKey] || ENDPOINT_MAP.popular
  const sort = CATEGORY_SORT[categoryKey] || CATEGORY_SORT.popular
  const { region } = useRegion()
  const { locale } = useLocale()

  useDocumentTitle(`${TITLES[categoryKey] || 'Popular'} — SARANIN.`)

  const useDiscover = activePlatform !== null || hasDiscoverFilters
  const runtime = runtimeBand ? runtimeRange(runtimeBand) : { from: null, to: null }
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    // activePlatform drives a different data source, so it belongs in the key;
    // region does too, because the provider ids only mean something in one region.
    queryKey: ['category', type, page, activePlatform, region, locale, yearFrom, yearTo, ratingFloor, runtimeBand],
    queryFn: async (): Promise<CombinedPage> => {
      // Platform or year/rating/runtime picked → server-side /discover so the
      // grid actually fills.
      if (useDiscover) {
        return fetchDiscoverPage({
          sort,
          providerIds: activePlatform !== null ? [activePlatform] : [],
          page,
          voteFloor: categoryKey === 'top_rated',
          excludeAnime: true,
          region,
          language: locale,
          yearFrom,
          yearTo,
          ratingFloor,
          runtimeFrom: runtime.from,
          runtimeTo: runtime.to,
        })
      }
      const [movieData, tvData] = await Promise.all([
        fetchWithRateLimit<TMDBListResponse>(`${endpoints.movie}?language=${locale}&page=${page}`),
        fetchWithRateLimit<TMDBListResponse>(`${endpoints.tv}?language=${locale}&page=${page}`),
      ])
      const items = dedupById(
        (movieData.results || []).map(normalizeMovie),
        (tvData.results || []).map(normalizeTv),
      )
      const totalPages = Math.max(1, Math.min(TMDB_MAX_PAGE, Math.max(movieData.total_pages || 1, tvData.total_pages || 1)))
      return { items, totalPages }
    },
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: 1000,
  })

  // Region streaming catalog — same curated Netflix/Prime-first list as home.
  const { data: regionProviders, isError: providersError, refetch: refetchProviders } = useQuery({
    queryKey: ['region_providers', region, locale],
    queryFn: () => getRegionProviders(region, locale),
    staleTime: Infinity,
    retry: 1,
  })
  const platformOptions = regionProviders ?? []

  const allMovies = useMemo(() => data?.items ?? [], [data])
  const totalPages = data?.totalPages ?? 1

  // A fresh category view starts at the top — on mount from a rail link
  // (which arrives mid-scroll) and when the route's category changes. Filter
  // interactions must NOT move the viewport: the old effect keyed on `page`
  // fired when a filter reset the page number, scrolling the open panel out of
  // view, and it also fired on the PUSH→REPLACE flip of the first filter write.
  // The ref makes "the category really changed" (or this is the first run) the
  // only scroll trigger; POP opts out entirely — the browser owns that entry's
  // position, and a scrollTo here fights it. The pager scrolls itself.
  const lastCategoryRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = lastCategoryRef.current
    lastCategoryRef.current = categoryKey
    if (prev === categoryKey) return
    if (navigationType === 'POP') return
    window.scrollTo(0, 0)
  }, [categoryKey, navigationType])

  const enrichedMovies = allMovies

  const filteredMovies = useMemo(() => {
    const filtered = enrichedMovies.filter(m => {
      const genreMatch = activeGenres.length === 0 || m.genre_ids?.some(id => activeGenres.includes(id))
      return genreMatch && matchesType(m, contentType)
    })
    // Now Playing is the one category whose feed order needs overriding (TMDB's
    // now_playing feed is popularity-ordered, not date-ordered). Top Rated must
    // keep the endpoint's vote_average.desc — the old unconditional re-sort
    // silently replaced it with newest-first.
    if (categoryKey === 'now_playing' && activePlatform === null) {
      // ISO date strings sort chronologically as strings — avoids the TZ shift of Date.getTime().
      return [...filtered].sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
    }
    return filtered
  }, [enrichedMovies, activeGenres, contentType, categoryKey, activePlatform])

  // Filter by contentType first to compute available genres dynamically
  const typeFilteredMovies = useMemo(
    () => enrichedMovies.filter(m => matchesType(m, contentType)),
    [enrichedMovies, contentType]
  )

  const availableGenres = useMemo(() => {
    const genreIds = new Set<number>()
    typeFilteredMovies.forEach(m => m.genre_ids?.forEach(id => genreIds.add(id)))
    return [...genreIds].map(id => ({ id, name: GENRE_MAP[id] })).filter(g => g.name).sort((a, b) => a.name.localeCompare(b.name))
  }, [typeFilteredMovies])

  // 'movie' is the default view here too, not a filter — counting it showed a
  // badge of "1" on a pristine category page and a Reset that reset nothing.
  const activeFilterCount = activeGenres.length + (activePlatform !== null ? 1 : 0) + (contentType !== 'movie' ? 1 : 0) + discoverFilterCount

  // Single-select platform — 'All' clears it and returns to the category feed.
  const selectPlatform = useCallback((id: number | null) => {
    updateParams({ provider: id === null ? null : String(id), genres: null, page: null })
  }, [updateParams])

  // Year / rating / runtime are server-side constraints — page resets with them.
  const setDiscoverFilters = useCallback((next: DiscoverFilterValue) => {
    updateParams({
      year_from: next.yearFrom === null ? null : String(next.yearFrom),
      year_to: next.yearTo === null ? null : String(next.yearTo),
      rating: next.ratingFloor === null ? null : String(next.ratingFloor),
      runtime: next.runtimeBand,
      page: null,
    })
  }, [updateParams])

  // Category changes reset the view (page + filters), same as the old setState
  // version — but through the URL. Guarded by a ref so a deep link is not wiped
  // on mount.
  const prevCategoryRef = useRef(categoryKey)
  useEffect(() => {
    if (prevCategoryRef.current === categoryKey) return
    prevCategoryRef.current = categoryKey
    updateParams({ page: null, genres: null, provider: null, type: null })
  }, [categoryKey, updateParams])

  // Region changes invalidate the provider ids — a Netflix id is only Netflix
  // inside the region it was picked from. Ref-guarded so mount does not clear a
  // deep-linked provider.
  const prevRegionRef = useRef(region)
  useEffect(() => {
    if (prevRegionRef.current === region) return
    prevRegionRef.current = region
    updateParams({ provider: null, page: null })
  }, [region, updateParams])

  const goToPage = (next: number) => {
    const clamped = Math.max(1, Math.min(totalPages, next))
    updateParams({ page: clamped === 1 ? null : String(clamped) }, { push: true })
    // Paging is the only action that scrolls — see the scroll note above.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetAllFilters = useCallback(() => {
    updateParams({
      page: null, genres: null, provider: null, type: null,
      year_from: null, year_to: null, rating: null, runtime: null,
    })
  }, [updateParams])

  if (isError && !data) {
    return (
      <div className="min-h-[100dvh] bg-surface">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-5 md:py-8">
          <Navbar />
          <div className="flex items-center justify-center py-24 px-6">
            <div className="text-center max-w-sm">
              <p className="text-5xl mb-4">&#x1f3ac;</p>
              <p className="text-text-primary text-lg font-semibold mb-2">Something went wrong</p>
              <p className="text-text-muted text-sm">{(error as Error)?.message || 'Failed to load content'}</p>
              <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => refetch()}
                  className="bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform"
                >
                  Try Again
                </button>
                {(activeFilterCount > 0 || page > 1) && (
                  <button
                    onClick={resetAllFilters}
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

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary">{TITLES[type || 'popular'] || 'Popular'}</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-surface-elevated border border-zinc-800 text-text-primary text-xs font-bold px-4 py-2 rounded-full hover:border-accent transition-all active:scale-95 flex items-center gap-2"
          >
            {showFilters ? 'Hide Filters' : 'Filters'}
            {activeFilterCount > 0 && (
              <span className="bg-accent text-black text-[10px] px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden mb-8"
            >
              {/* Genre Section */}
              <div className="pb-4 border-b border-zinc-800/50">
                <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Genre</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateParams({ genres: null })}
                    className={`shrink-0 inline-flex items-center justify-center min-h-[44px] text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                      activeGenres.length === 0
                        ? 'bg-accent text-black'
                        : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    All
                  </button>
                  {availableGenres.map(g => (
                    <button
                      key={g.id}
                      onClick={() => {
                        const next = activeGenres.includes(g.id)
                          ? activeGenres.filter(id => id !== g.id)
                          : [...activeGenres, g.id]
                        updateParams({ genres: next.length > 0 ? next.join(',') : null })
                      }}
                      className={`shrink-0 inline-flex items-center justify-center min-h-[44px] text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                        activeGenres.includes(g.id)
                          ? 'bg-accent text-black'
                          : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year / Rating / Runtime — server-side discover constraints */}
              <DiscoverFilterSections value={discoverFilterValue} onChange={setDiscoverFilters} />

              {/* Platform Section — server-side filter against the region catalog */}
              <div className="pt-4 pb-4 border-b border-zinc-800/50">
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Platform</p>
                  {activePlatform !== null && <span className="text-accent text-[10px] font-bold">filtering</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => selectPlatform(null)}
                    className={`shrink-0 inline-flex items-center justify-center min-h-[44px] text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                      activePlatform === null
                        ? 'bg-accent text-black'
                        : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    All
                  </button>
                  {platformOptions.map(p => (
                    <button
                      key={p.provider_id}
                      onClick={() => selectPlatform(p.provider_id)}
                      className={`shrink-0 flex items-center gap-1.5 min-h-[44px] text-xs font-medium px-3 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                        activePlatform === p.provider_id
                          ? 'bg-accent text-black'
                          : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {p.logo_path && (
                        <img
                          src={`${IMG_BASE}/w45${p.logo_path}`}
                          alt={p.provider_name}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                          className="w-4 h-4 rounded-sm object-cover"
                          loading="lazy"
                        />
                      )}
                      {p.provider_name}
                    </button>
                  ))}
                </div>
                {platformOptions.length === 0 && (
                  providersError ? (
                    <p className="text-text-muted text-[10px] mt-2">
                      Couldn't load platforms.{' '}
                      <button type="button" onClick={() => refetchProviders()} className="text-accent font-bold hover:text-white transition-colors">
                        Retry
                      </button>
                    </p>
                  ) : (
                    <p className="text-text-muted text-[10px] mt-2">Loading platforms…</p>
                  )
                )}
              </div>

              {/* Content Type Section */}
              <div className="pt-4 pb-4 border-b border-zinc-800/50">
                <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Type</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'all', label: 'All' },
                    { key: 'movie', label: 'Movies' },
                    { key: 'tv', label: 'TV Series' },
                    { key: 'anime', label: 'Anime' },
                  ] as { key: ContentType; label: string }[]).map(t => (
                    <button
                      key={t.key}
                      onClick={() => updateParams({ type: t.key === 'movie' ? null : t.key })}
                      className={`shrink-0 inline-flex items-center justify-center min-h-[44px] text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                        contentType === t.key
                          ? 'bg-accent text-black'
                          : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results count */}
        <p className="text-text-muted text-xs mb-4">
          {filteredMovies.length} results on this page
        </p>

        {/* Movie Grid — one TMDB page per view */}
        <motion.div
          animate={{ opacity: isFetching ? 0.45 : 1 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="flex flex-col gap-3">
                  <div className="skeleton w-full aspect-[2/3] rounded-xl" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredMovies.map((m) => (
                <Link key={`${m.media_type}-${m.id}`} to={m.media_type === 'tv' ? `/tv/${m.id}` : `/movie/${m.id}`} className="block group">
                  <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
                    <ImageWithFallback src={m.poster_path ? `${IMG_BASE}/w342${m.poster_path}` : ''} alt={m.title} sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <TrailerHover mediaType={m.media_type === 'tv' ? 'tv' : 'movie'} id={m.id} title={m.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                      &#9733; {m.vote_average?.toFixed(1)}
                    </div>
                    {m.media_type === 'tv' && (
                      <div className="absolute top-2 left-2 bg-accent text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md">TV</div>
                    )}
                    {isAnime(m) && (
                      <div className={`${m.media_type === 'tv' ? 'top-[26px]' : 'top-2'} absolute left-2 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md`}>Anime</div>
                    )}
                    <WatchButton
                      compact
                      entry={{ id: m.id, media_type: m.media_type === 'tv' ? 'tv' : 'movie', title: m.title, poster_path: m.poster_path, vote_average: m.vote_average, release_date: m.release_date }}
                    />
                  </div>
                  <p className="mt-2 text-xs sm:text-sm font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">{m.title}</p>
                  <p className="text-text-muted text-[10px]">{formatDate(m.release_date)}</p>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Empty state with smart suggestions */}
        {filteredMovies.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">&#x1f50d;</p>
            <p className="text-text-primary text-sm font-bold mb-2">No results on this page</p>
            <p className="text-text-muted text-xs mb-6">Try the next page, adjust filters, or explore these suggestions</p>

            {/* Smart suggestions based on current filters */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => goToPage(page + 1)}
                disabled={isFetching || page >= totalPages}
                className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Go to Next Page
              </button>
              {contentType === 'anime' && (
                <button
                  onClick={() => updateParams({ type: null })}
                  className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all"
                >
                  Show All Content
                </button>
              )}
              {contentType !== 'anime' && (
                <button
                  onClick={() => updateParams({ type: 'anime' })}
                  className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all"
                >
                  Browse Anime
                </button>
              )}
              <button
                onClick={resetAllFilters}
                className="text-xs font-medium px-4 py-2 rounded-full bg-accent text-black hover:bg-accent/90 transition-all"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* Pagination — Prev / Next only. One page in view at a time. */}
        <div className="flex items-center justify-center gap-4 py-8">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1 || isFetching}
            aria-label="Previous page"
            className="px-5 py-2.5 rounded-full text-xs font-bold bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-text-primary hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 active:scale-95"
          >
            ← Prev
          </button>
          <span className="text-text-muted text-xs font-mono tabular-nums min-w-[64px] text-center" aria-live="polite">
            {isFetching ? '…' : `Page ${page}`}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={isFetching || page >= totalPages}
            aria-label="Next page"
            className="px-5 py-2.5 rounded-full text-xs font-bold bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-text-primary hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 active:scale-95"
          >
            Next →
          </button>
        </div>
      </div>
      <Footer />
    </div>
  )
}
