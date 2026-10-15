// SARANIN service worker — offline app shell + poster cache.
//
// Strategy per asset class:
//   navigations    → network-first (fresh HTML when online), cached shell offline
//   /assets/*      → cache-first (Vite hashes filenames, a hit is always current)
//   image.tmdb.org → stale-while-revalidate, trimmed to a fixed entry count
//   everything else (API calls, fonts) → straight to the network, untouched

const SHELL_CACHE = 'saranin-shell-v1'
const IMG_CACHE = 'saranin-img-v1'
const SHELL_ASSETS = ['/', '/favicon.svg', '/site.webmanifest']
const IMG_CACHE_LIMIT = 120

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
          .filter((key) => key !== SHELL_CACHE && key !== IMG_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

async function trimImageCache() {
  const cache = await caches.open(IMG_CACHE)
  const keys = await cache.keys()
  // Cache.keys() is insertion-ordered, so the head holds the oldest posters.
  const excess = keys.length - IMG_CACHE_LIMIT
  for (let i = 0; i < excess; i++) await cache.delete(keys[i])
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  // Navigations: fresh page when online, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/').then((cached) =>
          cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
        ))
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
            event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)))
          }
          return response
        })
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
        const network = fetch(request)
          .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) {
              cache.put(request, response.clone()).then(trimImageCache)
            }
            return response
          })
          .catch(() => cached || Response.error())
        return cached || network
      })
    )
  }
  // Anything else (API calls, fonts, other origins) goes straight to the network.
})
