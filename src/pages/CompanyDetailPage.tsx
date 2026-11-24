import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  const { locale } = useLocale()

  const companyQuery = useQuery<CompanyDetail>({
    queryKey: ['company', id, locale],
    enabled: !!id,
    queryFn: ({ signal }) =>
      fetchWithRateLimit<CompanyDetail>(`/company/${id}?language=${locale}`, { signal }),
    staleTime: 10 * 60 * 1000,
  })

  const creditsQuery = useQuery<{ movies: MediaCredit[]; tvShows: MediaCredit[] }>({
    queryKey: ['company-credits', id, locale],
    enabled: !!id && !!companyQuery.data,
    queryFn: async ({ signal }) => {
      const { movies: mv, tvShows: tv } = await fetchCompanyCredits(id!, signal, locale)
      const dedupe = (list: MediaCredit[]) => [...new Map(list.map(item => [`${item.media_type}-${item.id}`, item])).values()]
      return { movies: dedupe(mv), tvShows: dedupe(tv) }
    },
    staleTime: 10 * 60 * 1000,
  })

  const company = companyQuery.data ?? null
  const movies = creditsQuery.data?.movies ?? []
  const tvShows = creditsQuery.data?.tvShows ?? []
  const loading = companyQuery.isLoading
  const creditsError = creditsQuery.isError

  useDocumentTitle(company ? `${company.name} — SARANIN.` : '')

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-surface">
        <Navbar />
        <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-12">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-12">
            <div className="skeleton w-32 sm:w-40 h-32 sm:h-40 rounded-2xl shrink-0 mx-auto md:mx-0" />
            <div className="flex-1 space-y-4">
              <div className="skeleton h-10 w-2/3 rounded" />
              <div className="skeleton h-4 w-1/3 rounded" />
              <div className="skeleton h-20 w-full rounded" />
            </div>
          </div>
          <div className="skeleton h-8 w-48 rounded mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="skeleton w-full aspect-[2/3] rounded-xl" />
                <div className="skeleton h-4 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-surface">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="text-center max-w-sm">
            <p className="text-5xl mb-4">🏢</p>
            <p className="text-text-primary text-lg font-semibold mb-2">Company not found</p>
            <p className="text-text-muted text-sm mb-6">
              {(companyQuery.error as Error)?.message || 'This studio could not be loaded.'}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => companyQuery.refetch()}
                className="bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform"
              >
                Try Again
              </button>
              <Link
                to="/"
                className="text-text-muted text-sm font-bold px-6 py-2.5 rounded-full border border-zinc-800 hover:border-accent hover:text-text-primary transition-all active:scale-95"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-surface">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-12">
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

            {company.homepage && /^https?:\/\//i.test(company.homepage) && (
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
          {[...movies, ...tvShows].map((item) => (
            <div
              key={`${item.media_type}-${item.id}`}
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
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded-md">
                    ★ {item.vote_average?.toFixed(1)}
                  </div>
                  {item.media_type === 'tv' && (
                    <div className="absolute top-2 left-2 bg-accent text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md">TV</div>
                  )}
                </div>
                <h3 className="mt-2 text-text-primary text-xs sm:text-sm font-semibold line-clamp-1 group-hover:text-accent transition-colors">{item.title}</h3>
                <p className="text-text-muted text-[11px] tabular-nums">{item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0]}</p>
              </Link>
            </div>
          ))}
        </div>

        {creditsQuery.isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="skeleton w-full aspect-[2/3] rounded-xl" />
                <div className="skeleton h-4 w-3/4 rounded" />
              </div>
            ))}
          </div>
        )}

        {creditsError && (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm mb-3">Couldn't load production list for this company.</p>
            <button
              type="button"
              onClick={() => creditsQuery.refetch()}
              className="text-xs font-bold text-accent hover:text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!creditsQuery.isLoading && !creditsError && movies.length === 0 && tvShows.length === 0 && (
          <p className="text-text-muted text-center py-20 italic">No productions found for this company.</p>
        )}
      </main>
      <Footer />
    </div>
  )
}
