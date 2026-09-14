import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import Navbar from '../components/Navbar'

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

const TMDB_TOKEN = (import.meta as any).env.VITE_TMDB_TOKEN
const BASE_URL = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getAge(birthday: string, deathday?: string | null): number {
  const birth = new Date(birthday)
  const end = deathday ? new Date(deathday) : new Date()
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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    const controller = new AbortController()
    Promise.all([
      fetch(`${BASE_URL}/person/${id}?language=en-US`, {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
        signal: controller.signal
      }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() }),
      fetch(`${BASE_URL}/person/${id}/combined_credits?language=en-US`, {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
        signal: controller.signal
      }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() }),
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
  }, [id])

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
              {person.profile_path ? (
                <img
                  src={`${IMG_BASE}/w500${person.profile_path}`}
                  alt={person.name}
                  className="w-full aspect-[2/3] object-cover rounded-xl shadow-2xl border border-zinc-800"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-surface-card rounded-xl flex items-center justify-center text-zinc-700 text-4xl font-black border border-zinc-800">
                  {person.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary leading-tight mb-2">
                {person.name}
              </h1>

              {person.also_known_as.length > 0 && (
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
                  onClick={() => setActiveTab('cast')}
                  className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
                    activeTab === 'cast' ? 'bg-accent text-black' : 'bg-surface-elevated border border-zinc-800 text-text-muted hover:border-zinc-600'
                  }`}
                >
                  Acting ({sortedCast.length})
                </button>
                {sortedCrew.length > 0 && (
                  <button
                    onClick={() => setActiveTab('crew')}
                    className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
                      activeTab === 'crew' ? 'bg-accent text-black' : 'bg-surface-elevated border border-zinc-800 text-text-muted hover:border-zinc-600'
                    }`}
                  >
                    Crew ({sortedCrew.length})
                  </button>
                )}
              </div>
            </div>

            {activeTab === 'cast' ? (
              <div className="space-y-3">
                {sortedCast.map((credit, i) => (
                  <motion.div
                    key={`${credit.id}-${credit.character}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.5) }}
                  >
                    <Link
                      to={`/${credit.media_type || 'movie'}/${credit.id}`}
                      className="flex gap-4 p-3 rounded-xl bg-surface-elevated border border-zinc-800/50 hover:border-zinc-600 transition-all group"
                    >
                      <div className="shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-surface-card">
                        {credit.poster_path ? (
                          <img
                            src={`${IMG_BASE}/w92${credit.poster_path}`}
                            alt={credit.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-bold">{credit.media_type === 'tv' ? '📺' : '🎬'}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-bold line-clamp-1 group-hover:text-accent transition-colors">
                          {credit.title}
                        </p>
                        <p className="text-text-muted text-xs">
                          as <span className="text-text-secondary font-medium">{credit.character || 'N/A'}</span>
                        </p>
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
                {sortedCast.length === 0 && (
                  <p className="text-text-muted text-sm text-center py-8">No acting credits found</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedCrew.map((credit, i) => (
                  <motion.div
                    key={`${credit.id}-${credit.job}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.5) }}
                  >
                    <Link
                      to={`/${credit.media_type || 'movie'}/${credit.id}`}
                      className="flex gap-4 p-3 rounded-xl bg-surface-elevated border border-zinc-800/50 hover:border-zinc-600 transition-all group"
                    >
                      <div className="shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-surface-card">
                        {credit.poster_path ? (
                          <img
                            src={`${IMG_BASE}/w92${credit.poster_path}`}
                            alt={credit.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-bold">{credit.media_type === 'tv' ? '📺' : '🎬'}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-bold line-clamp-1 group-hover:text-accent transition-colors">
                          {credit.title}
                        </p>
                        <p className="text-text-muted text-xs">
                          <span className="text-accent font-medium">{credit.job}</span>
                          {credit.department && credit.department !== 'Directing' && credit.department !== 'Writing' && (
                            <span className="text-text-muted"> — {credit.department}</span>
                          )}
                        </p>
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
                {sortedCrew.length === 0 && (
                  <p className="text-text-muted text-sm text-center py-8">No crew credits found</p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
