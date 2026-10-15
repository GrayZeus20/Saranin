import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { ImageWithFallback } from '../components/ImageWithFallback'
import Navbar from '../components/Navbar'
import { fetchWithRateLimit, IMG_BASE } from '../utils/api'
import { GENRE_MAP, formatDate } from '../utils/constants'
import { normalizeMovie, normalizeTv, dedupById, type Movie } from '../utils/tmdb'
import { getRegionProviders } from '../utils/providers'
import { fetchDiscoverPage, WATCH_REGION, TMDB_MAX_PAGE, type CombinedPage, type TMDBListResponse, type DiscoverSort } from '../utils/discover'

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
  const [page, setPage] = useState(1)
  const [activeGenres, setActiveGenres] = useState<number[]>([])
  const [activePlatform, setActivePlatform] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [contentType, setContentType] = useState<ContentType>('movie')

  const categoryKey = type || 'popular'
  const endpoints = ENDPOINT_MAP[categoryKey] || ENDPOINT_MAP.popular
  const sort = CATEGORY_SORT[categoryKey] || CATEGORY_SORT.popular

  // Reset view state when the category route changes — React Query key handles the data swap.
  useEffect(() => {
    setPage(1)
    setActiveGenres([])
    setActivePlatform(null)
    setContentType('movie')
  }, [type])

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    // activePlatform drives a different data source, so it belongs in the key.
    queryKey: ['category', type, page, activePlatform],
    queryFn: async (): Promise<CombinedPage> => {
      // Platform picked → server-side /discover so the grid actually fills.
      if (activePlatform !== null) {
        return fetchDiscoverPage({
          sort,
          providerIds: [activePlatform],
          page,
          voteFloor: categoryKey === 'top_rated',
          excludeAnime: true,
          region: WATCH_REGION,
        })
      }
      const [movieData, tvData] = await Promise.all([
        fetchWithRateLimit<TMDBListResponse>(`${endpoints.movie}?language=en-US&page=${page}`),
        fetchWithRateLimit<TMDBListResponse>(`${endpoints.tv}?language=en-US&page=${page}`),
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
  const { data: regionProviders } = useQuery({
    queryKey: ['region_providers', WATCH_REGION],
    queryFn: () => getRegionProviders(WATCH_REGION),
    staleTime: Infinity,
    retry: 1,
  })
  const platformOptions = regionProviders ?? []

  const allMovies = useMemo(() => data?.items ?? [], [data])
  const totalPages = data?.totalPages ?? 1

  // Scroll to top when the page/category actually changes
  useEffect(() => { window.scrollTo(0, 0) }, [page, type])

  const enrichedMovies = allMovies

  const filteredMovies = useMemo(() => {
    const filtered = enrichedMovies.filter(m => {
      const genreMatch = activeGenres.length === 0 || m.genre_ids?.some(id => activeGenres.includes(id))
      return genreMatch && matchesType(m, contentType)
    })
    // ISO date strings sort chronologically as strings — avoids the TZ shift of Date.getTime().
    return [...filtered].sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
  }, [enrichedMovies, activeGenres, contentType])

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

  const activeFilterCount = activeGenres.length + (activePlatform !== null ? 1 : 0) + (contentType !== 'all' ? 1 : 0)

  // Single-select platform — 'All' clears it and returns to the category feed.
  const selectPlatform = useCallback((id: number | null) => {
    setActivePlatform(id)
    setActiveGenres([])
    setPage(1)
  }, [])

  const goToPage = (next: number) => {
    setPage(Math.max(1, Math.min(totalPages, next)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isError && !data) {
    return (
      <div className="min-h-[100dvh] bg-surface flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">&#x1f3ac;</p>
          <p className="text-text-primary text-lg font-semibold mb-2">Something went wrong</p>
          <p className="text-text-muted text-sm">{(error as Error)?.message || 'Failed to load content'}</p>
          <button
            onClick={() => refetch()}
            className="mt-6 bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform"
          >
            Try Again
          </button>
        </div>
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
                    onClick={() => setActiveGenres([])}
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
                      onClick={() => setActiveGenres(prev => prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id])}
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
                          className="w-4 h-4 rounded-sm object-cover"
                          loading="lazy"
                        />
                      )}
                      {p.provider_name}
                    </button>
                  ))}
                </div>
                {platformOptions.length === 0 && (
                  <p className="text-text-muted text-[10px] mt-2">Loading platforms…</p>
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
                      onClick={() => setContentType(t.key)}
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
                <Link key={m.id} to={m.media_type === 'tv' ? `/tv/${m.id}` : `/movie/${m.id}`} className="block group">
                  <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
                    <ImageWithFallback src={m.poster_path ? `${IMG_BASE}/w500${m.poster_path}` : ''} alt={m.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                      &#9733; {m.vote_average?.toFixed(1)}
                    </div>
                    {m.media_type === 'tv' && (
                      <div className="absolute top-2 left-2 bg-accent text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md">TV</div>
                    )}
                    {isAnime(m) && (
                      <div className={`absolute top-2 left-2 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md ${m.media_type === 'tv' ? 'top-8' : ''}`}>Anime</div>
                    )}
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
                  onClick={() => setContentType('all')}
                  className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all"
                >
                  Show All Content
                </button>
              )}
              {contentType !== 'anime' && (
                <button
                  onClick={() => setContentType('anime')}
                  className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all"
                >
                  Browse Anime
                </button>
              )}
              <button
                onClick={() => { setActiveGenres([]); setActivePlatform(null); setContentType('movie') }}
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
    </div>
  )
}
