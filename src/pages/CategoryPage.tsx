import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { ImageWithFallback } from '../components/ImageWithFallback'
import Navbar from '../components/Navbar'
import { fetchWithRateLimit, BASE_URL, IMG_BASE } from '../utils/api'
import { GENRE_MAP, formatDate } from '../utils/constants'

interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

interface Movie {
  id: number
  title: string
  poster_path: string
  vote_average: number
  release_date: string
  genre_ids: number[]
  overview: string
  providers?: WatchProvider[]
  media_type?: 'movie' | 'tv'
  origin_country?: string[]
  status?: string
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

export default function CategoryPage() {
  const { type } = useParams<{ type: string }>()
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [activeGenres, setActiveGenres] = useState<number[]>([])
  const [activeProviders, setActiveProviders] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [contentType, setContentType] = useState<'all' | 'movie' | 'tv' | 'anime'>('movie')

  const titles: Record<string, string> = {
    trending: 'Trending',
    popular: 'Popular',
    top_rated: 'Top Rated',
    now_playing: 'Now Playing',
  }

  // Map category to both movie and TV endpoints
  const endpointMap: Record<string, { movie: string; tv: string }> = {
    trending: { movie: '/trending/movie/week', tv: '/trending/tv/week' },
    popular: { movie: '/movie/popular', tv: '/tv/popular' },
    top_rated: { movie: '/movie/top_rated', tv: '/tv/top_rated' },
    now_playing: { movie: '/movie/now_playing', tv: '/tv/on_the_air' },
  }

  const { data: movies, isLoading } = useQuery({
    queryKey: ['category', type, page],
    queryFn: async () => {
      const endpoints = endpointMap[type || 'popular']
      // Fetch both movie and TV using rate-limited fetch
      const [movieData, tvData] = await Promise.all([
        fetchWithRateLimit<any>(`${BASE_URL}${endpoints.movie}?language=en-US&page=${page}`),
        fetchWithRateLimit<any>(`${BASE_URL}${endpoints.tv}?language=en-US&page=${page}`)
      ])

      const movies = (movieData.results || []).map(normalizeMovie)
      const tvShows = (tvData.results || []).map(normalizeTv)

      // Interleave or combine results
      return [...movies, ...tvShows]
    },
    retry: 2,
    retryDelay: 1000,
  })

  const renderDedup = (arr: Movie[]) => {
    const seen = new Set<number>()
    return arr.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
  }

  useEffect(() => {
    setAllMovies([])
    setPage(1)
    setActiveGenres([])
    setActiveProviders([])
    setLoading(true)
  }, [type])

  useEffect(() => {
    if (movies) {
      // Pagination: replace data instead of appending
      setAllMovies(renderDedup(movies))
      setLoading(false)
      window.scrollTo(0, 0)
    }
  }, [movies])

  // Fetch providers for loaded movies - optimized with parallel requests
  useEffect(() => {
    if (allMovies.length === 0) return

    const fetchProviders = async () => {
      const updated = new Map<number, WatchProvider[]>()

      // Get movies without providers
      const moviesToFetch = allMovies.filter(m => !m.providers)

      // Parallel batch fetch (max 5 concurrent to avoid rate limits)
      const BATCH_SIZE = 5
      for (let i = 0; i < moviesToFetch.length; i += BATCH_SIZE) {
        const batch = moviesToFetch.slice(i, i + BATCH_SIZE)
        const results = await Promise.all(
          batch.map(async (movie) => {
            try {
              const mediaType = movie.media_type === 'tv' ? 'tv' : 'movie'
              const data = await fetchWithRateLimit<any>(`${BASE_URL}/${mediaType}/${movie.id}/watch/providers`)
              const regionResults = data.results?.ID || {}
              return { id: movie.id, providers: regionResults.flatrate || regionResults.rent || regionResults.buy || [] }
            } catch {
              return { id: movie.id, providers: [] }
            }
          })
        )

        // Apply batch results immediately
        results.forEach(r => updated.set(r.id, r.providers))
        setAllMovies(prev => prev.map(m => ({ ...m, providers: updated.get(m.id) || m.providers })))
      }
    }

    fetchProviders()
  }, [allMovies.length])

  const [isFiltering, setIsFiltering] = useState(false)
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([])

  useEffect(() => {
    setIsFiltering(true)
    const filtered = allMovies.filter(m => {
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

    // Sort by release date descending to ensure newest first
    filtered.sort((a, b) => {
      const dateA = new Date(a.release_date || 0).getTime()
      const dateB = new Date(b.release_date || 0).getTime()
      return dateB - dateA
    })

    setFilteredMovies(filtered)
    setIsFiltering(false)
  }, [allMovies, activeGenres, activeProviders, contentType])

  // Filter by contentType first to compute available genres dynamically
  const typeFilteredMovies = useMemo(() => allMovies.filter(m => {
    const isJapaneseAnimation = m.genre_ids?.includes(16) && (m as any).original_language === 'ja'
    if (contentType === 'all') return true
    if (contentType === 'anime') return isJapaneseAnimation
    return m.media_type === contentType
  }), [allMovies, contentType])

  const availableGenres = useMemo(() => {
    const genreIds = new Set<number>()
    typeFilteredMovies.forEach(m => m.genre_ids?.forEach(id => genreIds.add(id)))
    return [...genreIds].map(id => ({ id, name: GENRE_MAP[id] })).filter(g => g.name).sort((a, b) => a.name.localeCompare(b.name))
  }, [typeFilteredMovies])

  const availableProviders = useMemo(() => {
    const map = new Map<number, WatchProvider>()
    typeFilteredMovies.forEach(m => m.providers?.forEach(p => map.set(p.provider_id, p)))
    return [...map.values()].sort((a, b) => a.provider_name.localeCompare(b.provider_name))
  }, [typeFilteredMovies])

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary">{titles[type || 'popular']}</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-surface-elevated border border-zinc-800 text-text-primary text-xs font-bold px-4 py-2 rounded-full hover:border-accent transition-all active:scale-95 flex items-center gap-2"
          >
            {showFilters ? 'Hide Filters' : 'Filters'}
            {(activeGenres.length > 0 || activeProviders.length > 0 || contentType !== 'all') && (
              <span className="bg-accent text-black text-[10px] px-1.5 py-0.5 rounded-full">
                {[activeGenres.length, activeProviders.length, contentType !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
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
                      onClick={() => setActiveGenres(prev => prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id])}
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
                <div className="pt-4 pb-2">
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
                        onClick={() => setActiveProviders(prev => prev.includes(p.provider_id) ? prev.filter(id => id !== p.provider_id) : [...prev, p.provider_id])}
                        className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                          activeProviders.includes(p.provider_id)
                            ? 'bg-accent text-black'
                            : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <img src={`${IMG_BASE}/w45${p.logo_path}`} alt={p.provider_name} className="w-4 h-4 rounded-sm object-cover" loading="lazy" />
                        {p.provider_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Type Section */}
              <div className="pt-4 pb-4 border-b border-zinc-800/50">
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
                      onClick={() => setContentType(t.key as 'all' | 'movie' | 'tv' | 'anime')}
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

        {/* Results count */}
        <p className="text-text-muted text-xs mb-4">{isFiltering ? 'Filtering...' : `${filteredMovies.length} results`}</p>

        {/* Movie Grid — Virtualized */}
        <motion.div
          animate={{ opacity: isFiltering ? 0.4 : 1 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {loading && allMovies.length === 0 ? (
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
                    {m.genre_ids?.includes(16) && (m as any).original_language === 'ja' && (
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
        {filteredMovies.length === 0 && !loading && !isFiltering && (
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

        {/* Pagination Controls */}
        <div className="flex justify-center gap-4 py-8">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="bg-surface-elevated border border-zinc-800 text-text-primary px-6 py-2 rounded-full font-bold hover:border-accent disabled:opacity-50"
          >
            Previous
          </button>
          <span className="flex items-center text-text-muted font-mono">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            className="bg-surface-elevated border border-zinc-800 text-text-primary px-6 py-2 rounded-full font-bold hover:border-accent"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
