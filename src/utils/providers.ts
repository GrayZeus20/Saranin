// Region streaming-service catalog — builds the Platform filter (Netflix / Prime / …).
//
// Both the home page and CategoryPage filter by platform, and both do it
// server-side (see utils/discover). That means neither needs the per-title
// "which services carry this exact movie" lookup any more — the only thing left
// here is the curated region catalog the filter pills are built from.

import { fetchWithRateLimit } from './api'
import { DEFAULT_REGION } from './region'
import type { WatchProvider } from './tmdb'

interface ProviderCatalogResponse {
  results?: WatchProvider[]
}

// Priority order for the filter bar. Only providers actually available in the
// region are shown; the rest are ignored. Netflix / Prime / Disney+ come first.
const FEATURED_ORDER = [
  'Netflix',
  'Amazon Prime Video',
  'Disney Plus',
  'Apple TV Plus',
  'Max',
  'HBO Max',
  'Hulu',
  'Disney+ Hotstar',
  'Vidio',
  'VIU',
  'iQIYI',
  'Catchplay',
  'beIN Sports',
  'Paramount Plus',
  'Apple TV',
  'Google Play Movies',
]

export interface CatalogEntry {
  provider_id: number
  provider_name: string
  logo_path: string
}

// Keyed by region: the old single-promise cache served Indonesia's catalog after
// the user switched regions, which both mislabelled the pills and filtered the
// grid against the wrong provider set.
const catalogPromises = new Map<string, Promise<CatalogEntry[]>>()

/** Watch providers available in the region, curated order first. Cached per region per session. */
export function getRegionProviders(region: string = DEFAULT_REGION): Promise<CatalogEntry[]> {
  const cached = catalogPromises.get(region)
  if (cached) return cached
  const promise = (async () => {
    try {
      const data = await fetchWithRateLimit<ProviderCatalogResponse>(
        `/watch/providers/movie?language=en-US&watch_region=${region}`
      )
      const all = (data.results || []).map(p => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
      }))
      const byName = new Map(all.map(p => [p.provider_name, p]))
      const featured: CatalogEntry[] = []
      for (const name of FEATURED_ORDER) {
        const match = byName.get(name)
        if (match && !featured.some(f => f.provider_id === match.provider_id)) featured.push(match)
      }
      const featuredIds = new Set(featured.map(f => f.provider_id))
      const rest = all
        .filter(p => !featuredIds.has(p.provider_id))
        .sort((a, b) => a.provider_name.localeCompare(b.provider_name))
      return [...featured, ...rest]
    } catch {
      return []
    }
  })()
  catalogPromises.set(region, promise)
  return promise
}
