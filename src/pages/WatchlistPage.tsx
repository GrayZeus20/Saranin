// /watchlist — everything the user saved for later, newest first.

import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { ImageWithFallback } from '../components/ImageWithFallback'
import { WatchButton } from '../components/WatchButton'
import { IMG_BASE } from '../utils/api'
import { formatDate } from '../utils/constants'
import { useWatchlist } from '../utils/watchlist'
import { useDocumentTitle } from '../utils/useDocumentTitle'

export default function WatchlistPage() {
  const { items, remove, clear } = useWatchlist()
  useDocumentTitle(`Watchlist (${items.length}) — SARANIN.`)

  return (
    <div className="min-h-[100dvh] bg-surface">
      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-5 md:py-8">
        <Navbar />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 mb-8 flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary">Watchlist</h1>
            <p className="text-text-muted text-xs sm:text-sm mt-1">
              {items.length === 0
                ? 'Save anything you want to watch later.'
                : `${items.length} ${items.length === 1 ? 'title' : 'titles'} saved`}
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => { if (window.confirm('Clear the whole watchlist?')) clear() }}
              className="min-h-[44px] text-xs font-bold px-5 rounded-full bg-surface-elevated border border-zinc-800 text-text-muted hover:border-red-500 hover:text-red-400 transition-all active:scale-95"
            >
              Clear all
            </button>
          )}
        </motion.div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4" aria-hidden="true">&#x1f516;</p>
            <p className="text-text-primary text-sm font-bold mb-2">Nothing saved yet</p>
            <p className="text-text-muted text-xs mb-6">
              Tap the <span className="text-accent font-bold">+</span> on any poster, or the Watchlist button on a detail page.
            </p>
            <Link
              to="/"
              className="inline-block bg-accent text-black text-xs font-bold px-6 py-2.5 rounded-full hover:bg-accent/90 transition-all active:scale-95"
            >
              Browse titles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 pb-12">
            {items.map((entry, i) => (
              <motion.article
                key={`${entry.media_type}-${entry.id}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(0.04 + i * 0.02, 0.35), ease: [0.16, 1, 0.3, 1] }}
                className="group"
              >
                <Link to={`/${entry.media_type}/${entry.id}`} className="block">
                  <div className="relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]">
                    <ImageWithFallback
                      src={entry.poster_path ? `${IMG_BASE}/w342${entry.poster_path}` : ''}
                      alt={entry.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                      &#9733; {entry.vote_average?.toFixed(1)}
                    </div>
                    {entry.media_type === 'tv' && (
                      <div className="absolute top-2 left-2 bg-accent text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md">TV</div>
                    )}
                  </div>
                  <p className="mt-2 text-xs sm:text-sm font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">{entry.title}</p>
                  <p className="text-text-muted text-[10px]">{formatDate(entry.release_date)}</p>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(entry.media_type, entry.id)}
                  className="mt-1.5 text-[10px] font-bold text-text-muted hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </motion.article>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
