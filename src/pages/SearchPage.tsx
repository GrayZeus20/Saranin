import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ImageWithFallback } from '../components/ImageWithFallback'
import { TrailerHover } from '../components/TrailerHover'
import { CardDetailPopup } from '../components/CardDetailPopup'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { WatchButton } from '../components/WatchButton'
import { fetchWithRateLimit } from '../utils/api'
import { tmdbImage } from '../utils/imageSizes'
import { formatDate, GENRE_MAP } from '../utils/constants'
import { normalizeMovie, normalizeTv, type Movie } from '../utils/tmdb'
import { useLocale } from '../utils/locale'
import { useSearchHistory } from '../utils/searchHistory'
import { useDocumentTitle } from '../utils/useDocumentTitle'

type SearchType = 'all' | 'movie' | 'tv' | 'anime'

interface MultiSearchResponse {
  results?: any[]
  total_pages?: number
  total_results?: number
}

const TMDB_MAX_PAGE = 500

const TRENDING_SEARCHES = ['One Piece', 'Demon Slayer', 'Naruto', 'Dragon Ball', 'Jujutsu Kaisen', 'Attack on Titan', 'Dune', 'Oppenheimer']

function isAnime(m: Movie): boolean {
  return !!m.genre_ids?.includes(16) && m.original_language === 'ja'
}

// Multi search returns people + collections; the grid only wants movie/tv.
function normalizeMulti(results: any[]): Movie[] {
  return results
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .map(r => (r.media_type === 'tv' ? normalizeTv(r) : normalizeMovie(r)))
}

// Which TMDB search endpoint backs a Type pill. `/search/multi` interleaves
// movies, tv and people in one 20-item page, so client-filtering it to "Movies"
// left ~8 tiles under a page-sized label. `movie` and `tv` ask the kind-specific
// endpoints instead, so the page that arrives is already the right kind.
// `anime` has no server-side equivalent (search exposes no genre/language params),
// so it reads the tv endpoint and narrows client-side — the one remaining
// approximation, and its label reports exactly what it shows.
function searchEndpointFor(type: SearchType): 'multi' | 'movie' | 'tv' {
  if (type === 'movie') return 'movie'
  if (type === 'tv' || type === 'anime') return 'tv'
  return 'multi'
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const q = searchParams.get('q')?.trim() || ''
  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  const [input, setInput] = useState(q)
  const [type, setType] = useState<SearchType>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const { locale } = useLocale()
  const { items: recentSearches, add: addRecentSearch, remove: removeRecentSearch, clear: clearRecentSearches } = useSearchHistory()

  useDocumentTitle(q ? `Search: ${q} — SARANIN.` : 'Search — SARANIN.')

  // URL is the source of truth for the query; keep the box in sync on back/forward.
  useEffect(() => { setInput(q) }, [q])

  // A URL with a real query is a committed search — record it. Dedupe/cap live
  // in the store, so react-router date navigation cannot balloon the list.
  useEffect(() => {
    if (q.length >= 2) addRecentSearch(q)
  }, [q, addRecentSearch])

  // New page must land at the top of the results, not mid-scroll.
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [urlPage, q])

  const endpointKind = searchEndpointFor(type)

  const searchQuery = useQuery({
    // `type` is in the key because it changes the endpoint — a new pill is a new
    // request, not a client-side re-slice of a page asked for a different kind.
    queryKey: ['search', q, urlPage, locale, endpointKind],
    queryFn: async () => {
      const data = await fetchWithRateLimit<MultiSearchResponse>(
        `/search/${endpointKind}?query=${encodeURIComponent(q)}&language=${locale}&include_adult=false&page=${urlPage}`
      )
      const items = endpointKind === 'multi'
        ? normalizeMulti(data.results || [])
        : (data.results || []).map(r => (endpointKind === 'tv' ? normalizeTv(r) : normalizeMovie(r)))
      const totalPages = Math.max(1, Math.min(TMDB_MAX_PAGE, data.total_pages || 1))
      return { items, totalPages, totalResults: data.total_results || 0 }
    },
    enabled: q.length > 0,
    // No placeholderData: keeping the previous query's results painted stale
    // titles (and a stale total) while the new query was still in flight.
    retry: 2,
    retryDelay: 1000,
  })

  const items = useMemo(() => searchQuery.data?.items ?? [], [searchQuery.data])
  const totalPages = searchQuery.data?.totalPages ?? 1
  const totalResults = searchQuery.data?.totalResults ?? 0
  const isFetching = searchQuery.isFetching

  // Only the Anime pill still narrows client-side (search has no genre/language
  // params); every other pill's page is already the right kind.
  const filtered = useMemo(
    () => (type === 'anime' ? items.filter(isAnime) : items),
    [items, type]
  )

  const submit = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setSearchParams({ q: trimmed, page: '1' })
  }, [setSearchParams])

  // A Type pill switches the endpoint, so a page number counted for the previous
  // kind cannot carry over — page 3 of a 2000-result movie search is very often
  // page 1 of the tv search. Reset to the first page on every pill change.
  const selectType = useCallback((next: SearchType) => {
    setType(next)
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.set('page', '1')
      return params
    })
  }, [setSearchParams])

  const goToPage = useCallback((next: number) => {
    setSearchParams({ q, page: String(Math.max(1, Math.min(totalPages, next))) })
  }, [q, totalPages, setSearchParams])

  const openDetail = (m: Movie) => navigate(`/${m.media_type === 'tv' ? 'tv' : 'movie'}/${m.id}`)
  const hasQuery = q.length > 0

  return (
    <div className="min-h-[100dvh] bg-surface">
      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-5 md:py-8">
        <Navbar />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary mb-5">Search</h1>

          {/* Search box */}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(input) }}
            className="relative max-w-2xl"
          >
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search movies, TV, anime..."
              autoFocus={!hasQuery}
              className="w-full bg-surface-elevated border border-zinc-800 text-text-primary text-sm pl-11 pr-24 py-3 rounded-full focus:border-accent focus:outline-none transition-colors placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-accent text-black text-xs font-bold px-5 py-2 rounded-full hover:bg-accent/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </form>

          {/* Recent + trending chips when idle */}
          {!hasQuery && (
            <div className="mt-6 space-y-5">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Recent</p>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-text-muted text-[10px] font-bold hover:text-red-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map(term => (
                      <span key={term} className="inline-flex items-center rounded-full bg-surface-elevated border border-zinc-800 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { setInput(term); submit(term) }}
                          className="text-xs font-medium pl-4 pr-1.5 py-2 text-text-muted hover:text-accent transition-colors active:scale-95"
                        >
                          {term}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRecentSearch(term)}
                          aria-label={`Remove "${term}" from recent searches`}
                          className="text-text-muted/70 hover:text-red-400 text-[10px] leading-none pl-0.5 pr-3 py-2 transition-colors"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Trending Searches</p>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_SEARCHES.map(term => (
                    <button
                      key={term}
                      onClick={() => { setInput(term); submit(term) }}
                      className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all active:scale-95"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {hasQuery && (
          <>
            {/* Result summary + type filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="text-text-muted text-xs sm:text-sm">
                {searchQuery.isLoading || isFetching ? 'Searching…' : totalResults > 0 ? (
                  <>
                    <span className="text-text-primary font-bold">{filtered.length}</span> shown of{' '}
                    <span className="text-text-primary font-bold">{totalResults}</span> for{' '}
                    <span className="text-accent font-bold">"{q}"</span>
                  </>
                ) : (
                  <>
                    No results for <span className="text-accent font-bold">"{q}"</span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'all', label: 'All' },
                  { key: 'movie', label: 'Movies' },
                  { key: 'tv', label: 'TV' },
                  { key: 'anime', label: 'Anime' },
                ] as { key: SearchType; label: string }[]).map(t => (
                  <button
                    key={t.key}
                    onClick={() => selectType(t.key)}
                    className={`shrink-0 text-xs font-medium px-4 py-2.5 min-h-[44px] rounded-full transition-all duration-200 active:scale-95 ${
                      type === t.key
                        ? 'bg-accent text-black'
                        : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading skeletons — a page-sized placeholder, shown for both a new
                query and a new Type pill (each is its own request). */}
            {(searchQuery.isLoading || isFetching) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="skeleton w-full aspect-[2/3] rounded-xl" />
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            )}

            {/* Hard error (only when nothing to show) */}
            {searchQuery.isError && !searchQuery.data && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">&#x1f4a5;</p>
                <p className="text-text-primary text-sm font-bold mb-2">Search failed</p>
                <p className="text-text-muted text-xs mb-6">{(searchQuery.error as Error)?.message || 'The request did not go through.'}</p>
                <button
                  onClick={() => searchQuery.refetch()}
                  className="text-xs font-medium px-5 py-2 rounded-full bg-accent text-black hover:bg-accent/90 transition-all active:scale-95"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Results grid — rendered only once the query has settled, so a
                still-loading search cannot flash "No results". */}
            {!searchQuery.isLoading && !searchQuery.isError && !isFetching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5"
              >
                {filtered.map((m, i) => (
                  <motion.article
                    key={`${m.media_type}-${m.id}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(0.04 + i * 0.02, 0.35), ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openDetail(m)}
                    className="cursor-pointer"
                  >
                    <CardDetailPopup movie={m} mediaType={m.media_type === 'tv' ? 'tv' : 'movie'}>
                      <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
                        <ImageWithFallback src={tmdbImage(m.poster_path, 'poster', 'w342')} alt={m.title} kind="poster" className="w-full h-full object-cover" sizes="(min-width: 1280px) 20vw, (min-width: 640px) 25vw, 50vw" />
                        <TrailerHover mediaType={m.media_type === 'tv' ? 'tv' : 'movie'} id={m.id} title={m.title} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
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
                    </CardDetailPopup>
                    {/* Caption outside the clipped poster box — survives zoom. */}
                    <div className="px-0.5 pt-2">
                      <p className="text-white font-bold text-[11px] sm:text-xs line-clamp-1 mb-0.5">{m.title}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-muted text-[9px] sm:text-[10px]">{formatDate(m.release_date)}</span>
                        {m.genre_ids?.[0] && GENRE_MAP[m.genre_ids[0]] && (
                          <>
                            <span className="text-text-muted/40 text-[9px]">•</span>
                            <span className="text-text-muted text-[9px] sm:text-[10px]">{GENRE_MAP[m.genre_ids[0]]}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            )}

            {/* Empty state — same settled gate as the grid above */}
            {!searchQuery.isLoading && !searchQuery.isError && !isFetching && filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">&#x1f50d;</p>
                <p className="text-text-primary text-sm font-bold mb-2">
                  {items.length === 0 ? `No results for "${q}"` : `No ${type} results on this page`}
                </p>
                <p className="text-text-muted text-xs mb-6">
                  {items.length === 0 ? 'Check the spelling or try a different keyword' : 'Try another type or the next page'}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {items.length > 0 && type !== 'all' && (
                    <button
                      onClick={() => selectType('all')}
                      className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all"
                    >
                      Show All Types
                    </button>
                  )}
                  {items.length > 0 && urlPage < totalPages && (
                    <button
                      onClick={() => goToPage(urlPage + 1)}
                      className="text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all"
                    >
                      Next Page
                    </button>
                  )}
                  <button
                    onClick={() => { setInput(''); setType('all'); setSearchParams({}) }}
                    className="text-xs font-medium px-4 py-2 rounded-full bg-accent text-black hover:bg-accent/90 transition-all"
                  >
                    New Search
                  </button>
                </div>
              </div>
            )}

            {/* Pagination — Prev / Next only, matches home */}
            {!searchQuery.isLoading && !searchQuery.isError && totalResults > 0 && (
              <div className="flex items-center justify-center gap-4 py-8 pb-12">
                <button
                  onClick={() => goToPage(urlPage - 1)}
                  disabled={urlPage === 1 || isFetching}
                  aria-label="Previous page"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-text-primary hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 active:scale-95"
                >
                  ← Prev
                </button>
                <span className="text-text-muted text-xs font-mono tabular-nums min-w-[64px] text-center" aria-live="polite">
                  {isFetching ? '…' : `Page ${urlPage}`}
                </span>
                <button
                  onClick={() => goToPage(urlPage + 1)}
                  disabled={isFetching || urlPage >= totalPages}
                  aria-label="Next page"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-text-primary hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 active:scale-95"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
