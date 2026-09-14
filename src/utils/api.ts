export const TMDB_TOKEN = (import.meta as any).env.VITE_TMDB_TOKEN
export const BASE_URL = 'https://api.themoviedb.org/3'
export const IMG_BASE = 'https://image.tmdb.org/t/p'

// Optimized rate limiting - 35 requests per 10 seconds (safe margin)
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 300 // Slightly safer margin (3 req/s)
const MAX_RETRIES = 3            // New: Max retry attempts

// Concurrent request control
const MAX_CONCURRENT = 6
let currentConcurrent = 0
let requestQueue: Array<() => void> = []

function processQueue() {
  while (requestQueue.length > 0 && currentConcurrent < MAX_CONCURRENT) {
    const nextRequest = requestQueue.shift()
    if (nextRequest) {
      currentConcurrent++
      nextRequest()
    }
  }
}

async function throttledFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Wait if at max concurrent
  if (currentConcurrent >= MAX_CONCURRENT) {
    await new Promise<void>(resolve => {
      requestQueue.push(() => resolve())
      processQueue()
    })
  }

  // Rate limit check
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }

  lastRequestTime = Date.now()
  currentConcurrent++

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${TMDB_TOKEN}`,
        ...options?.headers,
      },
    })

    // Handle rate limiting (429)
    if (res.status === 429) {
      const retryAfter = (parseInt(res.headers.get('Retry-After') || '2') * 1000)
      const jitter = Math.random() * 500 // Add 0-500ms jitter
      await new Promise(r => setTimeout(r, retryAfter + jitter))

      // Retry
      const retryRes = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${TMDB_TOKEN}`,
          ...options?.headers,
        },
      })
      if (!retryRes.ok) throw new Error(`HTTP ${retryRes.status}`)
      const data = await retryRes.json()
      return data as T
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const data = await res.json()
    return data as T
  } finally {
    currentConcurrent--
    processQueue()
  }
}

export async function fetchWithRateLimit<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`
  return throttledFetch<T>(url, options)
}

// Fast parallel batch fetch
export async function batchFetchWithRateLimit<T>(
  endpoints: string[]
): Promise<T[]> {
  const BATCH_SIZE = 4
  const results: T[] = []

  for (let i = 0; i < endpoints.length; i += BATCH_SIZE) {
    const batch = endpoints.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(ep => fetchWithRateLimit<T>(ep))
    )
    results.push(...batchResults)
  }

  return results
}
