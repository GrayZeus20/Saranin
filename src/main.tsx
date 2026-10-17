import { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import { startPwaUpdates } from './utils/pwaUpdate'
import './index.css'

// Lazy load non-critical pages for code splitting
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'))
const PersonDetailPage = lazy(() => import('./pages/PersonDetailPage'))
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))

// Offline support: the service worker caches the app shell and viewed posters.
// Production only — in dev it would serve stale bundles over HMR.
//
// The watchlist route is lazy, so its JS chunk has to be in the SW's asset cache
// *before* the app is opened with no network — otherwise /watchlist boots the
// shell and then dies on a chunk that was never fetched. Warm it as soon as the
// worker controls this page (after activate/claim on the first visit; already
// true on every later one).
//
// Registration + the update loop live in utils/pwaUpdate: a deploy must reach an
// already-open tab, not just the next cold start (see that module's header).
if (import.meta.env.PROD) {
  startPwaUpdates()

  const warmOfflineChunks = () => {
    if (!navigator.serviceWorker.controller) return
    import('./pages/WatchlistPage').catch(() => {
      // A failed warm must never affect the running page — the next online visit retries.
    })
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.state === 'activated' && navigator.serviceWorker.controller
        ? warmOfflineChunks()
        : navigator.serviceWorker.addEventListener('controllerchange', warmOfflineChunks, { once: true })
    }).catch(() => {
      // ready() never rejects in practice, but a rejected promise here must not
      // surface as an unhandled rejection.
    })
  }
}

// Loading fallback for lazy routes
function PageLoader() {
  return (
    <div className="min-h-[100dvh] bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-xs">Loading...</p>
      </div>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: 500,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  // NOTE: StrictMode removed — double-invokes effects (provider fetch fires twice,
  // causes redundant state updates). In production the guard check mitigates this
  // but removing StrictMode keeps sessions stable across hot-reloads.
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" makes every motion/* animation in the tree respect
          the OS "reduce motion" setting instead of animating regardless. */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/movie/:id" element={<MovieDetailPage />} />
              <Route path="/tv/:id" element={<MovieDetailPage />} />
              <Route path="/person/:id" element={<PersonDetailPage />} />
              <Route path="/company/:id" element={<CompanyDetailPage />} />
              <Route path="/category/:type" element={<CategoryPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="*" element={<App />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="bottom-right" theme="dark" />
      </MotionConfig>
    </QueryClientProvider>
  </ErrorBoundary>
)