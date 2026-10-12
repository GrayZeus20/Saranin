// Shared TMDB shape normalizers — movie + tv results arrive with different
// field names; every grid/detail surface needs the same unified shape.

export interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

export interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  release_date: string
  genre_ids: number[]
  providers?: WatchProvider[]
  media_type?: 'movie' | 'tv'
  origin_country?: string[]
  status?: string
  original_language?: string
}

export function normalizeTv(tv: any): Movie {
  return {
    ...tv,
    title: tv.name || tv.title,
    release_date: tv.first_air_date || tv.release_date,
    media_type: 'tv',
    origin_country: tv.origin_country || [],
    status: tv.status || '',
  }
}

export function normalizeMovie(movie: any): Movie {
  return {
    ...movie,
    media_type: 'movie',
  }
}

export function dedupById(prev: Movie[], next: Movie[]): Movie[] {
  const ids = new Set(prev.map(m => m.id))
  return [...prev, ...next.filter(m => !ids.has(m.id))]
}

// media_type-agnostic movie/tv router — required for search results,
// where TMDB returns both kinds in a single list.
export function mediaPath(m: Pick<Movie, 'media_type' | 'id'>): string {
  return `/${m.media_type === 'tv' ? 'tv' : 'movie'}/${m.id}`
}
