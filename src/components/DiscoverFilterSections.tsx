// Year / age filter pills — one renderer shared by the home page and
// CategoryPage so the two filter panels can never drift apart.

import type { AgeBand } from '../utils/discover'

// Age-rating band — server-side US certifications (see utils/discover: TMDB's
// adult flag is always false on discover results). 'all' = family-friendly
// half, 'adult' = R/TV-MA half; unset shows everything.
export interface DiscoverFilterValue {
  yearFrom: number | null
  yearTo: number | null
  ageBand: AgeBand | null
}

// Year presets are computed once per mount: "this year" is derived from the
// clock, and a stale module-level constant would drift across a long session.
function yearPresets(): Array<{ label: string; from: number | null; to: number | null }> {
  const now = new Date().getFullYear()
  return [
    { label: String(now), from: now, to: now },
    { label: String(now - 1), from: now - 1, to: now - 1 },
    { label: '2020s', from: 2020, to: 2029 },
    { label: '2010s', from: 2010, to: 2019 },
    { label: '2000s', from: 2000, to: 2009 },
    { label: '1990s', from: 1990, to: 1999 },
    { label: 'Older', from: null, to: 1989 },
  ]
}

// The two audience bands. Labels speak the user's language, not the MPAA's —
// the certification wiring lives in utils/discover.
const AGE_OPTIONS: Array<{ band: AgeBand; label: string; hint: string }> = [
  { band: 'all', label: 'All Ages', hint: 'Family-friendly only (up to PG-13 / TV-PG)' },
  { band: 'adult', label: '18+', hint: 'Mature titles only (R / TV-MA and above)' },
]

const pillBase = 'shrink-0 inline-flex items-center justify-center min-h-[44px] text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95'
const pillOn = 'bg-accent text-black'
const pillOff = 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'

export function DiscoverFilterSections({ value, onChange }: {
  value: DiscoverFilterValue
  onChange: (next: DiscoverFilterValue) => void
}) {
  const { yearFrom, yearTo, ageBand } = value
  const presets = yearPresets()

  const isActiveYear = (p: { from: number | null; to: number | null }) => p.from === yearFrom && p.to === yearTo

  return (
    <>
      {/* Year Section */}
      <div className="mt-4 pb-4 border-b border-zinc-800/50">
        <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Year</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onChange({ ...value, yearFrom: null, yearTo: null })}
            className={`${pillBase} ${yearFrom === null && yearTo === null ? pillOn : pillOff}`}
          >
            Any
          </button>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => onChange(
                isActiveYear(p)
                  ? { ...value, yearFrom: null, yearTo: null }
                  : { ...value, yearFrom: p.from, yearTo: p.to },
              )}
              className={`${pillBase} ${isActiveYear(p) ? pillOn : pillOff}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Age Rating Section — US-certification bands server-side */}
      <div className="mt-4 pb-4 border-b border-zinc-800/50">
        <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Age Rating</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onChange({ ...value, ageBand: null })}
            className={`${pillBase} ${ageBand === null ? pillOn : pillOff}`}
          >
            All
          </button>
          {AGE_OPTIONS.map((o) => (
            <button
              key={o.band}
              onClick={() => onChange({ ...value, ageBand: ageBand === o.band ? null : o.band })}
              className={`${pillBase} ${ageBand === o.band ? pillOn : pillOff}`}
              title={o.hint}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default DiscoverFilterSections
