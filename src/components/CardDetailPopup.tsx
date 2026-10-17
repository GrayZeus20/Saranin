// Card detail popup — a small floating panel that opens over a poster card on
// hover (pointer-fine only; a touch device opens the detail page directly, so
// a popup there would only trap taps).
//
// It is intentionally minimal: the card already navigates on click, so the
// popup's job is the "look before you leap" — year, rating, genres, a synopsis
// excerpt and the same deep link the card itself has. Data comes from the
// item the grid already holds (the list payload), so opening one costs ZERO
// extra requests.
//
// Positioning: the panel is anchored to the card's box (absolute, inside the
// card's relative wrapper) and flips above/below via the host's `data-flip`
// attribute only when CSS cannot keep it on screen — but the simplest correct
// behavior is `bottom-full` (opens upward over the poster, which is the one
// direction that never clips the viewport bottom on a scrolling grid) with a
// z-index above every sibling chrome.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GENRE_MAP, formatDate } from '../utils/constants'
import type { Movie } from '../utils/tmdb'

export function CardDetailPopup({ movie, mediaType, children }: {
  movie: Movie
  mediaType: 'movie' | 'tv'
  /** The card's own body — rendered as-is inside the hover wrapper. */
  children: ReactNode
}) {
  const path = `/${mediaType}/${movie.id}`
  const genres = (movie.genre_ids || []).map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 3)

  return (
    <div className="card-popup group/card relative">
      {children}
      {/* The panel. `group-hover/card` keeps it closed until the pointer
          rests on the card; `pointer-events-none` while closed means it can
          never steal the click that navigates. */}
      <div
        role="presentation"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 opacity-0 translate-y-1 transition-all duration-200 group-hover/card:opacity-100 group-hover/card:translate-y-0 group-hover/card:pointer-events-auto group-hover/card:delay-300"
      >
        <div className="rounded-xl border border-zinc-700 bg-surface-elevated/95 backdrop-blur-md p-3.5 shadow-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-accent text-[10px] font-mono font-bold">★ {movie.vote_average?.toFixed(1)}</span>
            <span className="text-text-muted text-[10px]">{formatDate(movie.release_date)}</span>
            <span className="text-text-muted text-[10px] uppercase">{mediaType === 'tv' ? 'TV' : 'Movie'}</span>
          </div>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {genres.map(g => (
                <span key={g} className="text-[9px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 rounded">
                  {g}
                </span>
              ))}
            </div>
          )}
          {movie.overview && (
            <p className="text-text-secondary text-[11px] leading-relaxed line-clamp-4 mb-2.5">{movie.overview}</p>
          )}
          <Link
            to={path}
            className="block text-center bg-accent text-black text-[11px] font-bold py-1.5 rounded-full hover:bg-accent/90 active:scale-95 transition-all"
          >
            Open details
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CardDetailPopup
