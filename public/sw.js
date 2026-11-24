// SARANIN service worker — offline app shell + API cache + poster cache.
//
// Strategy per asset class:
//   navigations    → network-first with 3.5s timeout (instant cached shell on lie-fi/offline)
//   /assets/*      → cache-first (Vite hashes filenames, a hit is always current)
//   api.themoviedb → network-first with 4s timeout → cached JSON fallback (never stuck)
//   image.tmdb.org → stale-while-revalidate with 8s network timeout, trimmed to fixed count
//   everything else (fonts, YouTube) → straight to the network, untouched

// Bump SHELL_CACHE on any deploy that must purge previously-installed clients:
// activate() deletes every cache whose name is not in KEEP_CACHES.
const SHELL_CACHE = 'saranin-shell-v3'
const API_CACHE = 'saranin-api-v1'
const IMG_CACHE = 'saranin-img-v1'
const KEEP_CACHES = new Set([SHELL_CACHE, API_CACHE, IMG_CACHE])

const SHELL_ASSETS = ['/', '/index.html', '/favicon.svg', '/site.webmanifest']
const IMG_CACHE_LIMIT = 120
const API_CACHE_LIMIT = 80
const SHELL_ASSET_LIMIT = 60

// Timeouts prevent "lie-fi" (weak/stalled mobile signal) from leaving the app
// stuck on a white screen or infinite spinner — fall back to cached content fast.
const NAV_TIMEOUT_MS = 3500
const API_TIMEOUT_MS = 4000
const IMG_TIMEOUT_MS = 8000

function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer))
}

/** Clone a cached response and tag it so the client knows offline fallback ran. */
function tagOfflineResponse(response) {
  const headers = new Headers(response.headers)
  headers.set('X-Saranin-Offline', '1')
  const existingExpose = headers.get('Access-Control-Expose-Headers')
  headers.set(
    'Access-Control-Expose-Headers',
    existingExpose ? `${existingExpose}, X-Saranin-Offline` : 'X-Saranin-Offline',
  )
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

self.addEventListener('install', (event) => {
  // allSettled: one missing icon must not abort the whole install.
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !KEEP_CACHES.has(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

async function trimCache(cacheName, limit, predicate) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  const candidates = predicate ? keys.filter(predicate) : keys
  const excess = candidates.length - limit
  for (let i = 0; i < excess; i++) await cache.delete(candidates[i])
}

const trimImageCache = () => trimCache(IMG_CACHE, IMG_CACHE_LIMIT)
const trimApiCache = () => trimCache(API_CACHE, API_CACHE_LIMIT)
const trimShellAssets = () => trimCache(
  SHELL_CACHE,
  SHELL_ASSET_LIMIT,
  (req) => new URL(req.url).pathname.startsWith('/assets/'),
)

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  // Navigations: fresh page when online & fast, cached shell on offline or slow (>3.5s).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request, NAV_TIMEOUT_MS)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy)))
          }
          return response
        })
        .catch(async () => {
          const cached = (await caches.match('/')) || (await caches.match('/index.html'))
          return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
        })
    )
    return
  }

  const url = new URL(request.url)

  // Hashed build assets never change under the same name — serve from cache.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).then(trimShellAssets))
          }
          return response
        })
      })
    )
    return
  }

  // TMDB API GET requests: network-first with 4s timeout → cached JSON fallback.
  // Keeps Home, Category, Search, and visited Detail pages usable on weak/offline networks.
  if (url.origin === 'https://api.themoviedb.org' && url.pathname.startsWith('/3/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cacheKey = url.href
        try {
          const response = await fetchWithTimeout(request, API_TIMEOUT_MS)
          if (response.ok) {
            event.waitUntil(cache.put(cacheKey, response.clone()).then(trimApiCache))
            return response
          }
          // Server error (5xx) — prefer cached copy if we have one.
          if (response.status >= 500) {
            const cached = await cache.match(cacheKey)
            if (cached) return tagOfflineResponse(cached)
          }
          return response
        } catch {
          const cached = await cache.match(cacheKey)
          if (cached) return tagOfflineResponse(cached)
          return new Response(
            JSON.stringify({ status_message: 'Offline — no cached data available for this page.' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'X-Saranin-Offline',
                'X-Saranin-Offline': '1',
              },
            },
          )
        }
      })
    )
    return
  }

  // Posters/backdrops: show the cached copy instantly, refresh in the background.
  // Plain <img> requests are no-cors, so the response can be opaque (ok === false)
  // — opaque responses are still storable, which is what keeps posters offline.
  if (url.origin === 'https://image.tmdb.org' && url.pathname.startsWith('/t/p/')) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetchWithTimeout(request, IMG_TIMEOUT_MS)
          .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) {
              event.waitUntil(cache.put(request, response.clone()).then(trimImageCache))
            }
            return response
          })
          .catch(() => cached || Response.error())
        return cached || network
      })
    )
  }
  // Anything else (fonts, YouTube embeds, other origins) goes straight to the network.
})
