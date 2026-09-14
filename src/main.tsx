import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import './index.css'

// Lazy load non-critical pages for code splitting
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'))
const PersonDetailPage = lazy(() => import('./pages/PersonDetailPage'))
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))

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
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/movie/:id" element={<MovieDetailPage />} />
              <Route path="/tv/:id" element={<MovieDetailPage />} />
              <Route path="/person/:id" element={<PersonDetailPage />} />
              <Route path="/company/:id" element={<CompanyDetailPage />} />
              <Route path="/category/:type" element={<CategoryPage />} />
              <Route path="*" element={<App />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="bottom-right" theme="dark" />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)