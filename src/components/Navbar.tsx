import { useState, useRef, useCallback, useEffect, useMemo, type FocusEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { fetchWithRateLimit } from '../utils/api'
import { tmdbImage } from '../utils/imageSizes'
import { ImageWithFallback } from './ImageWithFallback'
import { REGION_MAP } from '../utils/constants'
import { useRegion } from '../utils/region'
import { useLocale, type Locale } from '../utils/locale'
import { useSearchHistory } from '../utils/searchHistory'

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
  variant, searchInput, onSearchInput, onEnter, onKeyNav, onFocus, onBlur, onEscape, expanded, listboxId, autoFocus = false,
}: {
  variant: 'desktop' | 'mobile'
  searchInput: string
  onSearchInput: (value: string) => void
  onEnter: () => void
  onKeyNav: (key: 'ArrowDown' | 'ArrowUp' | 'Escape') => boolean
  onFocus: () => void
  onBlur: (e: FocusEvent<HTMLInputElement>) => void
  /** Escape with no open panel — collapse the desktop field, blur on mobile. */
  onEscape?: () => void
  expanded: boolean
  listboxId: string
  autoFocus?: boolean
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
            // Nothing to dismiss inside the field — hand the key to the host,
            // which collapses the desktop field (and blurs on mobile).
            else if (e.key === 'Escape') onEscape?.()
          }
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Search movies, TV, anime..."
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoFocus={autoFocus}
        className={`w-full bg-surface-elevated border border-zinc-800 text-text-primary pl-9 rounded-full focus:border-accent focus:outline-none transition-colors placeholder:text-zinc-600 ${sizing}`}
      />
    </>
  )
}

// Dropdown shared by both variants — recent searches + trending terms when
// idle, results once a query resolves, plus the "see all" row. The result list
// is a listbox: the input keeps focus and moves `activeIndex` with arrow keys.
function SearchPanel({
  id, showTrending, showSearchResults, searchResults, activeIndex, searchInput, recentSearches,
  onPickTerm, onPickResult, onSeeAll, onRemoveRecent, onClearRecent,
}: {
  id: string
  showTrending: boolean
  showSearchResults: boolean
  searchResults: SearchResult[]
  activeIndex: number
  searchInput: string
  recentSearches: string[]
  onPickTerm: (term: string) => void
  onPickResult: (id: number, mediaType: 'movie' | 'tv') => void
  onSeeAll: () => void
  onRemoveRecent: (term: string) => void
  onClearRecent: () => void
}) {
  if (showTrending && !searchInput) {
    return (
      <div id={id} data-search-panel className="absolute top-full mt-2 w-full bg-surface-elevated border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
        {/* Recent searches first — the user's own history beats our defaults. */}
        {recentSearches.length > 0 && (
          <>
            <div className="p-2.5 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Recent</p>
              <button
                type="button"
                onClick={onClearRecent}
                className="text-text-muted text-[10px] font-bold hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="p-2 flex flex-wrap gap-2 border-b border-zinc-800">
              {recentSearches.map(term => (
                <span key={term} className="inline-flex items-center rounded-full bg-surface-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onPickTerm(term)}
                    className="text-xs font-medium pl-3 pr-1 py-1.5 text-text-muted hover:text-accent transition-colors"
                  >
                    {term}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveRecent(term)}
                    aria-label={`Remove "${term}" from recent searches`}
                    className="text-text-muted/70 hover:text-red-400 text-[10px] leading-none px-2 py-1.5 transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </>
        )}
        <div className="p-2.5 border-b border-zinc-800">
          <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Trending Searches</p>
        </div>
        <div className="p-2 flex flex-wrap gap-2">
          {TRENDING_SEARCHES.map(term => (
            <button
              key={term}
              type="button"
              onClick={() => onPickTerm(term)}
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
      <div id={id} data-search-panel className="absolute top-full mt-2 w-full bg-surface-elevated border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
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
                onClick={() => onPickResult(movie.id, movie.media_type)}
                className={`w-full flex items-center gap-3 p-2.5 transition-colors text-left ${
                  index === activeIndex ? 'bg-surface-card' : 'hover:bg-surface-card'
                }`}
              >
                <div className="relative w-8 h-12 rounded-md overflow-hidden bg-surface-card shrink-0">
                  <ImageWithFallback
                    src={tmdbImage(movie.poster_path, 'poster', 'w92')}
                    alt=""
                    kind="poster"
                    className="w-full h-full object-cover"
                    fallbackText="🎬"
                    sizes="32px"
                  />
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
          onClick={onSeeAll}
          className="w-full text-center text-xs font-bold text-accent hover:text-white py-2.5 border-t border-zinc-800 transition-colors"
        >
          See all results for "{searchInput}"
        </button>
      </div>
    )
  }

  // A settled query with zero rows keeps the panel OPEN with a real message —
  // closing it on an empty result read as the search "not responding".
  if (showSearchResults && searchResults.length === 0 && searchInput.trim().length >= 2) {
    return (
      <div id={id} data-search-panel className="absolute top-full mt-2 w-full bg-surface-elevated border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
        <p className="text-text-muted text-xs text-center py-5 px-4">
          No title matches "<span className="text-text-primary font-bold">{searchInput.trim()}</span>".
          Press <span className="text-accent font-bold">Enter</span> to search the full catalogue.
        </p>
        <button
          type="button"
          onClick={onSeeAll}
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
//
// The flag emoji is intentionally NOT rendered next to the code: on Windows,
// Chromium has no color flag font and paints the emoji as its two regional
// indicator letters, so 🇮🇩 + "ID" read as "ID ID" — the doubled-region report.
// The code alone is the label; the flag stays in the dropdown where the name
// sits beside it (and there the name disambiguates).
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

  // (No `current` lookup — the flag glyph it fed is gone; see the component
  // comment about Windows rendering flag emoji as letters.)

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
        {/* No flag glyph here — see the component comment: on Windows it
            duplicates the code ("ID ID"). */}
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
                  {/* No flag emoji here either — Windows paints it as the two
                      indicator letters, which triplicates with name + code. */}
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

// Language toggle — which language TMDB serves overviews/titles in. A two-way
// switch, so it is one button, not a dropdown.
function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale()
  const next: Locale = locale === 'en-US' ? 'id-ID' : 'en-US'
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={`Switch content language to ${next === 'id-ID' ? 'Indonesian' : 'English'}`}
      title="Content language — also changes synopses"
      className={`flex items-center gap-1.5 bg-surface-elevated border border-zinc-800 rounded-full text-text-muted hover:border-accent hover:text-text-primary transition-colors active:scale-95 ${
        compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2 text-xs'
      }`}
    >
      <span aria-hidden="true" className="font-bold text-[10px] tracking-wide">{locale === 'id-ID' ? 'ID' : 'EN'}</span>
    </button>
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
  // Search is a disclosure on both breakpoints: an icon in the nav row, and the
  // field only mounts once it is pressed. Phones used to carry a permanently
  // visible bar under the nav, which spent a row of every screen on an idle
  // control; the icon now reveals the same field (auto-focused, so the tap lands
  // straight in the keyboard).
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const desktopSearchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()
  // Guards two independent races:
  //   searchTokenRef  — a slow response for an older query must not overwrite
  //                     the results of a newer one (no ordering before this).
  //   closeTimerRef   — the 200ms blur close must not fire after the panel was
  //                     deliberately reopened.
  const searchTokenRef = useRef(0)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const { locale } = useLocale()
  const { items: recentSearches, add: addRecentSearch, remove: removeRecentSearch, clear: clearRecentSearches } = useSearchHistory()

  // Check if a nav link is active
  const isActive = (path: string) => location.pathname === path

  useEffect(() => {
    return () => {
      clearTimeout(searchTimerRef.current)
      clearTimeout(closeTimerRef.current)
    }
  }, [])

  // A route change ends the search interaction: navigating away with the field
  // still open left it hanging over the new page.
  useEffect(() => {
    setDesktopSearchOpen(false)
    setMobileSearchOpen(false)
    setShowSearchResults(false)
    setShowTrending(false)
    setActiveIndex(-1)
    // A late response for a query typed on the previous page must not reopen
    // the panel on the new one.
    searchTokenRef.current++
  }, [location.pathname])

  // A search field is a disclosure: a click anywhere outside its wrapper (a nav
  // link, the region picker, the page behind) collapses it. The generic
  // outside-click handler below deliberately ignores clicks inside <nav>, so
  // these wrappers own their own case. The toggle buttons carry
  // data-search-toggle and are exempt — without that, tapping the icon to close
  // would close on pointerdown and the click would immediately reopen it.
  useEffect(() => {
    if (!desktopSearchOpen && !mobileSearchOpen) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (target?.closest?.('[data-search-toggle]')) return
      const node = e.target as Node
      if (desktopSearchOpen && !desktopSearchRef.current?.contains(node)) setDesktopSearchOpen(false)
      if (mobileSearchOpen && !mobileSearchRef.current?.contains(node)) setMobileSearchOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [desktopSearchOpen, mobileSearchOpen])

  const closeSearchField = useCallback(() => {
    setDesktopSearchOpen(false)
    setMobileSearchOpen(false)
    setShowSearchResults(false)
    setShowTrending(false)
    setActiveIndex(-1)
    // Drop any in-flight response for the query that was being typed.
    searchTokenRef.current++
  }, [])

  const toggleMobileSearch = useCallback(() => {
    if (mobileSearchOpen) {
      closeSearchField()
    } else {
      setMobileSearchOpen(true)
    }
  }, [mobileSearchOpen, closeSearchField])

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
    // Ordering guard: typing "aveng" fires a request for "aven" 400ms earlier.
    // Both used to land on the same state, so a slow first response could
    // overwrite the newer one with stale rows. Only the newest query may write.
    const token = ++searchTokenRef.current
    try {
      const data = await fetchWithRateLimit<SearchResponse>(
        `/search/multi?query=${encodeURIComponent(query)}&language=${locale}&include_adult=false&page=1`
      )
      if (token !== searchTokenRef.current) return
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
      if (token !== searchTokenRef.current) return
      setSearchResults([])
      setActiveIndex(-1)
    }
  }, [locale])

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
    // 250ms: long enough to batch fast typing into one request, short enough
    // that the dropdown feels live. The old 400ms read as "searchnya ketutup /
    // ga responsif" — the panel sat empty for almost half a second per keystroke.
    searchTimerRef.current = setTimeout(() => handleSearch(val), 250)
  }

  // Focus moving INTO the dropdown (trending chips, result rows, "see all")
  // must not dismiss it — otherwise keyboard users could never reach those
  // controls, and pointer clicks depended on the 200ms race below. The timer is
  // tracked and cancelled when a panel reopens, so a delayed close can never
  // land on a panel the user just brought back.
  const closeSearchPanels = useCallback((e: FocusEvent<HTMLInputElement>) => {
    const next = e.relatedTarget as Element | null
    if (next?.closest?.('[data-search-panel]')) return
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setShowSearchResults(false)
      setShowTrending(false)
    }, 200)
  }, [])

  const openPanel = useCallback((which: 'trending' | 'results') => {
    clearTimeout(closeTimerRef.current)
    if (which === 'trending') setShowTrending(true)
    else setShowSearchResults(true)
  }, [])

  const goToDetail = (id: number, mediaType: 'movie' | 'tv') => {
    // A picked result means the query worked — that is a "committed" search.
    if (searchInput.trim().length >= 2) addRecentSearch(searchInput)
    setSearchInput('')
    setShowSearchResults(false)
    setActiveIndex(-1)
    setDesktopSearchOpen(false)
    setMobileSearchOpen(false)
    navigate(`/${mediaType}/${id}`)
  }

  const goToSearchPage = (query?: string) => {
    const q = (query ?? searchInput).trim()
    if (!q) return
    addRecentSearch(q)
    setShowSearchResults(false)
    setShowTrending(false)
    setActiveIndex(-1)
    setMenuOpen(false)
    setDesktopSearchOpen(false)
    setMobileSearchOpen(false)
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
      {/* Full-bleed sticky header. Rendered as a PORTAL-free sibling of the
          page container: it sits outside the `max-w-[1400px]` wrapper that
          every page mounts it in, so the bar and its bottom border span the
          whole body instead of stopping at the content's gutters (the
          "navbar nempel di div" report). React portals are avoided by making
          the bar position:fixed — the page then pads its own top by
          NAV_HEIGHT so nothing hides underneath it. */}
      <div aria-hidden="true" className="h-14 safe-top shrink-0" />
      <nav
        className="fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-md border-b border-zinc-800/50 safe-top"
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

          <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end max-w-xl">
            {/* Desktop search — the icon is the disclosure control and stays put,
                so it also closes the field it opened. The field, its dropdown and
                the outside-click wrapper only exist while open, so nothing in the
                navbar reserves space for a search bar nobody asked for. */}
            <button
              type="button"
              data-search-toggle
              onClick={() => {
                if (desktopSearchOpen) closeSearchField()
                else setDesktopSearchOpen(true)
              }}
              aria-label={desktopSearchOpen ? 'Close search' : 'Open search'}
              aria-expanded={desktopSearchOpen}
              className={`hidden md:grid h-9 w-9 place-items-center rounded-full bg-surface-elevated border transition-colors active:scale-95 shrink-0 ${
                desktopSearchOpen ? 'border-accent text-accent' : 'border-zinc-800 text-text-muted hover:border-accent hover:text-accent'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            {desktopSearchOpen && (
              <div ref={desktopSearchRef} className="hidden md:flex relative w-full max-w-[280px]">
                <SearchField
                  variant="desktop"
                  searchInput={searchInput}
                  onSearchInput={onSearchInput}
                  onEnter={onSearchEnter}
                  onKeyNav={(key) => handleResultKeyNav(key)}
                  onEscape={closeSearchField}
                  onFocus={() => {
                    if (!searchInput) openPanel('trending')
                    else if (searchResults.length > 0) openPanel('results')
                  }}
                  onBlur={closeSearchPanels}
                  expanded={showTrending || showSearchResults}
                  listboxId="search-panel-desktop"
                  autoFocus
                />
                <SearchPanel
                  id="search-panel-desktop"
                  showTrending={showTrending}
                  showSearchResults={showSearchResults}
                  searchResults={searchResults}
                  activeIndex={activeIndex}
                  searchInput={searchInput}
                  recentSearches={recentSearches}
                  onPickTerm={(term) => { setSearchInput(term); handleSearch(term); setShowTrending(false) }}
                  onPickResult={goToDetail}
                  onSeeAll={() => goToSearchPage()}
                  onRemoveRecent={removeRecentSearch}
                  onClearRecent={clearRecentSearches}
                />
              </div>
            )}

            <div className="hidden md:block">
              <LocaleToggle />
            </div>
            <div className="hidden md:block">
              <RegionSelect />
            </div>

            {/* Mobile hamburger + search + locale + region. The compact pickers
                must be hidden at md+ — without this wrapper they rendered next
                to the full pickers above, so every route showed doubles. */}
            <button
              type="button"
              data-search-toggle
              onClick={toggleMobileSearch}
              aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
              aria-expanded={mobileSearchOpen}
              className="md:hidden grid h-9 w-9 place-items-center rounded-full bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-accent transition-colors active:scale-95 shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            <div className="md:hidden">
              <LocaleToggle compact />
            </div>
            <div className="md:hidden">
              <RegionSelect compact />
            </div>
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

        {/* Mobile search — mounts only after the icon is pressed, inside the
            sticky nav so it never scrolls away with the page. */}
        {mobileSearchOpen && (
          <div ref={mobileSearchRef} className="md:hidden relative max-w-[1400px] mx-auto px-4 sm:px-6 pb-3">
            <SearchField
              variant="mobile"
              searchInput={searchInput}
              onSearchInput={onSearchInput}
              onEnter={onSearchEnter}
              onKeyNav={(key) => handleResultKeyNav(key)}
              onEscape={closeSearchField}
              onFocus={() => {
                if (!searchInput) openPanel('trending')
                else if (searchResults.length > 0) openPanel('results')
              }}
              onBlur={closeSearchPanels}
              expanded={showTrending || showSearchResults}
              listboxId="search-panel-mobile"
              autoFocus
            />
            <SearchPanel
              id="search-panel-mobile"
              showTrending={showTrending}
              showSearchResults={showSearchResults}
              searchResults={searchResults}
              activeIndex={activeIndex}
              searchInput={searchInput}
              recentSearches={recentSearches}
              onPickTerm={(term) => { setSearchInput(term); handleSearch(term); setShowTrending(false) }}
              onPickResult={goToDetail}
              onSeeAll={() => goToSearchPage()}
              onRemoveRecent={removeRecentSearch}
              onClearRecent={clearRecentSearches}
            />
          </div>
        )}

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
      </nav>
    </>
  )
}
