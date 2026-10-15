// TMDB's terms require this attribution wherever their data is displayed.
// The footer is the one surface every route shares.

export function Footer() {
  return (
    <footer className="relative z-10 mt-16 border-t border-zinc-800/60">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-6 safe-bottom">
        <p className="text-text-muted text-xs">
          This product uses the{' '}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            TMDB
          </a>{' '}
          API but is not endorsed or certified by TMDB.
        </p>
        <p className="text-text-muted/70 text-[11px] mt-2">Data provided by TMDB · Built with React &amp; Cloudflare Pages</p>
      </div>
    </footer>
  )
}

export default Footer
