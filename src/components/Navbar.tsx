import { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { fetchWithRateLimit, IMG_BASE } from '../utils/api'

interface SearchResult {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  vote_average: number
  media_type: 'movie' | 'tv'
}

interface SearchResponse {
  results: Array<{
    id: number
    title?: string
    name?: string
    poster_path: string | null
    release_date?: string
    first_air_date?: string
    vote_average: number
    media_type: 'movie' | 'tv'
  }>
}

const NAV_LINKS = [
  { label: 'Now Playing', path: '/category/now_playing' },
  { label: 'Trending', path: '/category/trending' },
  { label: 'Popular', path: '/category/popular' },
  { label: 'Top Rated', path: '/category/top_rated' },
]

const TRENDING_SEARCHES = ['One Piece', 'Demon Slayer', 'Naruto', 'Dragon Ball', 'Jujutsu Kaisen', 'Attack on Titan']

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open ? (
        <>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </>
      ) : (
        <>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </>
      )}
    </svg>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showTrending, setShowTrending] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Check if a nav link is active
  const isActive = (path: string) => location.pathname === path

  useEffect(() => {
    return () => { clearTimeout(searchTimerRef.current) }
  }, [])

  const handleSearch = useCallback(async (query: string) => {
    if (!query) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    try {
      const data = await fetchWithRateLimit<SearchResponse>(
        `/search/multi?query=${encodeURIComponent(query)}&language=en-US&page=1`
      )
      const results = (data.results || [])
        .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 8)
        .map(r => ({
          ...r,
          title: r.title || r.name || '',
          release_date: r.release_date || r.first_air_date || '',
        }))
      setSearchResults(results)
      setShowSearchResults(true)
    } catch {
      setSearchResults([])
    }
  }, [])

  const onSearchInput = (val: string) => {
    setSearchInput(val)
    clearTimeout(searchTimerRef.current)
    if (!val) { handleSearch(''); return }
    searchTimerRef.current = setTimeout(() => handleSearch(val), 400)
  }

  const goToDetail = (id: number, mediaType: 'movie' | 'tv') => {
    setSearchInput('')
    setShowSearchResults(false)
    navigate(`/${mediaType}/${id}`)
  }

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-zinc-800/50"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl sm:text-2xl font-black tracking-tight text-text-primary shrink-0">
              SARANIN<span className="text-accent">.</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6 text-sm text-text-muted">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`transition-colors whitespace-nowrap font-medium ${
                    isActive(link.path)
                      ? 'text-accent'
                      : 'text-text-muted hover:text-accent'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end max-w-xl">
            {/* Search Bar */}
            <div className="hidden md:flex relative w-full max-w-[280px]" ref={searchRef}>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => onSearchInput(e.target.value)}
                onFocus={() => {
                  if (!searchInput) setShowTrending(true)
                  else if (searchResults.length > 0) setShowSearchResults(true)
                }}
                onBlur={() => setTimeout(() => { setShowSearchResults(false); setShowTrending(false) }, 200)}
                placeholder="Search movies, TV, anime..."
                className="w-full bg-surface-elevated border border-zinc-800 text-text-primary text-xs pl-9 pr-3 py-2 rounded-full focus:border-accent focus:outline-none transition-colors placeholder:text-zinc-600"
              />

              {/* Trending searches dropdown */}
              {showTrending && !searchInput && (
                <div className="absolute top-full mt-2 w-full bg-surface-elevated border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                  <div className="p-2.5 border-b border-zinc-800">
                    <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Trending Searches</p>
                  </div>
                  <div className="p-2 flex flex-wrap gap-2">
                    {TRENDING_SEARCHES.map(term => (
                      <button
                        key={term}
                        onMouseDown={() => {
                          setSearchInput(term)
                          handleSearch(term)
                          setShowTrending(false)
                        }}
                        className="text-xs font-medium px-3 py-1.5 rounded-full bg-surface-card text-text-muted hover:text-accent hover:bg-surface transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-surface-elevated border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                  {searchResults.map(movie => (
                    <button
                      key={movie.id}
                      onMouseDown={() => goToDetail(movie.id, movie.media_type)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-surface-card transition-colors text-left"
                    >
                      <div className="w-8 h-12 rounded-md overflow-hidden bg-surface-card shrink-0">
                        {movie.poster_path ? (
                          <img src={`${IMG_BASE}/w92${movie.poster_path}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">🎬</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-xs font-bold line-clamp-1">{movie.title}</p>
                        <div className="flex items-center gap-2 text-text-muted text-[10px]">
                          <span>{movie.media_type === 'tv' ? '📺 TV' : '🎬 Movie'}</span>
                          <span>{movie.release_date?.split('-')[0]}</span>
                          {movie.vote_average > 0 && <span className="text-accent">★ {movie.vote_average.toFixed(1)}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-text-primary p-2 active:scale-90 transition-transform"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Search Bar */}
      <div className="md:hidden relative max-w-[1400px] mx-auto px-4 sm:px-6 -mt-3 mb-4">
        <svg className="absolute left-7 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => onSearchInput(e.target.value)}
          onFocus={() => {
            if (!searchInput) setShowTrending(true)
            else if (searchResults.length > 0) setShowSearchResults(true)
          }}
          onBlur={() => setTimeout(() => { setShowSearchResults(false); setShowTrending(false) }, 200)}
          placeholder="Search movies, TV, anime..."
          className="w-full bg-surface-elevated border border-zinc-800 text-text-primary text-sm pl-9 pr-4 py-2.5 rounded-full focus:border-accent focus:outline-none transition-colors placeholder:text-zinc-600"
        />

        {/* Trending searches dropdown - Mobile */}
        {showTrending && !searchInput && (
          <div className="absolute top-full mt-2 w-full bg-surface-elevated border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
            <div className="p-2.5 border-b border-zinc-800">
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Trending Searches</p>
            </div>
            <div className="p-2 flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map(term => (
                <button
                  key={term}
                  onMouseDown={() => {
                    setSearchInput(term)
                    handleSearch(term)
                    setShowTrending(false)
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-surface-card text-text-muted hover:text-accent hover:bg-surface transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-surface-elevated border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
            {searchResults.map(movie => (
              <button
                key={movie.id}
                onMouseDown={() => goToDetail(movie.id, movie.media_type)}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-surface-card transition-colors text-left"
              >
                <div className="w-8 h-12 rounded-md overflow-hidden bg-surface-card shrink-0">
                  {movie.poster_path ? (
                    <img src={`${IMG_BASE}/w92${movie.poster_path}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">🎬</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-xs font-bold line-clamp-1">{movie.title}</p>
                  <div className="flex items-center gap-2 text-text-muted text-[10px]">
                    <span>{movie.media_type === 'tv' ? '📺 TV' : '🎬 Movie'}</span>
                    <span>{movie.release_date?.split('-')[0]}</span>
                    {movie.vote_average > 0 && <span className="text-accent">★ {movie.vote_average.toFixed(1)}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed top-14 left-0 right-0 z-30 bg-surface-elevated border-b border-zinc-800 p-5"
          >
            <div className="flex flex-col gap-4 text-sm">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMenuOpen(false)}
                  className={`transition-colors font-medium ${
                    isActive(link.path)
                      ? 'text-accent'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
