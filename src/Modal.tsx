import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
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

interface ModalProps {
  movie: Movie
  detail: MovieDetail | null
  loading: boolean
  onClose: () => void
  onMovieClick: (movie: Movie) => void
  genreMap: Record<number, string>
  region?: string
}

const IMG_BASE = 'https://image.tmdb.org/t/p'

function formatRuntime(min: number | null): string {
  if (!min) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatMoney(n: number): string {
  if (!n) return ''
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

export default function MovieModal({ movie, detail, loading, onClose, onMovieClick, genreMap, region = 'ID' }: ModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      setShowBackToTop(el.scrollTop > 400)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [detail])

  // Find trailer
  const trailer = detail?.videos?.results?.find(
    v => v.site === 'YouTube' && v.type === 'Trailer' && v.official
  ) || detail?.videos?.results?.find(
    v => v.site === 'YouTube' && v.type === 'Trailer'
  ) || detail?.videos?.results?.find(
    v => v.site === 'YouTube'
  )

  // Find director
  const director = detail?.credits?.crew?.find(c => c.job === 'Director')?.name

  // Find providers - use detail or fall back to movie data
  const detailProviders = detail?.['watch/providers']?.results?.[region]
    || detail?.['watch/providers']?.results?.ID
    || detail?.['watch/providers']?.results?.US
    || {}
  const allProviders = [
    ...(detailProviders.flatrate || []),
    ...(detailProviders.rent || []),
    ...(detailProviders.buy || []),
  ]
  const uniqueProviders = allProviders.length > 0
    ? [...new Map(allProviders.map(p => [p.provider_id, p])).values()]
    : movie.providers || []

  // All available regions with providers
  const REGION_MAP: Record<string, { name: string; flag: string }> = {
    ID: { name: 'Indonesia', flag: '🇮🇩' }, US: { name: 'United States', flag: '🇺🇸' },
    GB: { name: 'United Kingdom', flag: '🇬🇧' }, JP: { name: 'Japan', flag: '🇯🇵' },
    KR: { name: 'South Korea', flag: '🇰🇷' }, DE: { name: 'Germany', flag: '🇩🇪' },
    FR: { name: 'France', flag: '🇫🇷' }, IT: { name: 'Italy', flag: '🇮🇹' },
    ES: { name: 'Spain', flag: '🇪🇸' }, BR: { name: 'Brazil', flag: '🇧🇷' },
    MX: { name: 'Mexico', flag: '🇲🇽' }, CA: { name: 'Canada', flag: '🇨🇦' },
    AU: { name: 'Australia', flag: '🇦🇺' }, IN: { name: 'India', flag: '🇮🇳' },
    NL: { name: 'Netherlands', flag: '🇳🇱' }, TH: { name: 'Thailand', flag: '🇹🇭' },
    SG: { name: 'Singapore', flag: '🇸🇬' }, MY: { name: 'Malaysia', flag: '🇲🇾' },
    PH: { name: 'Philippines', flag: '🇵🇭' }, VN: { name: 'Vietnam', flag: '🇻🇳' },
    SE: { name: 'Sweden', flag: '🇸🇪' }, NO: { name: 'Norway', flag: '🇳🇴' },
    DK: { name: 'Denmark', flag: '🇩🇰' }, FI: { name: 'Finland', flag: '🇫🇮' },
    PL: { name: 'Poland', flag: '🇵🇱' }, PT: { name: 'Portugal', flag: '🇵🇹' },
    RU: { name: 'Russia', flag: '🇷🇺' }, TR: { name: 'Turkey', flag: '🇹🇷' },
    AR: { name: 'Argentina', flag: '🇦🇷' }, CL: { name: 'Chile', flag: '🇨🇱' },
    CO: { name: 'Colombia', flag: '🇨🇴' }, PE: { name: 'Peru', flag: '🇵🇪' },
    ZA: { name: 'South Africa', flag: '🇿🇦' }, NG: { name: 'Nigeria', flag: '🇳🇬' },
    EG: { name: 'Egypt', flag: '🇪🇬' }, SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
    AE: { name: 'UAE', flag: '🇦🇪' }, TW: { name: 'Taiwan', flag: '🇹🇼' },
    HK: { name: 'Hong Kong', flag: '🇭🇰' }, NZ: { name: 'New Zealand', flag: '🇳🇿' },
  }

  const allRegionResults = detail?.['watch/providers']?.results || {}
  const availableRegions = Object.entries(allRegionResults)
    .filter(([, data]) => {
      const has = data.flatrate?.length || data.rent?.length || data.buy?.length
      return has
    })
    .map(([code, data]) => ({
      code,
      name: REGION_MAP[code]?.name || code,
      flag: REGION_MAP[code]?.flag || '🌍',
      providers: [
        ...(data.flatrate || []),
        ...(data.rent || []),
        ...(data.buy || []),
      ],
    }))

  // Group providers by type for current region
  const flatrateProviders = detailProviders.flatrate || []
  const rentProviders = detailProviders.rent || []
  const buyProviders = detailProviders.buy || []

  // Top cast
  const cast = detail?.credits?.cast?.slice(0, 10) || []

  // Similar movies
  const similar = detail?.similar?.results?.slice(0, 10) || []

  const castScrollRef = useRef<HTMLDivElement>(null)
  const similarScrollRef = useRef<HTMLDivElement>(null)

  const scroll = useCallback((ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.8
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-surface"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div ref={scrollRef} className="w-full h-full overflow-y-auto">
          {/* Close button - fixed */}
          <button
            onClick={onClose}
            className="fixed top-4 right-4 z-[60] text-white/80 hover:text-white bg-black/40 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center transition-colors border border-white/10"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>

          {/* Backdrop Hero */}
          <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh]">
            <img
              src={`${IMG_BASE}/original${movie.backdrop_path || movie.poster_path}`}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface/60 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 -mt-32 sm:-mt-40 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-16">

            {/* Title Row */}
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 mb-8">
              {/* Poster */}
              <div className="shrink-0 w-36 sm:w-44 md:w-52 mx-auto sm:mx-0">
                <img
                  src={`${IMG_BASE}/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover rounded-xl shadow-2xl border border-zinc-800"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary leading-tight mb-1">
                  {movie.title}
                </h1>
                {detail?.tagline && (
                  <p className="text-accent text-sm italic mb-3">"{detail.tagline}"</p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted mb-4">
                  <span>{movie.release_date?.split('-')[0]}</span>
                  {detail?.runtime && (
                    <>
                      <span className="text-zinc-700">•</span>
                      <span>{formatRuntime(detail.runtime)}</span>
                    </>
                  )}
                  <span className="text-zinc-700">•</span>
                  <span className="text-accent font-mono font-bold">★ {movie.vote_average?.toFixed(1)}</span>
                  {director && (
                    <>
                      <span className="text-zinc-700">•</span>
                      <span>Dir. {director}</span>
                    </>
                  )}
                </div>

                {/* Genre tags */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {(detail?.genres || movie.genre_ids.map(id => ({ id, name: genreMap[id] }))).map(g => (
                    <span key={g.id} className="text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-md">
                      {g.name}
                    </span>
                  ))}
                </div>

                {/* Synopsis */}
                <div className="mb-4">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2">Synopsis</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {movie.overview || 'No synopsis available.'}
                  </p>
                </div>

                {/* Available On - inline with synopsis */}
                {uniqueProviders.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2">
                      Available in {REGION_MAP[region]?.flag || '🌍'} {REGION_MAP[region]?.name || region}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {uniqueProviders.map(p => (
                        <div key={p.provider_id} className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-2">
                          <img
                            src={`${IMG_BASE}/w92${p.logo_path}`}
                            alt={p.provider_name}
                            className="w-6 h-6 rounded-md object-cover"
                            loading="lazy"
                          />
                          <span className="text-black text-[11px] font-bold">{p.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Money */}
                {(detail?.budget || 0) > 0 && (
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Budget</p>
                      <p className="text-text-primary font-bold">{formatMoney(detail!.budget)}</p>
                    </div>
                    {(detail?.revenue || 0) > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Revenue</p>
                        <p className="text-text-primary font-bold">{formatMoney(detail!.revenue)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-8">
                <div className="skeleton h-8 w-48 rounded" />
                <div className="skeleton h-48 w-full rounded-xl" />
                <div className="skeleton h-64 w-full rounded-xl" />
              </div>
            )}

            {/* Trailer */}
            {trailer && !loading && (
              <div className="mb-10">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">Trailer</h3>
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800 bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailer.key}`}
                    title={`${movie.title} trailer`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Cast */}
            {cast.length > 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-10 relative group"
              >
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">Cast</h3>
                <button
                  onClick={() => scroll(castScrollRef, 'left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <div ref={castScrollRef} className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
                  {cast.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                      className="shrink-0 w-20 sm:w-24 text-center"
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-surface-card border border-zinc-800 mx-auto mb-2">
                        {c.profile_path ? (
                          <img
                            src={`${IMG_BASE}/w185${c.profile_path}`}
                            alt={c.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-lg font-bold">
                            {c.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <p className="text-text-primary text-[11px] font-bold line-clamp-1">{c.name}</p>
                      <p className="text-text-muted text-[9px] line-clamp-1">{c.character}</p>
                    </motion.div>
                  ))}
                </div>
                <button
                  onClick={() => scroll(castScrollRef, 'right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </motion.div>
            )}

            {/* Watch Providers by Region */}
            {availableRegions.length > 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="mb-10"
              >
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">Available In These Countries</h3>
                <div className="space-y-4">
                  {availableRegions.slice(0, 8).map(({ code, name, flag, providers }) => (
                    <div key={code} className="bg-surface-elevated border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{flag}</span>
                        <span className="text-text-primary text-sm font-bold">{name}</span>
                        <span className="text-text-muted text-[10px]">({code})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {providers.map(p => (
                          <div key={p.provider_id} className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-2">
                            <img
                              src={`${IMG_BASE}/w92${p.logo_path}`}
                              alt={p.provider_name}
                              className="w-5 h-5 rounded-md object-cover"
                              loading="lazy"
                            />
                            <span className="text-black text-[11px] font-bold">{p.provider_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {availableRegions.length > 8 && (
                  <p className="text-text-muted text-[10px] mt-3 text-center">
                    +{availableRegions.length - 8} more countries available
                  </p>
                )}
              </motion.div>
            )}

            {/* Production Companies */}
            {detail?.production_companies && detail.production_companies.length > 0 && !loading && (
              <div className="mb-10">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">Production</h3>
                <div className="flex flex-wrap gap-3">
                  {detail.production_companies.map(c => (
                    <div key={c.id} className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-3 shadow-sm">
                      {c.logo_path ? (
                        <img
                          src={`${IMG_BASE}/w154${c.logo_path}`}
                          alt={c.name}
                          className="h-8 w-auto object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center">
                            <span className="text-zinc-500 text-sm font-black">{c.name.charAt(0)}</span>
                          </div>
                          <span className="text-black text-xs font-bold">{c.name}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Movies */}
            {similar.length > 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-10 relative group"
              >
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">Similar Movies</h3>
                <button
                  onClick={() => scroll(similarScrollRef, 'left')}
                  className="absolute left-0 top-[40%] -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <div ref={similarScrollRef} className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
                  {similar.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
                      onClick={() => {
                        onMovieClick(m)
                        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="shrink-0 w-28 sm:w-32 cursor-pointer group"
                    >
                      <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
                        <img
                          src={`${IMG_BASE}/w342${m.poster_path}`}
                          alt={m.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-accent text-[9px] font-mono font-bold px-1 py-0.5 rounded">
                          ★ {m.vote_average?.toFixed(1)}
                        </div>
                      </div>
                      <p className="text-text-primary text-[11px] font-bold line-clamp-1 mt-1.5 group-hover:text-accent transition-colors">{m.title}</p>
                    </motion.div>
                  ))}
                </div>
                <button
                  onClick={() => scroll(similarScrollRef, 'right')}
                  className="absolute right-0 top-[40%] -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </motion.div>
            )}

          </div>
        </div>

        {/* Floating Back to Top */}
        {showBackToTop && (
          <button
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-[60] bg-accent text-black w-12 h-12 rounded-full shadow-lg shadow-accent/30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
            aria-label="Back to top"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
