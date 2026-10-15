import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { fetchWithRateLimit, IMG_BASE } from '../utils/api'
import { REGION_MAP } from '../utils/constants'
import { useRegion } from '../utils/region'

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
  total_results?: number
}

const NAV_LINKS = [
  { label: 'Now Playing', path: '/category/now_playing' },
  { label: 'Trending', path: '/category/trending' },
  { label: 'Popular', path: '/category/popular' },
  { label: 'Top Rated', path: '/category/top_rated' },
  { label: 'Watchlist', path: '/watchlist' },
]

const TRENDING_SEARCHES = ['One Piece', 'Demon Slayer', 'Naruto', 'Dragon Ball', 'Jujutsu Kaisen', 'Attack on Titan']

// The desktop and mobile search boxes were two ~80-line copies of the same
// markup, and a fix to one silently missed the other. One renderer now serves
// both; only the sizing classes differ.
function SearchField({
  variant, searchInput, onSearchInput, onEnter, onKeyNav, onFocus, onBlur,
}: {
  variant: 'desktop' | 'mobile'
  searchInput: string
  onSearchInput: (value: string) => void
  onEnter: () => void
  onKeyNav: (key: 'ArrowDown' | 'ArrowUp' | 'Escape') => boolean
  onFocus: () => void
  onBlur: () => void
}) {
  const isDesktop = variant === 'desktop'
  // Padding is set per variant and never layered: `pr-4` combined with `pr-3`
  // resolves by stylesheet order, not by which class was listed last here.
  const sizing = isDesktop ? 'text-xs pr-3 py-2' : 'text-sm pr-4 py-2.5'
  return (
    <>
      <svg
        className={`absolute ${isDesktop ? 'left-3' : 'left-7'} top-1/2 -translate-y-1/2 text-text-muted`}
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        value={searchInput}
        onChange={(e) => onSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onEnter(); return }
          // Arrow keys move through the result list; the panel reports whether
          // it consumed the key so typing at the ends is unaffected.
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Escape') {
            if (onKeyNav(e.key)) e.preventDefault()
          }
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Search movies, TV, anime..."
        role="combobox"
        aria-expanded={false}
        aria-autocomplete="list"
        className={`w-full bg-surface-elevated border border-zinc-800 text-text-primary pl-9 rounded-full focus:border-accent focus:outline-none transition-colors placeholder:text-zinc-600 ${sizing}`}
      />
    </>
  )
}

// Dropdown shared by both variants — trending terms when idle, results once a
// query resolves, plus the "see all" row. The result list is a listbox: the
// input keeps focus and moves `activeIndex` with the arrow keys.
function SearchPanel({
  showTrending, showSearchResults, searchResults, activeIndex, searchInput, onPickTerm, onPickResult, onSeeAll,
}: {
  showTrending: boolean
  showSearchResults: boolean
  searchResults: SearchResult[]
  activeIndex: number
  searchInput: string
  onPickTerm: (term: string) => void
  onPickResult: (id: number, mediaType: 'movie' | 'tv') => void
  onSeeAll: () => void
}) {
  if (showTrending && !searchInput) {
    return (
      <div className="absolute top-full mt-2 w-full bg-surface-elevated border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
        <div className="p-2.5 border-b border-zinc-800">
          <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Trending Searches</p>
        </div>
        <div className="p-2 flex flex-wrap gap-2">
          {TRENDING_SEARCHES.map(term => (
            <button
              key={term}
              type="button"
              onMouseDown={() => onPickTerm(term)}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-surface-card text-text-muted hover:text-accent hover:bg-surface transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (showSearchResults && searchResults.length > 0) {
    return (
      <div className="absolute top-full mt-2 w-full bg-surface-elevated border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
        {/* aria-live announces the result count as the user types. */}
        <p className="sr-only" aria-live="polite">
          {searchResults.length} results available. Use the up and down arrow keys to review them.
        </p>
        <ul role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto">
          {searchResults.map((movie, index) => (
            <li key={`${movie.media_type}-${movie.id}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={() => onPickResult(movie.id, movie.media_type)}
                className={`w-full flex items-center gap-3 p-2.5 transition-colors text-left ${
                  index === activeIndex ? 'bg-surface-card' : 'hover:bg-surface-card'
                }`}
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
            </li>
          ))}
        </ul>
        <button
          type="button"
          onMouseDown={onSeeAll}
          className="w-full text-center text-xs font-bold text-accent hover:text-white py-2.5 border-t border-zinc-800 transition-colors"
        >
          See all results for "{searchInput}"
        </button>
      </div>
    )
  }

  return null
}

// Region selector — which country's streaming catalog the app shows. Sits in
// the nav next to the search so it is reachable from every route.
function RegionSelect({ compact = false }: { compact?: boolean }) {
  const { region, setRegion } = useRegion()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Regions sorted by name — a 40-entry dropdown in map order is unscannable.
  const options = useMemo(
    () => Object.entries(REGION_MAP).sort((a, b) => a[1].name.localeCompare(b[1].name)),
    [],
  )

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = REGION_MAP[region]

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Change streaming region"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center gap-1.5 bg-surface-elevated border border-zinc-800 rounded-full text-text-muted hover:border-accent hover:text-text-primary transition-colors active:scale-95 ${
          compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2 text-xs'
        }`}
      >
        <span aria-hidden="true">{current?.flag || '🌍'}</span>
        <span className="font-bold">{region}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Streaming region"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 max-h-72 overflow-y-auto bg-surface-elevated border border-zinc-800 rounded-xl shadow-2xl z-50 py-1"
          >
            {options.map(([code, meta]) => (
              <li key={code} role="option" aria-selected={code === region}>
                <button
                  type="button"
                  onClick={() => { setRegion(code); setOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                    code === region ? 'text-accent font-bold bg-surface-card' : 'text-text-muted hover:bg-surface-card hover:text-text-primary'
                  }`}
                >
                  <span aria-hidden="true">{meta.flag}</span>
                  <span className="flex-1 truncate">{meta.name}</span>
                  <span className="text-text-muted/60 font-mono text-[10px]">{code}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

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
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Check if a nav link is active
  const isActive = (path: string) => location.pathname === path

  useEffect(() => {
    return () => { clearTimeout(searchTimerRef.current) }
  }, [])

  // Tap/click outside or Escape dismisses the mobile menu and the search panels.
  // Before this, a phone user could only close the menu by hitting the hamburger
  // again, and a tap on the page behind a search dropdown did nothing.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      // The nav owns its own children: the hamburger toggles itself, the search
      // field keeps its dropdown, and a nav link closes the menu in its onClick.
      // Anything outside the nav dismisses both the menu and the search panels.
      if (target?.closest?.('nav')) return
      setMenuOpen(false)
      setShowSearchResults(false)
      setShowTrending(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      setShowSearchResults(false)
      setShowTrending(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const handleSearch = useCallback(async (query: string) => {
    if (!query) {
      setSearchResults([])
      setActiveIndex(-1)
      setShowSearchResults(false)
      return
    }
    try {
      const data = await fetchWithRateLimit<SearchResponse>(
        `/search/multi?query=${encodeURIComponent(query)}&language=en-US&include_adult=false&page=1`
      )
      // Movie and TV ids live in separate TMDB namespaces, so `${type}-${id}` is the
      // only collision-safe key. Dedupe on it: the dropdown keyed rows by bare id before,
      // which React could silently collapse/mismatch.
      const seen = new Set<string>()
      const results: SearchResult[] = []
      for (const r of data.results || []) {
        if (r.media_type !== 'movie' && r.media_type !== 'tv') continue
        const key = `${r.media_type}-${r.id}`
        if (seen.has(key)) continue
        seen.add(key)
        results.push({
          id: r.id,
          media_type: r.media_type,
          poster_path: r.poster_path,
          vote_average: r.vote_average,
          title: r.title || r.name || '',
          release_date: r.release_date || r.first_air_date || '',
        })
        if (results.length === 8) break
      }
      setSearchResults(results)
      setActiveIndex(-1)
      setShowSearchResults(true)
    } catch {
      setSearchResults([])
      setActiveIndex(-1)
    }
  }, [])

  // Arrow keys walk the dropdown while focus stays in the input; Enter opens
  // the highlighted row. Returns whether the panel consumed the key.
  const handleResultKeyNav = useCallback((key: 'ArrowDown' | 'ArrowUp' | 'Escape'): boolean => {
    if (key === 'Escape') {
      const wasOpen = showSearchResults || showTrending
      setShowSearchResults(false)
      setShowTrending(false)
      setActiveIndex(-1)
      return wasOpen
    }
    if (!showSearchResults || searchResults.length === 0) {
      // Down on an idle input re-opens the last result set, if there is one.
      if (key === 'ArrowDown' && searchResults.length > 0) {
        setShowSearchResults(true)
        setActiveIndex(0)
        return true
      }
      return false
    }
    const next = key === 'ArrowDown'
      ? Math.min(activeIndex + 1, searchResults.length - 1)
      : Math.max(activeIndex - 1, 0)
    setActiveIndex(next)
    return true
  }, [showSearchResults, showTrending, searchResults, activeIndex])

  const onSearchInput = (val: string) => {
    setSearchInput(val)
    clearTimeout(searchTimerRef.current)
    if (!val) { handleSearch(''); return }
    searchTimerRef.current = setTimeout(() => handleSearch(val), 400)
  }

  const goToDetail = (id: number, mediaType: 'movie' | 'tv') => {
    setSearchInput('')
    setShowSearchResults(false)
    setActiveIndex(-1)
    navigate(`/${mediaType}/${id}`)
  }

  const goToSearchPage = (query?: string) => {
    const q = (query ?? searchInput).trim()
    if (!q) return
    setShowSearchResults(false)
    setShowTrending(false)
    setActiveIndex(-1)
    setMenuOpen(false)
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  // Enter inside the dropdown opens the highlighted row instead of the search page.
  const onSearchEnter = () => {
    if (showSearchResults && activeIndex >= 0 && searchResults[activeIndex]) {
      const picked = searchResults[activeIndex]
      goToDetail(picked.id, picked.media_type)
      return
    }
    goToSearchPage()
  }

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-zinc-800/50 safe-top"
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
            <div className="hidden md:flex relative w-full max-w-[280px]">
              <SearchField
                variant="desktop"
                searchInput={searchInput}
                onSearchInput={onSearchInput}
                onEnter={onSearchEnter}
                onKeyNav={(key) => handleResultKeyNav(key)}
                onFocus={() => {
                  if (!searchInput) setShowTrending(true)
                  else if (searchResults.length > 0) setShowSearchResults(true)
                }}
                onBlur={() => setTimeout(() => { setShowSearchResults(false); setShowTrending(false) }, 200)}
              />
              <SearchPanel
                showTrending={showTrending}
                showSearchResults={showSearchResults}
                searchResults={searchResults}
                activeIndex={activeIndex}
                searchInput={searchInput}
                onPickTerm={(term) => { setSearchInput(term); handleSearch(term); setShowTrending(false) }}
                onPickResult={goToDetail}
                onSeeAll={() => goToSearchPage()}
              />
            </div>

            <div className="hidden md:block">
              <RegionSelect />
            </div>

            {/* Mobile hamburger + region */}
            <RegionSelect compact />
            <button
              className="md:hidden text-text-primary p-2 active:scale-90 transition-transform"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>

        {/* Mobile search — kept inside the sticky nav so it never scrolls away
            with the page the way the old bar (below the nav) did. */}
        <div className="md:hidden relative max-w-[1400px] mx-auto px-4 sm:px-6 pb-3">
          <SearchField
            variant="mobile"
            searchInput={searchInput}
            onSearchInput={onSearchInput}
            onEnter={onSearchEnter}
            onKeyNav={(key) => handleResultKeyNav(key)}
            onFocus={() => {
              if (!searchInput) setShowTrending(true)
              else if (searchResults.length > 0) setShowSearchResults(true)
            }}
            onBlur={() => setTimeout(() => { setShowSearchResults(false); setShowTrending(false) }, 200)}
          />
          <SearchPanel
            showTrending={showTrending}
            showSearchResults={showSearchResults}
            searchResults={searchResults}
            activeIndex={activeIndex}
            searchInput={searchInput}
            onPickTerm={(term) => { setSearchInput(term); handleSearch(term); setShowTrending(false) }}
            onPickResult={goToDetail}
            onSeeAll={() => goToSearchPage()}
          />
        </div>

        {/* Mobile menu overlay — anchored to the nav's own bottom edge instead
            of a hardcoded offset, so it still clears the search bar now that the
            bar lives inside the sticky nav. */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden absolute top-full left-0 right-0 z-30 bg-surface-elevated border-b border-zinc-800 p-5"
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
      </motion.nav>
    </>
  )
}
