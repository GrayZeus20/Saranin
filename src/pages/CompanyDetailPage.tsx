import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { ImageWithFallback } from '../components/ImageWithFallback'
import { TrailerHover } from '../components/TrailerHover'
import { fetchWithRateLimit } from '../utils/api'
import { tmdbImage } from '../utils/imageSizes'
import { useLocale } from '../utils/locale'
import { useDocumentTitle } from '../utils/useDocumentTitle'

interface CompanyDetail {
  id: number
  name: string
  description: string
  headquarters: string
  homepage: string
  logo_path: string | null
  origin_country: string
  parent_company: string | null
}

interface MediaCredit {
  id: number
  title: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  overview: string
  media_type: 'movie' | 'tv'
}

interface DiscoverResponse {
  results?: any[]
  total_pages?: number
}

// A single /discover page returns only 20 titles — a major studio has hundreds.
// Walk the first N pages (bounded so a giant library cannot fire 100 requests).
const MAX_CREDIT_PAGES = 5

async function fetchCompanyCredits(id: string, signal: AbortSignal, language: string): Promise<{ movies: MediaCredit[]; tvShows: MediaCredit[] }> {
  const collect = async (kind: 'movie' | 'tv'): Promise<MediaCredit[]> => {
    const dateField = kind === 'movie' ? 'primary_release_date' : 'first_air_date'
    const pages: MediaCredit[] = []
    let totalPages = 1
    for (let page = 1; page <= totalPages && page <= MAX_CREDIT_PAGES; page++) {
      const data = await fetchWithRateLimit<DiscoverResponse>(
        `/discover/${kind}?with_companies=${id}&sort_by=${dateField}.desc&language=${language}&page=${page}`,
        { signal },
      )
      totalPages = data.total_pages || 1
      for (const r of data.results || []) {
        pages.push({
          ...r,
          media_type: kind,
          title: r.title || r.name || '',
          release_date: r.release_date || r.first_air_date || '',
        })
      }
    }
    return pages
  }

  const [movies, tvShows] = await Promise.all([collect('movie'), collect('tv')])
  return { movies, tvShows }
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [movies, setMovies] = useState<MediaCredit[]>([])
  const [tvShows, setTvShows] = useState<MediaCredit[]>([])
  const [loading, setLoading] = useState(true)
  const [creditsError, setCreditsError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { locale } = useLocale()

  useDocumentTitle(company ? `${company.name} — SARANIN.` : '')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setCreditsError(false)

    const controller = new AbortController()
    const load = async () => {
      try {
        const companyData = await fetchWithRateLimit<CompanyDetail>(`/company/${id}?language=${locale}`, { signal: controller.signal })
        if (controller.signal.aborted) return
        setCompany(companyData)

        // Company header already resolves — credits are secondary, so a credit
        // failure degrades to an inline notice instead of hiding the whole page.
        try {
          const { movies: mv, tvShows: tv } = await fetchCompanyCredits(id, controller.signal, locale)
          if (controller.signal.aborted) return
          setMovies(mv)
          setTvShows(tv)
        } catch (err) {
          if (!controller.signal.aborted) {
            console.error('[company] credits failed', err)
            setCreditsError(true)
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('[company] detail failed', err)
          setCompany(null)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [id, locale])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-surface">
        <div className="w-full h-full overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex flex-col md:flex-row gap-8 mb-12">
              <div className="skeleton w-40 h-40 rounded-2xl shrink-0 mx-auto md:mx-0" />
              <div className="flex-1 space-y-4">
                <div className="skeleton h-10 w-2/3 rounded" />
                <div className="skeleton h-4 w-1/3 rounded" />
                <div className="skeleton h-20 w-full rounded" />
              </div>
            </div>
            <div className="skeleton h-8 w-48 rounded mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="skeleton w-full aspect-[2/3] rounded-xl" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="fixed inset-0 z-50 bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">🏢</p>
          <p className="text-text-primary text-lg font-semibold mb-2">Company not found</p>
          <Link to="/" className="mt-4 inline-block bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface">
      <div ref={scrollRef} className="w-full h-full overflow-y-auto">
        <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-8 mb-16 items-center md:items-start"
        >
          <div className="relative shrink-0 w-32 sm:w-40 h-32 sm:h-40 bg-white rounded-2xl p-4 sm:p-6 flex items-center justify-center shadow-xl border border-zinc-800 overflow-hidden">
            {/* One image path for the whole app — the old markup hid a failed
                logo with inline styles and revealed a sibling span by hand. */}
            <ImageWithFallback
              src={tmdbImage(company.logo_path, 'logo', 'w300')}
              alt={company.name}
              kind="logo"
              className="w-full h-full object-contain"
              fallbackText={company.name.charAt(0)}
              skeletonClassName="rounded"
              sizes="(min-width: 640px) 160px, 128px"
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl sm:text-5xl font-black text-text-primary mb-4">{company.name}</h1>

            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-text-muted mb-6">
              {company.origin_country && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold block mb-1">Origin</span>
                  <span className="text-text-primary font-bold text-base">{company.origin_country}</span>
                </div>
              )}
              {company.headquarters && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold block mb-1">Headquarters</span>
                  <span className="text-text-primary font-medium">{company.headquarters}</span>
                </div>
              )}
            </div>

            {company.description ? (
              <div className="mb-6">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2">About</h3>
                <p className="text-text-secondary leading-relaxed max-w-3xl">{company.description}</p>
              </div>
            ) : (
              <p className="text-text-muted italic mb-6">No description available for {company.name}.</p>
            )}

            {company.homepage && (
              <a href={company.homepage} target="_blank" rel="noopener noreferrer" className="inline-block bg-accent/10 text-accent hover:bg-accent hover:text-black transition-colors font-bold text-sm px-5 py-2 rounded-full">
                Visit Website
              </a>
            )}
          </div>
        </motion.div>

        <div className="flex items-baseline justify-between gap-4 mb-8 border-b border-zinc-800 pb-4">
          <h2 className="text-xl font-black text-text-primary">Productions</h2>
          {(movies.length > 0 || tvShows.length > 0) && (
            <span className="text-text-muted text-xs">{movies.length + tvShows.length} titles</span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {[...movies, ...tvShows].map((item, i) => (
            <motion.div
              // movie and tv ids are independent TMDB namespaces and overlap
              // constantly — the bare id collided across the two kind lists.
              key={`${item.media_type}-${item.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/${item.media_type}/${item.id}`} className="group block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface-card border border-zinc-800 transition-transform duration-300 group-hover:scale-105 group-hover:border-accent/50">
                  {/* Same image path as everywhere else: a 404 poster (TMDB
                      keeps stale paths) degrades to the title's initial. */}
                  <ImageWithFallback
                    src={tmdbImage(item.poster_path, 'poster', 'w342')}
                    alt={item.title}
                    kind="poster"
                    className="w-full h-full object-cover"
                    fallbackText={item.title.charAt(0)}
                    sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                  />
                  <TrailerHover mediaType={item.media_type} id={item.id} title={item.title} />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                    ★ {item.vote_average?.toFixed(1)}
                  </div>
                  {item.media_type === 'tv' && (
                    <div className="absolute top-2 left-2 bg-accent text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md">TV</div>
                  )}
                </div>
                <h3 className="mt-3 text-text-primary text-sm font-bold line-clamp-1 group-hover:text-accent transition-colors">{item.title}</h3>
                <p className="text-text-muted text-[10px]">{item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0]}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        {creditsError && (
          <p className="text-text-muted text-center py-8 text-sm">Couldn't load every production list for this company. Refresh to try again.</p>
        )}

        {!creditsError && movies.length === 0 && tvShows.length === 0 && (
          <p className="text-text-muted text-center py-20 italic">No productions found for this company.</p>
        )}
      </div>
      <Footer />
      </div>
    </div>
  )
}
