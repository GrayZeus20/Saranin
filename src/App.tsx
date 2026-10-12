import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { ImageWithFallback } from './components/ImageWithFallback'
import Navbar from './components/Navbar'
import { fetchWithRateLimit, IMG_BASE, TMDB_TOKEN } from './utils/api'
import { formatDate, GENRE_MAP } from './utils/constants'
import { normalizeMovie, normalizeTv, dedupById, type Movie } from './utils/tmdb'
import { getRegionProviders } from './utils/providers'
import { fetchDiscoverPage, WATCH_REGION, TMDB_MAX_PAGE, type CombinedPage, type TMDBListResponse, type DiscoverSort } from './utils/discover'

// Environment validation
if (!TMDB_TOKEN) {
  console.error('Missing VITE_TMDB_TOKEN in .env file. API calls will fail.')
}

type CategoryKey = 'now_playing' | 'trending' | 'popular' | 'top_rated'
type ContentType = 'all' | 'movie' | 'tv' | 'anime'

const CATEGORY_ENDPOINTS: Record<CategoryKey, { label: string; movie: string; tv: string }> = {
  now_playing: { label: 'Now Playing', movie: '/movie/now_playing', tv: '/tv/on_the_air' },
  trending: { label: 'Trending', movie: '/trending/movie/week', tv: '/trending/tv/week' },
  popular: { label: 'Popular', movie: '/movie/popular', tv: '/tv/popular' },
  top_rated: { label: 'Top Rated', movie: '/movie/top_rated', tv: '/tv/top_rated' },
}

// Discover sort per category (see utils/discover for the per-kind field rule).
const CATEGORY_SORT: Record<CategoryKey, DiscoverSort> = {
  now_playing: { movie: 'primary_release_date.desc', tv: 'first_air_date.desc' },
  trending: { movie: 'popularity.desc', tv: 'popularity.desc' },
  popular: { movie: 'popularity.desc', tv: 'popularity.desc' },
  top_rated: { movie: 'vote_average.desc', tv: 'vote_average.desc' },
}

// One request pair (movie + tv) == one visible page. No accumulation, no dedup drift:
// each page replaces the previous one, so Prev/Next always moves forward.
async function fetchCombinedPage(movieEndpoint: string, tvEndpoint: string, page: number): Promise<CombinedPage> {
  const [movieData, tvData] = await Promise.all([
    fetchWithRateLimit<TMDBListResponse>(`${movieEndpoint}?language=en-US&page=${page}`),
    fetchWithRateLimit<TMDBListResponse>(`${tvEndpoint}?language=en-US&page=${page}`),
  ])
  const items = dedupById(
    (movieData.results || []).map(normalizeMovie),
    (tvData.results || []).map(normalizeTv),
  )
  const totalPages = Math.max(1, Math.min(TMDB_MAX_PAGE, Math.max(movieData.total_pages || 1, tvData.total_pages || 1)))
  return { items, totalPages }
}

function isAnime(m: Movie): boolean {
  return !!m.genre_ids?.includes(16) && m.original_language === 'ja'
}

function matchesContentType(m: Movie, type: ContentType): boolean {
  if (type === 'all') return true
  if (type === 'anime') return isAnime(m)
  // "TV Series" must not double-count anime — those belong to the Anime filter.
  if (type === 'tv') return m.media_type === 'tv' && !isAnime(m)
  return m.media_type === type
}

function posterUrl(path: string | null, size = 'w342'): string {
  return path ? `${IMG_BASE}/${size}${path}` : ''
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

function SkeletonHero() {
  return (
    <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[75vh] mb-12 md:mb-16">
      <div className="skeleton absolute inset-0 rounded-xl md:rounded-2xl" />
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 md:p-12">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="skeleton h-8 sm:h-12 w-2/3 rounded mb-3" />
        <div className="skeleton h-4 w-1/2 rounded mb-6" />
        <div className="skeleton h-10 w-32 rounded-full" />
      </div>
    </div>
  )
}

function HorizontalSection({ title, subtitle, movies, onMovieClick, viewAllLink }: {
  title: string; subtitle: string; movies: Movie[]; onMovieClick: (m: Movie) => void; viewAllLink?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  if (movies.length === 0) {
    // Show skeleton instead of disappearing — prevents layout shift
    return (
      <div className="mb-10 md:mb-14">
        <div className="flex items-baseline gap-3 mb-4">
          <div className="skeleton h-5 w-24 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-28 sm:w-32 md:w-36">
              <div className="skeleton w-full aspect-[2/3] rounded-xl" />
              <div className="skeleton h-3 w-3/4 rounded mt-1.5" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="mb-10 md:mb-14 relative group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">{title}</h2>
          <p className="text-text-muted text-xs">{subtitle}</p>
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-white font-medium transition-colors">
            See all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
          </Link>
        )}
      </div>

      <button
        onClick={() => scroll('left')}
        aria-label={`Scroll ${title} left`}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 hover:scale-110 active:scale-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
        {movies.map(m => (
          <div key={`${title}-${m.id}`} onClick={() => onMovieClick(m)} className="shrink-0 w-28 sm:w-32 md:w-36 cursor-pointer group transition-transform duration-200 hover:scale-105 active:scale-95">
            <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
              <ImageWithFallback src={posterUrl(m.poster_path)} alt={m.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-accent text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                &#9733; {m.vote_average?.toFixed(1)}
              </div>
            </div>
            <p className="text-text-primary text-[11px] font-bold line-clamp-1 mt-1.5">{m.title}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => scroll('right')}
        aria-label={`Scroll ${title} right`}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 hover:scale-110 active:scale-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()

  const [currentPage, setCurrentPage] = useState(1)
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('now_playing')
  const [activeGenres, setActiveGenres] = useState<number[]>([])
  const [activePlatform, setActivePlatform] = useState<number | null>(null)
  const [showGenres, setShowGenres] = useState(false)
  const [contentType, setContentType] = useState<ContentType>('movie')

  const gridTopRef = useRef<HTMLDivElement>(null)

  // --- Current page query: exactly one TMDB page per view ---
  const endpoints = CATEGORY_ENDPOINTS[activeCategory]
  const pageQuery = useQuery({
    queryKey: ['home', activeCategory, currentPage, activePlatform],
    queryFn: () => activePlatform === null
      ? fetchCombinedPage(endpoints.movie, endpoints.tv, currentPage)
      : fetchDiscoverPage({
          sort: CATEGORY_SORT[activeCategory],
          providerIds: [activePlatform],
          page: currentPage,
          voteFloor: activeCategory === 'top_rated',
          excludeAnime: true,
        }),
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: 1000,
  })

  // --- Region streaming catalog for the Platform filter ---
  const { data: regionProviders } = useQuery({
    queryKey: ['region_providers', WATCH_REGION],
    queryFn: () => getRegionProviders(WATCH_REGION),
    staleTime: Infinity,
    retry: 1,
  })
  const platformOptions = regionProviders ?? []

  // --- Row previews: fixed page 1, movie + tv per row ---
  const trendingRow = useQuery({
    queryKey: ['row', 'trending'],
    queryFn: () => fetchCombinedPage('/trending/movie/week', '/trending/tv/week', 1),
    retry: 2,
  })
  const popularRow = useQuery({
    queryKey: ['row', 'popular'],
    queryFn: () => fetchCombinedPage('/movie/popular', '/tv/popular', 1),
    retry: 2,
  })
  const topRatedRow = useQuery({
    queryKey: ['row', 'top_rated'],
    queryFn: () => fetchCombinedPage('/movie/top_rated', '/tv/top_rated', 1),
    retry: 2,
  })

  const pageItems = useMemo(() => pageQuery.data?.items ?? [], [pageQuery.data])
  const totalPages = pageQuery.data?.totalPages ?? 1
  const isPageLoading = pageQuery.isLoading
  const isPageFetching = pageQuery.isFetching

  // Failed page change must not nuke the screen — only the very first load owns the error page.
  useEffect(() => {
    if (pageQuery.isError && pageQuery.data) toast.error('Failed to load that page. Try again.')
  }, [pageQuery.isError, pageQuery.data])

  const openDetail = useCallback((movie: Movie) => {
    navigate(`/${movie.media_type === 'tv' ? 'tv' : 'movie'}/${movie.id}`)
  }, [navigate])

  const typeFilteredItems = useMemo(
    () => pageItems.filter(m => matchesContentType(m, contentType)),
    [pageItems, contentType]
  )

  const availableGenres = useMemo(() => [...new Set(typeFilteredItems.flatMap(m => m.genre_ids || []))]
    .map(id => ({ id, name: GENRE_MAP[id] }))
    .filter(g => g.name)
    .sort((a, b) => a.name.localeCompare(b.name)), [typeFilteredItems])

  // Platform is filtered server-side (see fetchDiscoverPage); only genre + type
  // are applied client-side here so the pills stay instant.
  const filteredMovies = useMemo(() => {
    const list = pageItems.filter(m => {
      const genreMatch = activeGenres.length === 0 || m.genre_ids?.some(id => activeGenres.includes(id))
      return genreMatch && matchesContentType(m, contentType)
    })
    if (activeCategory === 'now_playing' && activePlatform === null) {
      // ISO date strings (YYYY-MM-DD) sort chronologically as plain strings; using
      // Date.getTime() on a date-only ISO value parses it as UTC and can reorder by TZ.
      return [...list].sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
    }
    return list
  }, [pageItems, activeGenres, contentType, activeCategory, activePlatform])

  // Hero only exists on page 1; pages 2+ render every fetched item in the grid.
  const isFirstPage = currentPage === 1
  const featured = isFirstPage ? filteredMovies[0] : undefined
  const gridMovies = isFirstPage ? filteredMovies.slice(1) : filteredMovies

  const goToPage = useCallback((next: number) => {
    setCurrentPage(Math.max(1, next))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const toggleCategory = useCallback((key: CategoryKey) => {
    setActiveCategory(key)
    setActiveGenres([])
    setContentType('movie')
    setCurrentPage(1)
  }, [])

  const toggleGenre = useCallback((id: number) => {
    setActiveGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }, [])

  // Single-select platform filter — 'All' clears it. Changing it re-fetches page 1.
  const selectPlatform = useCallback((id: number | null) => {
    setActivePlatform(id)
    setActiveGenres([])
    setCurrentPage(1)
  }, [])

  const scrollToGrid = useCallback(() => {
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const activeFilterCount = activeGenres.length + (activePlatform !== null ? 1 : 0) + (contentType !== 'all' ? 1 : 0)

  const trendingRowItems = useMemo(() => (trendingRow.data?.items ?? []).slice(0, 16), [trendingRow.data])
  const popularRowItems = useMemo(() => (popularRow.data?.items ?? []).slice(0, 16), [popularRow.data])
  const topRatedRowItems = useMemo(() => (topRatedRow.data?.items ?? []).slice(0, 16), [topRatedRow.data])

  if (pageQuery.isError && !pageQuery.data) {
    return (
      <div className="min-h-[100dvh] bg-surface flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">&#x1f3ac;</p>
          <p className="text-text-primary text-lg font-semibold mb-2">Something went wrong</p>
          <p className="text-text-muted text-sm">{(pageQuery.error as Error)?.message || 'Failed to load content'}</p>
          <button
            onClick={() => pageQuery.refetch()}
            className="mt-6 bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (isPageLoading) {
    return (
      <div className="min-h-[100dvh] bg-surface px-4 sm:px-6 md:px-12 py-6 max-w-[1400px] mx-auto">
        <header className="mb-10">
          <div className="skeleton h-8 w-36 rounded mb-2" />
          <div className="skeleton h-3 w-48 rounded" />
        </header>
        <SkeletonHero />
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-surface">
      {/* Ambient backdrop behind the hero — page 1 only. Previously a
          radial-gradient() whose color stops were url(...) values, which is invalid
          CSS and painted nothing; this is a real image layer with a CSS fade mask. */}
      {isFirstPage && featured?.backdrop_path ? (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <img
            src={`${IMG_BASE}/w1280${featured.backdrop_path}`}
            alt=""
            className="w-full h-[55vh] object-cover object-top opacity-20 blur-3xl scale-125"
            style={{ maskImage: 'linear-gradient(to bottom, black, transparent 85%)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 85%)' }}
          />
        </div>
      ) : null}

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-5 md:py-8">
        {/* Navigation */}
        <Navbar />

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
                <img
                  src={`${IMG_BASE}/original${featured.backdrop_path}`}
                  alt={featured.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-surface-card flex items-center justify-center text-zinc-700 text-4xl font-black">{featured.title}</div>
              )}
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
            <div>
              <HorizontalSection title="Trending" subtitle="What's hot this week" movies={trendingRowItems} onMovieClick={openDetail} viewAllLink="/category/trending" />
            </div>
            <div>
              <HorizontalSection title="Popular" subtitle="Most watched right now" movies={popularRowItems} onMovieClick={openDetail} viewAllLink="/category/popular" />
            </div>
            <div>
              <HorizontalSection title="Top Rated" subtitle="Critics' picks" movies={topRatedRowItems} onMovieClick={openDetail} viewAllLink="/category/top_rated" />
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-text-primary">{endpoints.label}</h3>
              <p className="text-text-muted text-xs sm:text-sm mt-1">
                {filteredMovies.length} results on this page
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGenres(!showGenres)}
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
          <AnimatePresence>
            {showGenres && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                {/* Category Section */}
                <div className="mt-4 pb-4 border-b border-zinc-800/50">
                  <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(CATEGORY_ENDPOINTS) as CategoryKey[]).map(key => (
                      <button
                        key={key}
                        onClick={() => toggleCategory(key)}
                        className={`shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                          activeCategory === key
                            ? 'bg-accent text-black'
                            : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        {CATEGORY_ENDPOINTS[key].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Genre Section */}
                <div className="mt-4 pb-4 border-b border-zinc-800/50">
                  <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Genre</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveGenres([])}
                      className={`shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
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
                        onClick={() => toggleGenre(g.id)}
                        className={`shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
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
                <div className="mt-4 pb-4 border-b border-zinc-800/50">
                  <div className="flex items-baseline gap-2 mb-3">
                    <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Platform</p>
                    {activePlatform !== null && (
                      <span className="text-accent text-[10px] font-bold">filtering</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => selectPlatform(null)}
                      className={`shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
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
                        className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full transition-all duration-200 active:scale-95 ${
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
                <div className="mt-4 pb-4 border-b border-zinc-800/50">
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
                        className={`shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
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
        </motion.div>

        {/* Movie Grid — one TMDB page per view */}
        <motion.div
          animate={{ opacity: isPageFetching ? 0.45 : 1 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 pb-8">
            {gridMovies.map((movie, i) => (
              <motion.article
                key={`${activeCategory}-${movie.id}`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(0.05 + i * 0.02, 0.4),
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => openDetail(movie)}
                className="cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
                  {movie.poster_path ? (
                    <img
                      src={`${IMG_BASE}/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-sm font-bold">{movie.title?.charAt(0)}</div>
                  )}
                  {/* Gradient overlay always visible */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  {/* Details indicator on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-white text-black text-[10px] font-bold px-4 py-1.5 rounded-full shadow-lg">
                      Details
                    </span>
                  </div>
                  {/* Rating badge */}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                    &#9733; {movie.vote_average?.toFixed(1)}
                  </div>
                  {/* Anime badge */}
                  {isAnime(movie) && (
                    <div className={`absolute top-2 left-2 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md ${movie.media_type === 'tv' ? 'top-8' : ''}`}>Anime</div>
                  )}
                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/90 to-transparent">
                    <p className="text-white font-bold text-[11px] sm:text-xs line-clamp-1 mb-0.5">{movie.title}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/50 text-[9px] sm:text-[10px]">{formatDate(movie.release_date)}</span>
                      {movie.genre_ids?.[0] && (
                        <>
                          <span className="text-white/30 text-[9px]">•</span>
                          <span className="text-white/50 text-[9px] sm:text-[10px]">{GENRE_MAP[movie.genre_ids[0]]}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>

        {/* Pagination — Prev / Next only. One page in view at a time. */}
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

        {/* Empty state with smart suggestions */}
        {filteredMovies.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">&#x1f50d;</p>
            <p className="text-text-primary text-sm font-bold mb-2">No results on this page</p>
            <p className="text-text-muted text-xs mb-6">Try the next page, adjust filters, or explore these suggestions</p>

            {/* Smart suggestions based on current filters */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => { scrollToGrid(); goToPage(currentPage + 1) }}
                disabled={isPageFetching || currentPage >= totalPages}
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
      </div>
    </div>
  )
}
