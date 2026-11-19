import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { ImageWithFallback } from '../components/ImageWithFallback'
import { fetchWithRateLimit } from '../utils/api'
import { tmdbImage } from '../utils/imageSizes'
import { useLocale } from '../utils/locale'
import { useDocumentTitle } from '../utils/useDocumentTitle'

interface PersonDetail {
  id: number
  name: string
  also_known_as: string[]
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
  popularity: number
  profile_path: string | null
  known_for_department: string
}

interface CastCredit {
  id: number
  credit_id?: string
  title: string
  character: string
  poster_path: string | null
  release_date: string
  vote_average: number
  overview: string
  media_type: 'movie' | 'tv'
}

interface CrewCredit {
  id: number
  credit_id?: string
  title: string
  job: string
  department: string
  poster_path: string | null
  release_date: string
  vote_average: number
  media_type: 'movie' | 'tv'
}

interface PersonCombinedCredits {
  cast: CastCredit[]
  crew: CrewCredit[]
}

interface CreditsResponse { cast?: any[]; crew?: any[] }

// Prolific actors carry hundreds of credits. Rendering the whole filmography
// at once makes the page crawl on a phone, so it reveals in pages.
const FILMOGRAPHY_PAGE = 24

// One subtitle line for both tabs: cast shows the character, crew shows the job.
function creditSubtitle(credit: CastCredit | CrewCredit, tab: 'cast' | 'crew') {
  if (tab === 'cast') {
    return <>as <span className="text-text-secondary font-medium">{(credit as CastCredit).character || 'N/A'}</span></>
  }
  const crew = credit as CrewCredit
  return (
    <>
      <span className="text-accent font-medium">{crew.job}</span>
      {crew.department && crew.department !== 'Directing' && crew.department !== 'Writing' && (
        <span className="text-text-muted"> — {crew.department}</span>
      )}
    </>
  )
}

// TMDB sends date-only strings ("1974-11-11"). new Date() parses those as UTC
// midnight, so toLocaleDateString rendered the PREVIOUS day for anyone west of
// UTC (and getAge inherited the same off-by-one near a birthday). Parse the
// parts explicitly into a local date.
function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  return parseDateOnly(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getAge(birthday: string, deathday?: string | null): number {
  const birth = parseDateOnly(birthday)
  const end = deathday ? parseDateOnly(deathday) : new Date()
  const age = end.getFullYear() - birth.getFullYear()
  const m = end.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) return age - 1
  return age
}

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<'cast' | 'crew'>('cast')
  const [visibleCount, setVisibleCount] = useState(FILMOGRAPHY_PAGE)
  const { locale } = useLocale()

  const personQuery = useQuery<{ person: PersonDetail; credits: PersonCombinedCredits }>({
    queryKey: ['person', id, locale],
    enabled: !!id,
    queryFn: async ({ signal }) => {
      const [personData, creditsData] = await Promise.all([
        fetchWithRateLimit<PersonDetail>(`/person/${id}?language=${locale}`, { signal }),
        fetchWithRateLimit<CreditsResponse>(`/person/${id}/combined_credits?language=${locale}`, { signal }),
      ])
      const normalize = (arr: any[]) => arr.map(c => ({
        ...c,
        title: c.title || c.name || '',
        release_date: c.release_date || c.first_air_date || '',
      }))
      return {
        person: personData,
        credits: {
          cast: normalize(creditsData.cast || []),
          crew: normalize(creditsData.crew || []),
        },
      }
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const person = personQuery.data?.person ?? null
  const credits = personQuery.data?.credits ?? null
  const loading = personQuery.isLoading

  useDocumentTitle(person ? `${person.name} — SARANIN.` : '')

  // Each tab starts collapsed again — its own list has a different length.
  const selectTab = (tab: 'cast' | 'crew') => {
    setActiveTab(tab)
    setVisibleCount(FILMOGRAPHY_PAGE)
  }

  useEffect(() => {
    setVisibleCount(FILMOGRAPHY_PAGE)
    window.scrollTo({ top: 0 })
  }, [id])

  const sortedCast = useMemo(
    () => credits?.cast
      ?.filter(c => c.title)
      .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || '')) || [],
    [credits],
  )

  const sortedCrew = useMemo(
    () => credits?.crew
      ?.filter(c => c.title)
      .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || '')) || [],
    [credits],
  )

  // Auto-select crew tab for directors/writers/composers with no acting credits
  useEffect(() => {
    if (!credits) return
    setActiveTab(sortedCast.length === 0 && sortedCrew.length > 0 ? 'crew' : 'cast')
  }, [id, credits, sortedCast.length, sortedCrew.length])

  // Slice the active list for the current reveal window.
  const activeCredits = activeTab === 'cast' ? sortedCast : sortedCrew
  const visibleCredits = activeCredits.slice(0, visibleCount)
  const hasMoreCredits = activeCredits.length > visibleCredits.length

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-surface">
        <Navbar />
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-6 md:pt-10 pb-12">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="skeleton w-40 sm:w-48 h-60 sm:h-64 rounded-xl shrink-0 mx-auto sm:mx-0" />
            <div className="flex-1 space-y-4">
              <div className="skeleton h-10 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-24 w-full rounded" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!person) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-surface">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="text-center max-w-sm">
            <p className="text-5xl mb-4">👤</p>
            <p className="text-text-primary text-lg font-semibold mb-2">Person not found</p>
            <p className="text-text-muted text-sm mb-6">
              {(personQuery.error as Error)?.message || 'This profile could not be loaded.'}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => personQuery.refetch()}
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-6 md:pt-10 pb-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-10">
            {/* Photo */}
            <div className="shrink-0 w-40 sm:w-48 mx-auto sm:mx-0">
              <div className="relative overflow-hidden rounded-xl shadow-2xl border border-zinc-800">
                <ImageWithFallback
                  src={tmdbImage(person.profile_path, 'profile', 'w185')}
                  alt={person.name}
                  kind="profile"
                  className="w-full aspect-[2/3] object-cover"
                  sizes="(min-width: 640px) 192px, 160px"
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary leading-tight mb-2">
                {person.name}
              </h1>

              {(person.also_known_as?.length ?? 0) > 0 && (
                <p className="text-text-muted text-xs mb-3">
                  Also known as: {person.also_known_as.slice(0, 3).join(', ')}
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-sm text-text-muted mb-4">
                {person.birthday && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted block">Born</span>
                    <span className="text-text-primary">{formatDate(person.birthday)}</span>
                    {person.deathday ? (
                      <span className="text-text-muted"> — Died {formatDate(person.deathday)} (age {getAge(person.birthday, person.deathday)})</span>
                    ) : (
                      <span className="text-text-muted"> (age {getAge(person.birthday)})</span>
                    )}
                  </div>
                )}
                {person.place_of_birth && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted block">Place of Birth</span>
                    <span className="text-text-primary">{person.place_of_birth}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted block">Known For</span>
                  <span className="text-text-primary">{person.known_for_department}</span>
                </div>
              </div>

              {person.biography && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2">Biography</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{person.biography}</p>
                </div>
              )}
            </div>
          </div>

          {/* Filmography */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-lg font-bold text-text-primary">Filmography</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => selectTab('cast')}
                  className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
                    activeTab === 'cast' ? 'bg-accent text-black' : 'bg-surface-elevated border border-zinc-800 text-text-muted hover:border-zinc-600'
                  }`}
                >
                  Acting ({sortedCast.length})
                </button>
                {sortedCrew.length > 0 && (
                  <button
                    onClick={() => selectTab('crew')}
                    className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
                      activeTab === 'crew' ? 'bg-accent text-black' : 'bg-surface-elevated border border-zinc-800 text-text-muted hover:border-zinc-600'
                    }`}
                  >
                    Crew ({sortedCrew.length})
                  </button>
                )}
              </div>
            </div>

            {/* Cast and crew credits render through one card — the two lists
                only differ in their subtitle line. */}
            <div className="space-y-3">
              {visibleCredits.map((credit, idx) => (
                <div
                  // movie and tv ids are separate TMDB namespaces, and a person can
                  // hold multiple credits on the same title; credit_id is unique per credit.
                  key={credit.credit_id || `${credit.media_type}-${credit.id}-${activeTab}-${idx}`}
                >
                  <Link
                    to={`/${credit.media_type || 'movie'}/${credit.id}`}
                    className="flex gap-4 p-3 rounded-xl bg-surface-elevated border border-zinc-800/50 hover:border-zinc-600 transition-all group"
                  >
                    <div className="relative shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-surface-card">
                      <ImageWithFallback
                        src={tmdbImage(credit.poster_path, 'poster', 'w185')}
                        alt={credit.title}
                        kind="poster"
                        className="w-full h-full object-cover"
                        fallbackText={credit.media_type === 'tv' ? '📺' : '🎬'}
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-bold line-clamp-1 group-hover:text-accent transition-colors">
                        {credit.title}
                      </p>
                      <p className="text-text-muted text-xs">{creditSubtitle(credit, activeTab)}</p>
                      {credit.release_date && (
                        <p className="text-text-muted text-[10px] mt-0.5">{credit.release_date.split('-')[0]}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center">
                      {credit.vote_average > 0 && (
                        <span className="text-accent text-[10px] font-mono font-bold">★ {credit.vote_average.toFixed(1)}</span>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
              {activeCredits.length === 0 && (
                <p className="text-text-muted text-sm text-center py-8">
                  {activeTab === 'cast' ? 'No acting credits found' : 'No crew credits found'}
                </p>
              )}
            </div>

            {hasMoreCredits && (
              <button
                onClick={() => setVisibleCount(n => n + FILMOGRAPHY_PAGE)}
                className="mt-6 w-full text-xs font-bold py-3 rounded-full bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-accent transition-all active:scale-95"
              >
                Show {Math.min(FILMOGRAPHY_PAGE, activeCredits.length - visibleCredits.length)} more
                <span className="text-text-muted/60"> ({activeCredits.length - visibleCredits.length} remaining)</span>
              </button>
            )}
          </div>
      </main>
      <Footer />
    </div>
  )
}
