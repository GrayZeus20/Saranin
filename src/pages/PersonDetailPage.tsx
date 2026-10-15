import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
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
  const [person, setPerson] = useState<PersonDetail | null>(null)
  const [credits, setCredits] = useState<PersonCombinedCredits | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'cast' | 'crew'>('cast')
  const [visibleCount, setVisibleCount] = useState(FILMOGRAPHY_PAGE)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { locale } = useLocale()

  useDocumentTitle(person ? `${person.name} — SARANIN.` : '')

  // Each tab starts collapsed again — its own list has a different length.
  const selectTab = (tab: 'cast' | 'crew') => {
    setActiveTab(tab)
    setVisibleCount(FILMOGRAPHY_PAGE)
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    const controller = new AbortController()
    Promise.all([
      fetchWithRateLimit<PersonDetail>(`/person/${id}?language=${locale}`, { signal: controller.signal }),
      fetchWithRateLimit<CreditsResponse>(`/person/${id}/combined_credits?language=${locale}`, { signal: controller.signal }),
    ]).then(([personData, creditsData]) => {
      // Normalize TV credits: name→title, first_air_date→release_date
      const normalize = (arr: any[]) => arr.map(c => ({
        ...c,
        title: c.title || c.name || '',
        release_date: c.release_date || c.first_air_date || '',
      }))
      setPerson(personData)
      setCredits({
        cast: normalize(creditsData.cast || []),
        crew: normalize(creditsData.crew || []),
      })
      setLoading(false)
    }).catch(() => {
      if (!controller.signal.aborted) {
        setPerson(null)
        setCredits(null)
        setLoading(false)
      }
    })
    return () => controller.abort()
  }, [id, locale])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const sortedCast = credits?.cast
    ?.filter(c => c.title)
    .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || '')) || []

  const sortedCrew = credits?.crew
    ?.filter(c => c.title)
    .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || '')) || []

  // Slice the active list for the current reveal window.
  const activeCredits = activeTab === 'cast' ? sortedCast : sortedCrew
  const visibleCredits = activeCredits.slice(0, visibleCount)
  const hasMoreCredits = activeCredits.length > visibleCredits.length

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-surface">
        <div className="w-full h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12">
            <div className="flex flex-col sm:flex-row gap-8">
              <div className="skeleton w-48 h-64 rounded-xl shrink-0" />
              <div className="flex-1 space-y-4">
                <div className="skeleton h-10 w-3/4 rounded" />
                <div className="skeleton h-4 w-1/2 rounded" />
                <div className="skeleton h-24 w-full rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="fixed inset-0 z-50 bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">👤</p>
          <p className="text-text-primary text-lg font-semibold mb-2">Person not found</p>
          <Link to="/" className="mt-4 inline-block bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform">
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

        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-10"
          >
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
          </motion.div>

          {/* Filmography */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
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
              {visibleCredits.map((credit, i) => (
                <motion.div
                  // movie and tv ids are separate TMDB namespaces, so the bare
                  // id is not unique across a combined-credits list.
                  key={`${credit.media_type}-${credit.id}-${activeTab === 'cast' ? (credit as CastCredit).character : (credit as CrewCredit).job}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.5) }}
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
                </motion.div>
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
          </motion.div>
        </div>
        <Footer />
      </div>
    </div>
  )
}
