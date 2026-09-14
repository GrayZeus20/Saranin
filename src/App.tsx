import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { ImageWithFallback } from './components/ImageWithFallback'
import Navbar from './components/Navbar'
import { fetchWithRateLimit, batchFetchWithRateLimit, IMG_BASE, TMDB_TOKEN } from './utils/api'
import { formatDate, GENRE_MAP } from './utils/constants'

// Environment validation
if (!TMDB_TOKEN) {
  console.error('Missing VITE_TMDB_TOKEN in .env file. API calls will fail.')
}

interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  vote_average: number
  release_date: string
  genre_ids: number[]
  providers?: WatchProvider[]
  media_type?: 'movie' | 'tv'
  origin_country?: string[]
  status?: string
}

interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
}

interface Video {
  key: string
  site: string
  type: string
  official: boolean
}

interface MovieDetail extends Movie {
  runtime: number | null
  tagline: string
  budget: number
  revenue: number
  genres: { id: number; name: string }[]
  production_companies: { id: number; name: string; logo_path: string | null }[]
  credits: {
    cast: CastMember[]
    crew: { job: string; name: string }[]
  }
  videos: { results: Video[] }
  similar: { results: Movie[] }
  'watch/providers'?: { results: Record<string, { flatrate?: WatchProvider[]; rent?: WatchProvider[]; buy?: WatchProvider[] }> }
}

function normalizeTv(tv: any): Movie {
  return {
    ...tv,
    title: tv.name || tv.title,
    release_date: tv.first_air_date || tv.release_date,
    media_type: 'tv',
    origin_country: tv.origin_country || [],
    status: tv.status || '',
  }
}

function normalizeMovie(movie: any): Movie {
  return {
    ...movie,
    media_type: 'movie',
  }
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
          <Link to={viewAllLink} className="text-accent text-xs font-bold hover:underline transition-colors">
            View All
          </Link>
        )}
      </div>

      <button
        onClick={() => scroll('left')}
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
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 hover:scale-110 active:scale-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [trending, setTrending] = useState<Movie[]>([])
  const [popular, setPopular] = useState<Movie[]>([])
  const [topRated, setTopRated] = useState<Movie[]>([])
  const nowPlayingRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 20
  const INITIAL_PAGES = 2
  const [maxPage, setMaxPage] = useState(INITIAL_PAGES)
  const [loadingMore, setLoadingMore] = useState(false)
  const isLoadingMoreRef = useRef(false)

  // Refs to track latest state for provider fetch (avoid stale closures)
  const moviesRef = useRef(movies)
  const trendingRef = useRef(trending)
  const popularRef = useRef(popular)
  const topRatedRef = useRef(topRated)
  useEffect(() => { moviesRef.current = movies }, [movies])
  useEffect(() => { trendingRef.current = trending }, [trending])
  useEffect(() => { popularRef.current = popular }, [popular])
  useEffect(() => { topRatedRef.current = topRated }, [topRated])

  // Shared fetch helper — returns movies for a page range
  const fetchCategoryPages = async (endpoint: string, pageStart: number, pageEnd: number): Promise<Movie[]> => {
    const pages = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i)
    const endpoints = pages.map(p => `${endpoint}?language=en-US&page=${p}`)
    const results = await batchFetchWithRateLimit<any>(endpoints)
    return results.flatMap(d => d.results || [])
  }

  const fetchCategory = async (endpoint: string, page: number): Promise<Movie[]> => {
    const data = await fetchWithRateLimit<any>(`${endpoint}?language=en-US&page=${page}`)
    return data.results || []
  }

  // Use React Query — fetch first 5 pages for all categories
  const { data: nowPlaying, error: nowPlayingError } = useQuery({
    queryKey: ['now_playing'],
    queryFn: () => fetchCategoryPages('/movie/now_playing', 1, INITIAL_PAGES),
    retry: 2,
    retryDelay: 1000,
  })
  const { data: trendingData, error: trendingError } = useQuery({
    queryKey: ['trending'],
    queryFn: () => fetchCategoryPages('/trending/movie/week', 1, INITIAL_PAGES),
    retry: 2,
    retryDelay: 1000,
  })
  const { data: popularData, error: popularError } = useQuery({
    queryKey: ['popular'],
    queryFn: () => fetchCategoryPages('/movie/popular', 1, INITIAL_PAGES),
    retry: 2,
    retryDelay: 1000,
  })
  const { data: topRatedData, error: topRatedError } = useQuery({
    queryKey: ['top_rated'],
    queryFn: () => fetchCategoryPages('/movie/top_rated', 1, INITIAL_PAGES),
    retry: 2,
    retryDelay: 1000,
  })

  // TV Series fetch — first 3 pages
  const { data: tvTrendingData } = useQuery({
    queryKey: ['tv_trending'],
    queryFn: () => fetchCategoryPages('/trending/tv/week', 1, 3),
    retry: 2,
    retryDelay: 1000,
  })
  const { data: tvPopularData } = useQuery({
    queryKey: ['tv_popular'],
    queryFn: () => fetchCategoryPages('/tv/popular', 1, 3),
    retry: 2,
    retryDelay: 1000,
  })
  const { data: tvTopRatedData } = useQuery({
    queryKey: ['tv_top_rated'],
    queryFn: () => fetchCategoryPages('/tv/top_rated', 1, 3),
    retry: 2,
    retryDelay: 1000,
  })
  const { data: tvOnAirData } = useQuery({
    queryKey: ['tv_on_air'],
    queryFn: () => fetchCategoryPages('/tv/on_the_air', 1, 3),
    retry: 2,
    retryDelay: 1000,
  })
  const [tvTrending, setTvTrending] = useState<Movie[]>([])
  const [tvPopular, setTvPopular] = useState<Movie[]>([])
  const [tvTopRated, setTvTopRated] = useState<Movie[]>([])
  const [tvOnAir, setTvOnAir] = useState<Movie[]>([])

  useEffect(() => {
    // Handle errors from main queries
    const queryError = nowPlayingError || trendingError || popularError || topRatedError
    if (queryError) {
      setError(queryError.message || 'Failed to load content')
      setLoading(false)
      return
    }

    if (nowPlaying && trendingData && popularData && topRatedData) {
      setMovies(nowPlaying.map(normalizeMovie))
      setTrending(trendingData.map(normalizeMovie))
      setPopular(popularData.map(normalizeMovie))
      setTopRated(topRatedData.map(normalizeMovie))
      // Wait for TV data too before hiding skeleton — prevents layout shift
      if (tvTrendingData && tvPopularData && tvTopRatedData && tvOnAirData) {
        setLoading(false)
      }
    }
    if (tvTrendingData) setTvTrending(tvTrendingData.map(normalizeTv))
    if (tvPopularData) setTvPopular(tvPopularData.map(normalizeTv))
    if (tvTopRatedData) setTvTopRated(tvTopRatedData.map(normalizeTv))
    if (tvOnAirData) setTvOnAir(tvOnAirData.map(normalizeTv))
  }, [nowPlaying, trendingData, popularData, topRatedData, tvTrendingData, tvPopularData, tvTopRatedData, tvOnAirData, nowPlayingError, trendingError, popularError, topRatedError])

  // Fetch watch providers for all movie categories when data loads
  useEffect(() => {
    if (moviesRef.current.length === 0) return
    const allMovies = [...moviesRef.current, ...trendingRef.current, ...popularRef.current, ...topRatedRef.current]
    const seen = new Set<number>()
    const unique = allMovies.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })

    const fetchProviders = async () => {
      const updated = new Map<number, WatchProvider[]>()
      // Batch fetch with rate limiter (max 5 concurrent)
      const endpoints = unique.map(m => `/movie/${m.id}/watch/providers`)
      const results = await batchFetchWithRateLimit<any>(endpoints)

      // Process results
      results.forEach((providerData, index) => {
        if (providerData) {
          const movieId = unique[index].id
          const regionResults = providerData.results?.ID || {}
          updated.set(movieId, regionResults.flatrate || regionResults.rent || regionResults.buy || [])
        }
      })

      // Only update if there are actual changes to avoid re-render cascade
      if (updated.size === 0) return

      const updateList = (prev: Movie[]) => {
        let changed = false
        const next = prev.map(m => {
          const providers = updated.get(m.id)
          if (providers && providers !== m.providers) {
            changed = true
            return { ...m, providers }
          }
          return m
        })
        return changed ? next : prev
      }

      setMovies(updateList)
      setTrending(updateList)
      setPopular(updateList)
      setTopRated(updateList)
    }
    fetchProviders()
  }, [])

  // Infinite scroll — load next 2 pages when user scrolls to bottom
  useEffect(() => {
    if (loading || isLoadingMoreRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || isLoadingMoreRef.current) return
        isLoadingMoreRef.current = true
        setLoadingMore(true)
        const BATCH = 2
        ;(async () => {
          try {
            const pages = Array.from({ length: BATCH }, (_, i) => maxPage + 1 + i)
            const [np, tr, pop, top] = await Promise.all([
              Promise.all(pages.map(p => fetchCategory('/movie/now_playing', p))).then(r => r.flat()),
              Promise.all(pages.map(p => fetchCategory('/trending/movie/week', p))).then(r => r.flat()),
              Promise.all(pages.map(p => fetchCategory('/movie/popular', p))).then(r => r.flat()),
              Promise.all(pages.map(p => fetchCategory('/movie/top_rated', p))).then(r => r.flat()),
            ])
            const dedup = (prev: Movie[], next: Movie[]) => {
              const ids = new Set(prev.map(m => m.id))
              return [...prev, ...next.filter(m => !ids.has(m.id))]
            }
            setMovies(prev => dedup(prev, np.map(normalizeMovie)))
            setTrending(prev => dedup(prev, tr.map(normalizeMovie)))
            setPopular(prev => dedup(prev, pop.map(normalizeMovie)))
            setTopRated(prev => dedup(prev, top.map(normalizeMovie)))
            setMaxPage(prev => prev + BATCH)
          } catch {
            toast.error('Failed to load more content')
          }
          setLoadingMore(false)
          isLoadingMoreRef.current = false
        })()
      },
      { rootMargin: '400px' }
    )
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [loading, maxPage])

  const openDetail = (movie: Movie) => {
    navigate(`/${movie.media_type === 'tv' ? 'tv' : 'movie'}/${movie.id}`)
  }

  const [activeGenres, setActiveGenres] = useState<number[]>([])
  const [activeProviders, setActiveProviders] = useState<number[]>([])
  const [showGenres, setShowGenres] = useState(false)
  const [activeCategory, setActiveCategory] = useState('now_playing')
  const [contentType, setContentType] = useState<'all' | 'movie' | 'tv' | 'anime'>('movie')

  // Defensive dedup for render
  const renderDedup = useCallback((movies: Movie[]) => {
      const seen = new Set<number>()
      return movies.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
  }, [])

  const CATEGORIES = useMemo(() => [
    { key: 'now_playing', label: 'Now Playing', data: [...movies, ...tvOnAir] },
    { key: 'trending', label: 'Trending', data: [...trending, ...tvTrending] },
    { key: 'popular', label: 'Popular', data: [...popular, ...tvPopular] },
    { key: 'top_rated', label: 'Top Rated', data: [...topRated, ...tvTopRated] },
  ], [movies, tvOnAir, trending, popular, topRated, tvTrending, tvPopular, tvTopRated])

  const baseMovies = useMemo(() => renderDedup(CATEGORIES.find(c => c.key === activeCategory)?.data || movies), [CATEGORIES, activeCategory, movies, renderDedup])

  // Filter by contentType first to compute available genres dynamically
  const typeFilteredMovies = useMemo(() => baseMovies.filter(m => {
    const isJapaneseAnimation = m.genre_ids?.includes(16) && (m as any).original_language === 'ja'
    if (contentType === 'all') return true
    if (contentType === 'anime') return isJapaneseAnimation
    return m.media_type === contentType
  }), [baseMovies, contentType])

  const availableGenres = useMemo(() => [...new Set(typeFilteredMovies.flatMap(m => m.genre_ids))]
    .map(id => ({ id, name: GENRE_MAP[id] }))
    .filter(g => g.name)
    .sort((a, b) => a.name.localeCompare(b.name)), [typeFilteredMovies])

  const availableProviders = useMemo(() => [...new Map(
    typeFilteredMovies.flatMap(m => m.providers || []).map(p => [p.provider_id, p])
  ).values()].sort((a, b) => a.provider_name.localeCompare(b.provider_name)), [typeFilteredMovies])

  const toggleCategory = useCallback((key: string) => {
    setActiveCategory(key)
    setActiveGenres([])
    setActiveProviders([])
    setContentType('movie')
    setCurrentPage(1)
  }, [])

  const toggleGenre = useCallback((id: number) => {
    setActiveGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
    setCurrentPage(1)
  }, [])

  const toggleProvider = useCallback((id: number) => {
    setActiveProviders(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
    setCurrentPage(1)
  }, [])

  // Memoized data for horizontal sections — prevent re-render cascade
  const trendingSection = useMemo(() => renderDedup([...trending, ...tvTrending]), [trending, tvTrending])
  const popularSection = useMemo(() => renderDedup([...popular, ...tvPopular]), [popular, tvPopular])
  const topRatedSection = useMemo(() => renderDedup([...topRated, ...tvTopRated]), [topRated, tvTopRated])

  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([])

  useEffect(() => {
    // Removed delay entirely for instant feedback
    const filtered = baseMovies.filter(m => {
      const genreMatch = activeGenres.length === 0 || m.genre_ids?.some(id => activeGenres.includes(id))
      const providerMatch = activeProviders.length === 0 || (m.providers || []).some(p => activeProviders.includes(p.provider_id))
      const isJapaneseAnimation = m.genre_ids?.includes(16) && (m as any).original_language === 'ja'

      // Unified type match
      let typeMatch = false
      if (contentType === 'all') {
        typeMatch = true
      } else if (contentType === 'anime') {
        typeMatch = isJapaneseAnimation
      } else {
        typeMatch = m.media_type === contentType
      }

      return genreMatch && providerMatch && typeMatch
    })
    // Sort by release date descending for "Now Playing" to ensure newest first
    if (activeCategory === 'now_playing') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.release_date || 0).getTime()
        const dateB = new Date(b.release_date || 0).getTime()
        return dateB - dateA
      })
    }

    // Only update if filtered result changed — prevent re-render cascade
    setFilteredMovies(prev => {
      if (prev.length === filtered.length && prev.every((m, i) => m.id === filtered[i].id)) {
        return prev
      }
      return filtered
    })
  }, [baseMovies, activeGenres, activeProviders, contentType, activeCategory])

  const [featured, ...allRest] = filteredMovies
  const totalPages = Math.ceil(allRest.length / ITEMS_PER_PAGE)
  const paginatedMovies = allRest.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Sliding pagination window — always show 5 pages
  const PAGINATION_WINDOW = 5
  let pageStart = Math.max(1, currentPage - Math.floor(PAGINATION_WINDOW / 2))
  let pageEnd = Math.min(totalPages, pageStart + PAGINATION_WINDOW - 1)
  if (pageEnd - pageStart < PAGINATION_WINDOW - 1) pageStart = Math.max(1, pageEnd - PAGINATION_WINDOW + 1)
  const pageRange = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i)

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-surface flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">&#x1f3ac;</p>
          <p className="text-text-primary text-lg font-semibold mb-2">Something went wrong</p>
          <p className="text-text-muted text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
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
      {/* Ambient glow behind hero — only on page 1 */}
      {currentPage === 1 && featured?.backdrop_path ? (
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, url(${IMG_BASE}/w500${featured.backdrop_path}) 0%, transparent 70%)`,
          }}
        />
      ) : null}

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-5 md:py-8">
        {/* Navigation */}
        <Navbar />

        {/* Hero / Featured Movie — only on page 1 */}
        {featured && currentPage === 1 && (
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

        {/* Movie Category Sections — only on page 1 */}
        {currentPage === 1 && (
          <>
            <div>
              <HorizontalSection title="Trending" subtitle="What's hot this week" movies={trendingSection} onMovieClick={openDetail} />
            </div>
            <div>
              <HorizontalSection title="Popular" subtitle="Most watched right now" movies={popularSection} onMovieClick={openDetail} />
            </div>
            <div>
              <HorizontalSection title="Top Rated" subtitle="Critics' picks" movies={topRatedSection} onMovieClick={openDetail} />
            </div>
          </>
        )}

        {/* Section Header + Genre Filters */}
        <motion.div ref={nowPlayingRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6 md:mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-text-primary">{CATEGORIES.find(c => c.key === activeCategory)?.label || 'Now Playing'}</h3>
              <p className="text-text-muted text-xs sm:text-sm mt-1">{filteredMovies.length} results</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGenres(!showGenres)}
                className="bg-surface-elevated border border-zinc-800 text-text-primary text-xs font-bold px-4 py-2 rounded-full hover:border-accent transition-all active:scale-95 flex items-center gap-2"
              >
                {showGenres ? 'Hide Filters' : 'Filters'}
                {(activeGenres.length > 0 || activeProviders.length > 0 || contentType !== 'all') && (
                  <span className="bg-accent text-black text-[10px] px-1.5 py-0.5 rounded-full">
                    {[activeGenres.length, activeProviders.length, contentType !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Genre filter pills - collapsible */}
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
                    {[
                      { key: 'now_playing', label: 'Now Playing' },
                      { key: 'trending', label: 'Trending' },
                      { key: 'popular', label: 'Popular' },
                      { key: 'top_rated', label: 'Top Rated' },
                    ].map(c => (
                      <button
                        key={c.key}
                        onClick={() => toggleCategory(c.key)}
                        className={`shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                          activeCategory === c.key
                            ? 'bg-accent text-black'
                            : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        {c.label}
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

                {/* Platform Section */}
                {availableProviders.length > 0 && (
                  <div className="mt-4 pb-4 border-b border-zinc-800/50">
                    <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Platform</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveProviders([])}
                        className={`shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                          activeProviders.length === 0
                            ? 'bg-accent text-black'
                            : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        All
                      </button>
                      {availableProviders.map(p => (
                        <button
                          key={p.provider_id}
                          onClick={() => toggleProvider(p.provider_id)}
                          className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                            activeProviders.includes(p.provider_id)
                              ? 'bg-accent text-black'
                              : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          <img
                            src={`${IMG_BASE}/w45${p.logo_path}`}
                            alt={p.provider_name}
                            className="w-4 h-4 rounded-sm object-cover"
                            loading="lazy"
                          />
                          {p.provider_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Type Section */}
                <div className="mt-4 pb-4 border-b border-zinc-800/50">
                  <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Type</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'movie', label: 'Movies' },
                      { key: 'tv', label: 'TV Series' },
                      { key: 'anime', label: 'Anime' },
                    ].map(t => (
                      <button
                        key={t.key}
                        onClick={() => {
                          setContentType(t.key as 'all' | 'movie' | 'tv' | 'anime')
                          setCurrentPage(1)
                        }}
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

        {/* Movie Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 pb-8">
          {paginatedMovies.map((movie, i) => (
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
                {movie.genre_ids?.includes(16) && (movie as any).original_language === 'ja' && (
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

        {/* Pagination — sliding window of 5 pages */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center justify-center gap-2 py-8 pb-12"
          >
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-text-primary hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            >
              ← Prev
            </button>
            {pageRange.map(page => (
              <button
                key={page}
                onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className={`w-9 h-9 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-110 active:scale-95 ${
                  currentPage === page
                    ? 'bg-accent text-black shadow-lg shadow-accent/20'
                    : 'bg-surface-elevated border border-zinc-800 text-text-muted hover:border-zinc-600'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-text-primary hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            >
              Next →
            </button>
          </motion.div>
        )}

        {/* Empty state with smart suggestions */}
        {filteredMovies.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">&#x1f50d;</p>
            <p className="text-text-primary text-sm font-bold mb-2">No results found</p>
            <p className="text-text-muted text-xs mb-6">Try adjusting your filters or explore these suggestions</p>

            {/* Smart suggestions based on current filters */}
            <div className="flex flex-wrap justify-center gap-2">
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
                onClick={() => { setActiveGenres([]); setActiveProviders([]); setContentType('movie') }}
                className="text-xs font-medium px-4 py-2 rounded-full bg-accent text-black hover:bg-accent/90 transition-all"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={loadMoreRef} className="py-8" />
      </div>
    </div>
  )
}
