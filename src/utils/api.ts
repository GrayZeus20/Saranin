export const TMDB_TOKEN = (import.meta as any).env.VITE_TMDB_TOKEN
export const BASE_URL = 'https://api.themoviedb.org/3'
export const IMG_BASE = 'https://image.tmdb.org/t/p'

if (!TMDB_TOKEN) {
  console.error('[tmdb] VITE_TMDB_TOKEN is missing — every API call will 401. Set it in .env.')
}

// Concurrent request control — proper semaphore.
// The previous implementation incremented the active counter twice per request
// (queue-release path + normal path), so phantom counts accumulated until the
// cap was permanently reached and every later request queued forever ("nyangkut").
const MAX_CONCURRENT = 6
let activeRequests = 0
const waitingSlots: Array<() => void> = []

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++
    return Promise.resolve()
  }
  return new Promise<void>(resolve => waitingSlots.push(resolve))
}

function releaseSlot(): void {
  const next = waitingSlots.shift()
  if (next) {
    // Hand the slot over directly — active count stays the same.
    next()
  } else {
    activeRequests--
  }
}

// Start-rate pacing: min gap between request starts. Chained so concurrent
// callers are spaced out, without serializing the responses themselves.
const MIN_REQUEST_INTERVAL = 120
let lastRequestStart = 0
let pacingChain: Promise<void> = Promise.resolve()

// Only pace live requests — an aborted caller must not hold up the chain for
// MIN_REQUEST_INTERVAL before the next request may start.
function paceStart(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve()
  pacingChain = pacingChain.then(async () => {
    if (signal?.aborted) return
    const wait = lastRequestStart + MIN_REQUEST_INTERVAL - Date.now()
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    lastRequestStart = Date.now()
  })
  return pacingChain
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

// In-flight request dedupe: identical GET URLs issued within the same tick share
// one network call (e.g. a row and the grid both pulling page 1 of /movie/popular).
// Only successful bodies are cached; rejected promises are removed so a retry is
// a real retry, not a cached failure.
//
// The shared network work deliberately runs WITHOUT any caller's AbortSignal.
// Before, the first caller's signal was baked into the shared promise, so an
// unmount in component A rejected component B's request — the survivor showed a
// spurious error while its own data arrived fine. Each caller now observes its
// own signal through withCallerAbort, independent of who started the request.
const inflight = new Map<string, Promise<unknown>>()

function doFetch(url: string, options?: RequestInit, signal?: AbortSignal): Promise<Response> {
  return fetch(url, {
    ...options,
    signal,
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      ...options?.headers,
    },
  })
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/** The shared result raced against one caller's own signal. */
function withCallerAbort<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    work.then(
      (value) => { signal.removeEventListener('abort', onAbort); resolve(value) },
      (err) => { signal.removeEventListener('abort', onAbort); reject(err) },
    )
  })
}

async function runRequest<T>(url: string, options?: RequestInit, signal?: AbortSignal): Promise<T> {
  await acquireSlot()
  try {
    await paceStart(signal)
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const res = await doFetch(url, options, signal)

    // 429 → honour Retry-After, then retry once.
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10) * 1000
      const jitter = Math.random() * 500
      await delay(retryAfter + jitter)
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const retryRes = await doFetch(url, options, signal)
      if (!retryRes.ok) throw new HttpError(retryRes.status, `HTTP ${retryRes.status}: ${retryRes.statusText}`)
      return (await retryRes.json()) as T
    }

    // 5xx is transient; 4xx is a client error that will not heal on retry.
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const detail = body ? ` — ${body.slice(0, 200)}` : ''
      throw new HttpError(res.status, `HTTP ${res.status}: ${res.statusText}${detail}`)
    }

    return (await res.json()) as T
  } finally {
    releaseSlot()
  }
}

async function throttledFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const callerSignal = options?.signal ?? undefined
  // A caller that already aborted must never hit the network.
  if (callerSignal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const method = (options?.method ?? 'GET').toUpperCase()
  const dedupeKey = method === 'GET' ? url : null

  // Non-shared requests keep the caller's signal end-to-end — real cancellation.
  if (!dedupeKey) return runRequest<T>(url, options, callerSignal)

  let shared = inflight.get(dedupeKey) as Promise<T> | undefined
  if (!shared) {
    // Shared work runs unsignaled; abort is applied per caller below.
    shared = runRequest<T>(url, options, undefined)
    inflight.set(dedupeKey, shared)
    // `run.finally(...)` spawns a second, unobserved promise that surfaced as an
    // unhandled rejection on every failed request. Handling both outcomes on the
    // same promise clears the entry without that side effect.
    const cleanup = () => { inflight.delete(dedupeKey) }
    shared.then(cleanup, cleanup)
  }
  return withCallerAbort(shared, callerSignal)
}

export async function fetchWithRateLimit<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`
  return throttledFetch<T>(url, options)
}
