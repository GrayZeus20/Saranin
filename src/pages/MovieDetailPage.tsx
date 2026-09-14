import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import Navbar from '../components/Navbar'
import { fetchWithRateLimit, IMG_BASE } from '../utils/api'
import { GENRE_MAP, REGION_MAP, formatDate } from '../utils/constants'

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

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isTv = location.pathname.startsWith('/tv/')
  const [detail, setDetail] = useState<MovieDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const region = 'ID'
  const scrollRef = useRef<HTMLDivElement>(null)
  const castScrollRef = useRef<HTMLDivElement>(null)
  const similarScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    const controller = new AbortController()
    const endpoint = isTv ? 'tv' : 'movie'
    fetchWithRateLimit<any>(
      `/${endpoint}/${id}?append_to_response=credits,videos,similar&language=en-US`,
      { signal: controller.signal }
    )
      .then(data => {
        const normalized = isTv ? {
          ...data,
          title: data.name || data.title,
          release_date: data.first_air_date || data.release_date,
          runtime: data.episode_run_time?.[0] || null,
        } : data
        setDetail(normalized)
        setLoading(false)
      })
      .catch(() => { if (!controller.signal.aborted) { setDetail(null); setLoading(false) } })
    return () => controller.abort()
  }, [id, isTv])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const scroll = useCallback((ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.8
      ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }, [])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-surface">
        <div className="w-full h-full overflow-y-auto">
          <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh]">
            <div className="skeleton absolute inset-0" />
          </div>
          <div className="relative z-10 -mt-32 sm:-mt-40 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-16">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 mb-8">
              <div className="shrink-0 w-36 sm:w-44 md:w-52">
                <div className="skeleton w-full aspect-[2/3] rounded-xl" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="skeleton h-10 w-3/4 rounded" />
                <div className="skeleton h-4 w-1/2 rounded" />
                <div className="skeleton h-20 w-full rounded" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="skeleton h-8 w-32 rounded" />
              <div className="skeleton h-48 w-full rounded-xl" />
              <div className="skeleton h-8 w-32 rounded" />
              <div className="skeleton h-40 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="fixed inset-0 z-50 bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">{isTv ? '📺' : '🎬'}</p>
          <p className="text-text-primary text-lg font-semibold mb-2">{isTv ? 'TV Show' : 'Movie'} not found</p>
          <Link to="/" className="mt-4 inline-block bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const movie = detail

  const trailer = detail.videos?.results?.find(
    v => v.site === 'YouTube' && v.type === 'Trailer' && v.official
  ) || detail.videos?.results?.find(
    v => v.site === 'YouTube' && v.type === 'Trailer'
  ) || detail.videos?.results?.find(
    v => v.site === 'YouTube'
  )

  const director = detail.credits?.crew?.find(c => c.job === 'Director')?.name

  const detailProviders = detail['watch/providers']?.results?.[region]
    || detail['watch/providers']?.results?.ID
    || detail['watch/providers']?.results?.US
    || {}
  const flatrateProviders = detailProviders.flatrate || []
  const rentProviders = detailProviders.rent || []
  const buyProviders = detailProviders.buy || []
  const allProviders = [...flatrateProviders, ...rentProviders, ...buyProviders]
  const uniqueProviders = allProviders.length > 0
    ? [...new Map(allProviders.map(p => [p.provider_id, p])).values()]
    : []

  const allRegionResults = detail['watch/providers']?.results || {}
  const availableRegions = Object.entries(allRegionResults)
    .filter(([, data]) => data.flatrate?.length || data.rent?.length || data.buy?.length)
    .map(([code, data]) => ({
      code,
      name: REGION_MAP[code]?.name || code,
      flag: REGION_MAP[code]?.flag || '🌍',
      providers: [...(data.flatrate || []), ...(data.rent || []), ...(data.buy || [])],
    }))

  const cast = detail.credits?.cast?.slice(0, 10) || []
  const similar = detail.similar?.results?.slice(0, 20) || []

  return (
    <div className="fixed inset-0 z-50 bg-surface">
      <div ref={scrollRef} className="w-full h-full overflow-y-auto">
        <Navbar />

        {/* Backdrop Hero */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative h-[40vh] sm:h-[50vh] md:h-[60vh]"
        >
          {movie.backdrop_path ? (
            <img src={`${IMG_BASE}/original${movie.backdrop_path}`} alt={movie.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-surface-card flex items-center justify-center text-zinc-700 text-4xl font-black">{movie.title}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface/60 to-transparent" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 -mt-32 sm:-mt-40 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-16">
          {/* Title Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-5 sm:gap-8 mb-8"
          >
            <div className="shrink-0 w-36 sm:w-44 md:w-52 mx-auto sm:mx-0">
              {movie.poster_path ? (
                <img src={`${IMG_BASE}/w500${movie.poster_path}`} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-xl shadow-2xl border border-zinc-800" />
              ) : (
                <div className="w-full aspect-[2/3] bg-surface-card rounded-xl flex items-center justify-center text-zinc-700 text-lg font-bold">{movie.title?.charAt(0)}</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary leading-tight mb-1">{movie.title}</h1>
              {detail.tagline && <p className="text-accent text-sm italic mb-3">"{detail.tagline}"</p>}
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted mb-4">
                <span>{formatDate(movie.release_date)}</span>
                {detail.runtime && <><span className="text-zinc-700">•</span><span>{formatRuntime(detail.runtime)}</span></>}
                <span className="text-zinc-700">•</span>
                <span className="text-accent font-mono font-bold">★ {movie.vote_average?.toFixed(1)}</span>
                {director && <><span className="text-zinc-700">•</span><span>Dir. {director}</span></>}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {(detail.genres || movie.genre_ids.map(gid => ({ id: gid, name: GENRE_MAP[gid] }))).map(g => (
                  <span key={g.id} className="text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-md">{g.name}</span>
                ))}
              </div>
              <div className="mb-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2">Synopsis</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{movie.overview || 'No synopsis available.'}</p>
              </div>
              {uniqueProviders.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2">
                    Available in {REGION_MAP[region]?.flag || '🌍'} {REGION_MAP[region]?.name || region}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {uniqueProviders.map(p => (
                      <div key={p.provider_id} className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-2">
                        <img src={`${IMG_BASE}/w92${p.logo_path}`} alt={p.provider_name} className="w-6 h-6 rounded-md object-cover" loading="lazy" />
                        <span className="text-black text-[11px] font-bold">{p.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detail.budget > 0 && (
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Budget</p>
                    <p className="text-text-primary font-bold">{formatMoney(detail.budget)}</p>
                  </div>
                  {detail.revenue > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Revenue</p>
                      <p className="text-text-primary font-bold">{formatMoney(detail.revenue)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Trailer */}
          {trailer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-10"
            >
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
            </motion.div>
          )}

          {/* Cast */}
          {cast.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-10 relative group"
            >
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">Cast</h3>
              <button onClick={() => scroll(castScrollRef, 'left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 hover:scale-110 active:scale-95">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div ref={castScrollRef} className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
                {cast.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }} className="shrink-0 w-20 sm:w-24 text-center">
                    <Link to={`/person/${c.id}`} className="block">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-surface-card border border-zinc-800 mx-auto mb-2 hover:border-accent transition-colors">
                        {c.profile_path ? (
                          <img src={`${IMG_BASE}/w185${c.profile_path}`} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-lg font-bold">{c.name.charAt(0)}</div>
                        )}
                      </div>
                      <p className="text-text-primary text-[11px] font-bold line-clamp-1 hover:text-accent transition-colors">{c.name}</p>
                      <p className="text-text-muted text-[9px] line-clamp-1">{c.character}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>
              <button onClick={() => scroll(castScrollRef, 'right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 hover:scale-110 active:scale-95">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </motion.div>
          )}

          {/* Available Regions */}
          {availableRegions.length > 0 && (
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
                          <img src={`${IMG_BASE}/w92${p.logo_path}`} alt={p.provider_name} className="w-5 h-5 rounded-md object-cover" loading="lazy" />
                          <span className="text-black text-[11px] font-bold">{p.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {availableRegions.length > 8 && (
                <p className="text-text-muted text-[10px] mt-3 text-center">+{availableRegions.length - 8} more countries available</p>
              )}
            </motion.div>
          )}

          {/* Production Companies */}
          {detail.production_companies?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mb-10"
            >
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">Production</h3>
              <div className="flex flex-wrap gap-3">
                {detail.production_companies.map(c => (
                  <Link
                    key={c.id}
                    to={`/company/${c.id}`}
                    className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:scale-105 transition-all"
                  >
                    {c.logo_path ? (
                      <img src={`${IMG_BASE}/w154${c.logo_path}`} alt={c.name} className="h-8 w-auto object-contain" loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.nextElementSibling as HTMLElement; if(fb) fb.style.display='flex' }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded-lg bg-zinc-200 items-center justify-center ${c.logo_path ? 'hidden' : 'flex'}`}
                      style={c.logo_path ? { display: 'none' } : undefined}
                    >
                      <span className="text-zinc-500 text-sm font-black">{c.name.charAt(0)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* Similar Movies */}
          {similar.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-10 relative group"
            >
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">Similar {isTv ? 'TV Shows' : 'Movies'}</h3>
              <button onClick={() => scroll(similarScrollRef, 'left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 hover:scale-110 active:scale-95">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div ref={similarScrollRef} className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
                {similar.map((m, i) => (
                  <motion.div
                    key={m.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.04 }}
                  >
                    <Link
                      to={`/${isTv ? 'tv' : 'movie'}/${m.id}`}
                      onClick={() => scrollRef.current?.scrollTo({ top: 0 })}
                      className="block shrink-0 w-28 sm:w-32 cursor-pointer group/card"
                    >
                      <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
                        {m.poster_path ? (
                          <img src={`${IMG_BASE}/w342${m.poster_path}`} alt={m.title} className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-sm font-bold">{m.title?.charAt(0)}</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                        <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-accent text-[9px] font-mono font-bold px-1 py-0.5 rounded">
                          ★ {m.vote_average?.toFixed(1)}
                        </div>
                      </div>
                      <p className="text-text-primary text-[11px] font-bold line-clamp-1 mt-1.5 group-hover/card:text-accent transition-colors">{m.title}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>
              <button onClick={() => scroll(similarScrollRef, 'right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 hover:scale-110 active:scale-95">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
