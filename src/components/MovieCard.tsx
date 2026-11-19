// Unified grid poster card — shared by Home (App), CategoryPage, and SearchPage
// so accessibility, badges, hover previews, and caption layout stay identical.

import { ImageWithFallback } from './ImageWithFallback'
import { TrailerHover } from './TrailerHover'
import { CardDetailPopup } from './CardDetailPopup'
import { WatchButton } from './WatchButton'
import { tmdbImage } from '../utils/imageSizes'
import { formatDate, GENRE_MAP } from '../utils/constants'
import { isAnime, type Movie } from '../utils/tmdb'

export function MovieCard({
  movie,
  onOpen,
  showGenre = true,
  sizes = '(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw',
}: {
  movie: Movie
  onOpen: (movie: Movie) => void
  showGenre?: boolean
  sizes?: string
}) {
  const mediaType = movie.media_type === 'tv' ? 'tv' : 'movie'
  const anime = isAnime(movie)

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`${movie.title}${movie.release_date ? ` (${movie.release_date.slice(0, 4)})` : ''}`}
      onClick={() => onOpen(movie)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(movie)
        }
      }}
      className="cursor-pointer relative hover:z-40 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
    >
      <CardDetailPopup movie={movie} mediaType={mediaType}>
        <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
          <ImageWithFallback
            src={tmdbImage(movie.poster_path, 'poster', 'w342')}
            alt={movie.title}
            kind="poster"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            sizes={sizes}
          />
          {/* Gradient first, preview above it — keeps preview undimmed */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <TrailerHover mediaType={mediaType} id={movie.id} title={movie.title} />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded-md">
            &#9733; {movie.vote_average?.toFixed(1)}
          </div>
          {mediaType === 'tv' && (
            <div className="absolute top-2 left-2 bg-accent text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md">
              TV
            </div>
          )}
          {anime && (
            <div className={`${mediaType === 'tv' ? 'top-[26px]' : 'top-2'} absolute left-2 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md`}>
              Anime
            </div>
          )}
          <WatchButton
            compact
            entry={{
              id: movie.id,
              media_type: mediaType,
              title: movie.title,
              poster_path: movie.poster_path,
              vote_average: movie.vote_average,
              release_date: movie.release_date,
            }}
          />
        </div>
      </CardDetailPopup>
      {/* Caption outside the overflow-hidden box — never clipped by zoom */}
      <div className="px-0.5 pt-2 space-y-0.5">
        <p className="text-text-primary font-semibold text-xs sm:text-sm line-clamp-1 group-hover:text-accent transition-colors">
          {movie.title}
        </p>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-text-muted text-[11px] tabular-nums shrink-0">{formatDate(movie.release_date)}</span>
          {showGenre && movie.genre_ids?.[0] && GENRE_MAP[movie.genre_ids[0]] && (
            <>
              <span className="text-text-muted/40 text-[10px] shrink-0">•</span>
              <span className="text-text-muted text-[11px] truncate">{GENRE_MAP[movie.genre_ids[0]]}</span>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

export default MovieCard
