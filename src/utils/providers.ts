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

// Priority order for the filter bar — the services the catalogue is browsed for,
// and nothing else. Names are matched case-insensitively and per region, so a
// service TMDB does not list for the current region simply has no pill (Bstation
// is absent from the ID catalog by TMDB's own data). HBO ships under three names
// (Max / HBO Max / HBO Go) depending on region, Disney under three, so each
// alias is listed and the first match wins.
const FEATURED_ORDER = [
  'Netflix',
  'Max',
  'HBO Max',
  'HBO Go',
  'Disney Plus',
  'Disney+',
  'Disney+ Hotstar',
  'Amazon Prime Video',
  'Prime Video',
  'Viu',
  'WeTV',
  'Bstation',
]

export interface CatalogEntry {
  provider_id: number
  provider_name: string
  logo_path: string
}

// Keyed by region AND locale: the old single-promise cache served Indonesia's
// catalog after the user switched regions, which both mislabelled the pills and
// filtered the grid against the wrong provider set. Locale joined the key when
// the EN/ID toggle landed — provider names come back localized too, so a stale
// en-US list under an id-ID session would mix languages in one filter bar.
const catalogPromises = new Map<string, Promise<CatalogEntry[]>>()

/** Watch providers available in the region, curated order first. Cached per region per locale per session. */
export function getRegionProviders(region: string = DEFAULT_REGION, language: string = 'en-US'): Promise<CatalogEntry[]> {
  const cacheKey = `${region}:${language}`
  const cached = catalogPromises.get(cacheKey)
  if (cached) return cached
  const promise = (async () => {
    try {
      const data = await fetchWithRateLimit<ProviderCatalogResponse>(
        `/watch/providers/movie?language=${language}&watch_region=${region}`
      )
      const all = (data.results || []).map(p => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
      }))
      // Name matching is case-insensitive: TMDB spells the same service
      // differently per region ('VIU' vs 'Viu'), and a case-sensitive lookup
      // silently dropped the pill for that region.
      const lowerName = new Map(all.map(p => [p.provider_name.toLowerCase(), p]))
      const featured: CatalogEntry[] = []
      const push = (name: string) => {
        const match = lowerName.get(name.toLowerCase())
        if (match && !featured.some(f => f.provider_id === match.provider_id)) featured.push(match)
      }
      for (const name of FEATURED_ORDER) push(name)
      // Only the curated seven are offered. The long tail (Apple TV, iQIYI,
      // Crunchyroll, …) made the pill rail unscannable and diluted the filter;
      // the list is now exactly the services the catalogue is browsed for.
      return featured
    } catch (err) {
      // Do NOT remember failures. The old code cached the resolved [] forever,
      // so one network blip left both filter bars stuck on "Loading platforms…"
      // with no error and no retry — recovering required a full reload.
      // Evicting the entry lets react-query's retry/reload fetch for real.
      catalogPromises.delete(cacheKey)
      throw err
    }
  })()
  catalogPromises.set(cacheKey, promise)
  return promise
}
