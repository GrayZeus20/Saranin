import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import Navbar from '../components/Navbar'
import ScrollRow from '../components/ScrollRow'
import { ImageWithFallback } from '../components/ImageWithFallback'
import { ProviderPill } from '../components/ProviderPill'
import { RegionFlagRail, type AvailableRegion } from '../components/RegionFlagRail'
import { AvailabilityModal } from '../components/AvailabilityModal'
import { TrailerHover } from '../components/TrailerHover'
import { WatchButton } from '../components/WatchButton'
import Footer from '../components/Footer'
import { fetchWithRateLimit } from '../utils/api'
import { tmdbImage } from '../utils/imageSizes'
import { GENRE_MAP, REGION_MAP, formatDate } from '../utils/constants'
import { useRegion } from '../utils/region'
import { useLocale } from '../utils/locale'
import { useDocumentTitle } from '../utils/useDocumentTitle'

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
  recommendations: { results: Movie[] }
  // The API returns the key verbatim as "watch/providers"; the cast is here
  // only so `detail['watch/providers']` below type-checks. `link` is TMDB's
  // per-region JustWatch page — the deep-link target for every provider pill.
  'watch/providers'?: {
    results: Record<string, {
      link?: string
      flatrate?: WatchProvider[]
      rent?: WatchProvider[]
      buy?: WatchProvider[]
    }>
  }
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
  // The YouTube iframe is only mounted after a tap: an autoloaded embed pulls
  // the whole player on a phone connection before anyone asked for it.
  const [trailerPlaying, setTrailerPlaying] = useState(false)
  // The full availability list is a dialog; nothing renders until it opens.
  const [showAvailabilityList, setShowAvailabilityList] = useState(false)
  const { region } = useRegion()
  const { locale } = useLocale()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Title is set once the payload resolves; the hook ignores the empty string.
  useDocumentTitle(detail ? `${detail.title} — SARANIN.` : '')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setTrailerPlaying(false)
    // A title swap must not leave the previous title's country list open.
    setShowAvailabilityList(false)
    const controller = new AbortController()
    const endpoint = isTv ? 'tv' : 'movie'
    // `watch/providers` must be part of append_to_response — the two
    // "Available in …" sections read `detail['watch/providers']`, and without
    // this the key never existed, so both sections were dead on every title.
    // `recommendations` rides along for the "More Like This" rail.
    fetchWithRateLimit<any>(
      `/${endpoint}/${id}?append_to_response=credits,videos,similar,recommendations,watch%2Fproviders&language=${locale}`,
      { signal: controller.signal }
    )
      .then(data => {
        // TV payloads name their fields differently (`name`, `first_air_date`)
        // not just at the top level but inside every nested result list too.
        // Only the top-level object used to be normalized, so the rails built
        // from `similar` / `recommendations` handed `undefined` to every
        // `m.title` — which crashed the whole page on TV titles.
        const relabel = (item: any) => ({
          ...item,
          title: item.name || item.title,
          release_date: item.first_air_date || item.release_date,
        })
        const normalized = isTv ? {
          ...data,
          title: data.name || data.title,
          release_date: data.first_air_date || data.release_date,
          runtime: data.episode_run_time?.[0] || null,
          similar: data.similar ? { ...data.similar, results: (data.similar.results || []).map(relabel) } : data.similar,
          recommendations: data.recommendations
            ? { ...data.recommendations, results: (data.recommendations.results || []).map(relabel) }
            : data.recommendations,
        } : data
        setDetail(normalized)
        setLoading(false)
      })
      .catch(() => { if (!controller.signal.aborted) { setDetail(null); setLoading(false) } })
    return () => controller.abort()
  }, [id, isTv, locale])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Clicking a similar title swaps the payload under the same mounted shell; the
  // inner scroller kept its old offset, dropping the user mid-page on the new
  // title. Reset it whenever the title changes (after the loaded tree mounts).
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [id, loading])

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

  // Whose streaming data is on screen? The user's region when TMDB has it;
  // otherwise the ID/US fallback. The heading must follow the DATA actually
  // shown — the old version always printed the user's region, so a Netflix-US
  // row appeared under "Available in 🇮🇩 Indonesia" for anyone outside the
  // fallback country.
  const providerResults = detail['watch/providers']?.results || {}
  const hasProviderData = (code: string) => {
    const entry = providerResults[code]
    return !!entry && !!(entry.flatrate?.length || entry.rent?.length || entry.buy?.length)
  }
  const providerRegionCode = [region, 'ID', 'US'].find(hasProviderData) || region
  const detailProviders = providerResults[providerRegionCode] || {}
  // TMDB hands out a per-region JustWatch page — every provider pill links there.
  const detailWatchLink = detailProviders.link
  const flatrateProviders = detailProviders.flatrate || []
  const rentProviders = detailProviders.rent || []
  const buyProviders = detailProviders.buy || []
  const allProviders = [...flatrateProviders, ...rentProviders, ...buyProviders]
  const uniqueProviders = allProviders.length > 0
    ? [...new Map(allProviders.map(p => [p.provider_id, p])).values()]
    : []

  const allRegionResults = detail['watch/providers']?.results || {}
  const availableRegions: AvailableRegion[] = Object.entries(allRegionResults)
    .filter(([, data]) => data.flatrate?.length || data.rent?.length || data.buy?.length)
    .map(([code, data]) => {
      // A provider often appears in more than one bucket (flatrate + rent), and
      // the old concat rendered it twice under the same React key.
      const merged = [...(data.flatrate || []), ...(data.rent || []), ...(data.buy || [])]
      return {
        code,
        name: REGION_MAP[code]?.name || code,
        flag: REGION_MAP[code]?.flag || '🌍',
        link: data.link,
        providers: [...new Map(merged.map(p => [p.provider_id, p])).values()],
      }
    })
    // The user's own region first: it is the one row everyone looks for, and
    // the rail is read left to right.
    .sort((a, b) => (a.code === region ? -1 : b.code === region ? 1 : a.name.localeCompare(b.name)))

  const cast = detail.credits?.cast?.slice(0, 10) || []
  const similar = detail.similar?.results?.slice(0, 20) || []
  // Recommendations, minus anything already shown in the similar rail and minus
  // the title itself. TMDB's two rails overlap heavily; one screen, no repeats.
  const similarIds = new Set(similar.map(m => m.id))
  const recommendations = (detail.recommendations?.results || [])
    .filter(m => m.id !== detail.id && !similarIds.has(m.id))
    .slice(0, 20)

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
            <>
              <ImageWithFallback
                src={tmdbImage(movie.backdrop_path, 'backdrop', 'w1280')}
                alt={movie.title}
                kind="backdrop"
                priority
                fallbackText={null}
                className="w-full h-full object-cover"
              />
              {/* Hover preview on the hero itself — same lazy, muted embed as
                  every card. Chrome (gradients below) paints over it. */}
              <TrailerHover mediaType={isTv ? 'tv' : 'movie'} id={movie.id} title={movie.title} zoomClass="scale-[1.18]" />
            </>
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
            <div className="relative shrink-0 w-36 sm:w-44 md:w-52 mx-auto sm:mx-0">
              <div className="relative overflow-hidden rounded-xl shadow-2xl border border-zinc-800">
                {/* One degrade path for every image: a failed poster shows its
                    initial instead of the browser's broken-image glyph. */}
                <ImageWithFallback
                  src={tmdbImage(movie.poster_path, 'poster', 'w342')}
                  alt={movie.title}
                  kind="poster"
                  className="w-full aspect-[2/3] object-cover"
                  fallbackText={movie.title?.charAt(0)}
                  sizes="(min-width: 768px) 208px, (min-width: 640px) 176px, 144px"
                />
              </div>
              <WatchButton
                variant="inline"
                className="mt-3 w-full justify-center"
                entry={{ id: movie.id, media_type: isTv ? 'tv' : 'movie', title: movie.title, poster_path: movie.poster_path, vote_average: movie.vote_average, release_date: movie.release_date }}
              />
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
                    Available in {REGION_MAP[providerRegionCode]?.flag || '🌍'} {REGION_MAP[providerRegionCode]?.name || providerRegionCode}
                    {providerRegionCode !== region && (
                      <span className="normal-case tracking-normal font-medium text-text-muted/80"> — no {region} data for this title</span>
                    )}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {uniqueProviders.map(p => (
                      <ProviderPill key={p.provider_id} provider={p} link={detailWatchLink} />
                    ))}
                  </div>
                  {detailWatchLink && (
                    <p className="text-text-muted text-[10px] mt-2">
                      Tapping a service opens its JustWatch page for this region.
                    </p>
                  )}
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
                {trailerPlaying ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                    title={`${movie.title} trailer`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setTrailerPlaying(true)}
                    aria-label={`Play ${movie.title} trailer`}
                    className="group/play absolute inset-0 w-full h-full"
                  >
                    {movie.backdrop_path && (
                      <ImageWithFallback
                        src={tmdbImage(movie.backdrop_path, 'backdrop', 'w780')}
                        alt=""
                        kind="backdrop"
                        fallbackText={null}
                        className="absolute inset-0 w-full h-full object-cover opacity-70 transition-opacity duration-300 group-hover/play:opacity-90"
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center w-full h-full">
                      <span className="w-16 h-16 rounded-full bg-accent text-black flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover/play:scale-110 group-active/play:scale-95">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Cast */}
          {cast.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-10"
            >
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">Cast</h3>
              <ScrollRow label="Cast" className="-mx-1">
                {cast.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }} className="shrink-0 w-20 sm:w-24 text-center">
                    <Link to={`/person/${c.id}`} className="block">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-surface-card border border-zinc-800 mx-auto mb-2 hover:border-accent transition-colors">
                        <ImageWithFallback
                          src={tmdbImage(c.profile_path, 'profile', 'w185')}
                          alt={c.name}
                          kind="profile"
                          className="w-full h-full object-cover"
                          sizes="(min-width: 640px) 96px, 80px"
                        />
                      </div>
                      <p className="text-text-primary text-[11px] font-bold line-clamp-1 hover:text-accent transition-colors">{c.name}</p>
                      <p className="text-text-muted text-[9px] line-clamp-1">{c.character}</p>
                    </Link>
                  </motion.div>
                ))}
              </ScrollRow>
            </motion.div>
          )}

          {/* Available Regions — a half-moon flag rail you can scroll or drag,
              plus a List button for the full country-by-country breakdown. */}
          {availableRegions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mb-10"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
                  Available In These Countries
                  <span className="ml-2 normal-case tracking-normal text-text-muted/80">{availableRegions.length}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAvailabilityList(true)}
                  aria-haspopup="dialog"
                  className="shrink-0 inline-flex items-center gap-1.5 min-h-[36px] text-[11px] font-bold px-3.5 py-1.5 rounded-full bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-accent transition-all active:scale-95"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <line x1="8" y1="6" x2="20" y2="6" />
                    <line x1="8" y1="12" x2="20" y2="12" />
                    <line x1="8" y1="18" x2="20" y2="18" />
                    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
                    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
                    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
                  </svg>
                  List
                </button>
              </div>
              <RegionFlagRail
                regions={availableRegions}
                activeCode={providerRegionCode}
                onPick={() => setShowAvailabilityList(true)}
              />
              <p className="text-text-muted text-[10px] mt-1">
                Drag or scroll for more · tap a flag or <span className="font-bold">List</span> for every country
              </p>
            </motion.div>
          )}

          {/* Full availability list — scrollable dialog, mounted only when open. */}
          <AvailabilityModal
            open={showAvailabilityList}
            regions={availableRegions}
            title={movie.title}
            onClose={() => setShowAvailabilityList(false)}
          />

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
                  // `relative` is load-bearing: ImageWithFallback's loading
                  // skeleton is absolutely positioned, and without a positioned
                  // host here it escapes this pill and shimmers across the page.
                  <Link
                    key={c.id}
                    to={`/company/${c.id}`}
                    className="relative flex items-center gap-2.5 bg-white rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:scale-105 transition-all"
                  >
                    {/* Same degrade path as every other image: the old version hid
                        a failed logo imperatively via style.display and dug its
                        fallback out with nextElementSibling. */}
                    <ImageWithFallback
                      src={tmdbImage(c.logo_path, 'logo', 'w154')}
                      alt={c.name}
                      kind="logo"
                      className="h-8 w-auto object-contain"
                      fallbackText={c.name.charAt(0)}
                      fallbackClassName="h-8 min-w-8 rounded"
                      skeletonClassName="rounded"
                      sizes="(min-width: 1024px) 160px, 120px"
                    />
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
              className="mb-10"
            >
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">Similar {isTv ? 'TV Shows' : 'Movies'}</h3>
              <ScrollRow label={`Similar ${isTv ? 'TV shows' : 'movies'}`} className="-mx-1">
                {similar.map((m, i) => (
                  <motion.div
                    key={m.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.04 }}
                    className="shrink-0"
                  >
                    <Link
                      to={`/${isTv ? 'tv' : 'movie'}/${m.id}`}
                      onClick={() => scrollRef.current?.scrollTo({ top: 0 })}
                      className="block w-28 sm:w-32 cursor-pointer"
                    >
                      <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
                        <ImageWithFallback
                          src={tmdbImage(m.poster_path, 'poster', 'w342')}
                          alt={m.title}
                          kind="poster"
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          sizes="(min-width: 640px) 128px, 112px"
                        />
                        {/* Hover preview on similar/recommendation cards too. */}
                        <TrailerHover mediaType={isTv ? 'tv' : 'movie'} id={m.id} title={m.title} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                        <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-accent text-[9px] font-mono font-bold px-1 py-0.5 rounded">
                          ★ {m.vote_average?.toFixed(1)}
                        </div>
                        <WatchButton
                          compact
                          entry={{ id: m.id, media_type: isTv ? 'tv' : 'movie', title: m.title, poster_path: m.poster_path, vote_average: m.vote_average, release_date: m.release_date }}
                        />
                      </div>
                      <p className="text-text-primary text-[11px] font-bold line-clamp-1 mt-1.5">{m.title}</p>
                    </Link>
                  </motion.div>
                ))}
              </ScrollRow>
            </motion.div>
          )}
          {/* Recommendations — "More Like This". Rendered after Similar; the
              list already excludes everything in that rail and this title. */}
          {recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mb-10"
            >
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4">More Like This</h3>
              <ScrollRow label="More like this" className="-mx-1">
                {recommendations.map((m, i) => (
                  <motion.div
                    key={m.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.04 }}
                    className="shrink-0"
                  >
                    <Link
                      to={`/${isTv ? 'tv' : 'movie'}/${m.id}`}
                      onClick={() => scrollRef.current?.scrollTo({ top: 0 })}
                      className="block w-28 sm:w-32 cursor-pointer"
                    >
                      <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
                        <ImageWithFallback
                          src={tmdbImage(m.poster_path, 'poster', 'w342')}
                          alt={m.title}
                          kind="poster"
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          sizes="(min-width: 640px) 128px, 112px"
                        />
                        <TrailerHover mediaType={isTv ? 'tv' : 'movie'} id={m.id} title={m.title} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                        <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-accent text-[9px] font-mono font-bold px-1 py-0.5 rounded">
                          ★ {m.vote_average?.toFixed(1)}
                        </div>
                        <WatchButton
                          compact
                          entry={{ id: m.id, media_type: isTv ? 'tv' : 'movie', title: m.title, poster_path: m.poster_path, vote_average: m.vote_average, release_date: m.release_date }}
                        />
                      </div>
                      <p className="text-text-primary text-[11px] font-bold line-clamp-1 mt-1.5">{m.title}</p>
                    </Link>
                  </motion.div>
                ))}
              </ScrollRow>
            </motion.div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  )
}
