// Unified collapsible filter panel — shared by Home (App) and CategoryPage
// so genre, year/age, platform, content type, and drama presets stay in sync.

import { motion, AnimatePresence } from 'motion/react'
import { RegionSelect } from './Navbar'
import { ImageWithFallback } from './ImageWithFallback'
import { DiscoverFilterSections, type DiscoverFilterValue } from './DiscoverFilterSections'
import { tmdbImage } from '../utils/imageSizes'
import type { DiscoverMedia } from '../utils/discover'
import type { CatalogEntry } from '../utils/providers'

export type ContentType = 'all' | 'movie' | 'tv' | 'anime'
export type DramaKey = 'sinetron' | 'drakor' | 'dracin'

export const DRAMA_PRESETS: Record<DramaKey, { label: string; countries: string[] }> = {
  sinetron: { label: 'Sinetron', countries: ['ID'] },
  drakor: { label: 'Drakor', countries: ['KR'] },
  dracin: { label: 'Dracin', countries: ['CN'] },
}

export function mediaOf(type: ContentType): DiscoverMedia {
  if (type === 'movie' || type === 'tv') return type
  return 'both'
}

const pillBase = 'shrink-0 inline-flex items-center justify-center min-h-[44px] text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95'
const pillOn = 'bg-accent text-black'
const pillOff = 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'

export function CatalogFilterPanel({
  open,
  categories,
  activeCategory,
  onSelectCategory,
  availableGenres,
  activeGenres,
  onClearGenres,
  onToggleGenre,
  discoverFilterValue,
  onChangeDiscoverFilters,
  platformOptions,
  activePlatform,
  providersError,
  onSelectPlatform,
  onRetryProviders,
  contentType,
  activeDrama,
  onSelectContentType,
  onSelectDrama,
  className = '',
}: {
  open: boolean
  /** Optional category section (shown on Home, omitted on CategoryPage) */
  categories?: Array<{ key: string; label: string }>
  activeCategory?: string
  onSelectCategory?: (key: string) => void
  availableGenres: Array<{ id: number; name: string }>
  activeGenres: number[]
  onClearGenres: () => void
  onToggleGenre: (id: number) => void
  discoverFilterValue: DiscoverFilterValue
  onChangeDiscoverFilters: (next: DiscoverFilterValue) => void
  platformOptions: CatalogEntry[]
  activePlatform: number | null
  providersError: boolean
  onSelectPlatform: (id: number | null) => void
  onRetryProviders: () => void
  contentType: ContentType
  activeDrama: DramaKey | null
  onSelectContentType: (type: ContentType) => void
  onSelectDrama: (drama: DramaKey | null) => void
  className?: string
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`overflow-hidden ${className}`}
        >
          {/* Optional Category Section (Home only) */}
          {categories && onSelectCategory && (
            <div className="mt-4 pb-4 border-b border-zinc-800/50">
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onSelectCategory(c.key)}
                    className={`${pillBase} ${activeCategory === c.key ? pillOn : pillOff}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Genre Section */}
          <div className="mt-4 pb-4 border-b border-zinc-800/50">
            <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Genre</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClearGenres}
                className={`${pillBase} ${activeGenres.length === 0 ? pillOn : pillOff}`}
              >
                All
              </button>
              {availableGenres.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onToggleGenre(g.id)}
                  className={`${pillBase} ${activeGenres.includes(g.id) ? pillOn : pillOff}`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Year / Age Rating Section */}
          <DiscoverFilterSections value={discoverFilterValue} onChange={onChangeDiscoverFilters} />

          {/* Platform Section */}
          <div className="mt-4 pb-4 border-b border-zinc-800/50">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-baseline gap-2">
                <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Platform</p>
                {activePlatform !== null && (
                  <span className="text-accent text-[10px] font-bold">filtering</span>
                )}
              </div>
              <RegionSelect compact />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectPlatform(null)}
                className={`${pillBase} ${activePlatform === null ? pillOn : pillOff}`}
              >
                All
              </button>
              {platformOptions.map(p => (
                <button
                  key={p.provider_id}
                  type="button"
                  onClick={() => onSelectPlatform(p.provider_id)}
                  className={`shrink-0 flex items-center gap-1.5 min-h-[44px] text-xs font-medium px-3 py-2 rounded-full transition-all duration-200 active:scale-95 ${
                    activePlatform === p.provider_id ? pillOn : pillOff
                  }`}
                >
                  {p.logo_path && (
                    <span className="relative w-4 h-4 shrink-0">
                      <ImageWithFallback
                        src={tmdbImage(p.logo_path, 'logo', 'w45')}
                        alt={p.provider_name}
                        kind="logo"
                        fallbackText={null}
                        className="w-full h-full rounded-sm object-cover"
                      />
                    </span>
                  )}
                  {p.provider_name}
                </button>
              ))}
            </div>
            {platformOptions.length === 0 && (
              providersError ? (
                <p className="text-text-muted text-[10px] mt-2">
                  Couldn't load platforms.{' '}
                  <button type="button" onClick={onRetryProviders} className="text-accent font-bold hover:text-white transition-colors">
                    Retry
                  </button>
                </p>
              ) : (
                <p className="text-text-muted text-[10px] mt-2">Loading platforms…</p>
              )
            )}
          </div>

          {/* Content Type + Drama Presets Section */}
          <div className="mt-4 pb-4 border-b border-zinc-800/50">
            <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Type</p>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all', label: 'All' },
                { key: 'movie', label: 'Movies' },
                { key: 'tv', label: 'TV Series' },
                { key: 'anime', label: 'Anime' },
              ] as { key: ContentType; label: string }[]).map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onSelectContentType(t.key)}
                  className={`${pillBase} ${contentType === t.key && activeDrama === null ? pillOn : pillOff}`}
                >
                  {t.label}
                </button>
              ))}
              {(Object.entries(DRAMA_PRESETS) as [DramaKey, { label: string }][]).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectDrama(activeDrama === key ? null : key)}
                  className={`${pillBase} ${activeDrama === key ? pillOn : pillOff}`}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CatalogFilterPanel
