// PWA self-update — a deploy must reach the installed app, not just a fresh tab.
//
// The problem this solves: an installed PWA can sit open for days. `sw.js` was
// registered with the default `updateViaCache`, which lets the HTTP cache answer
// the script request, and nothing ever called `registration.update()` while a tab
// was open. A deploy therefore left the running tab — and the next cold start from
// the HTTP cache — on the previous bundle, with the shell cached behind it.
//
// Two independent staleness paths, both closed here:
//
//   1. `sw.js` itself changed. The browser only re-checks on navigation (and only
//      after 24 h with an HTTP-cache-blessed copy). We poll and re-check on
//      tab-focus/online. A new worker installs, `skipWaiting` + `clients.claim`
//      hand it control, `controllerchange` fires, and we reload once.
//
//   2. `sw.js` is byte-identical but the build changed (the usual case — the SW
//      source rarely moves, the hashed asset names do). `registration.update()`
//      finds no change and nothing reloads, so we also compare the running
//      `/assets/js/*` filename against a `no-store` read of `/index.html`. A
//      different hash is a new deploy, and a reload picks it up.
//
// The reload is deliberately conservative: never while the tab is hidden (the user
// is mid-task elsewhere; the fresh fetch happens on their next visit anyway), never
// on the very first install (there is nothing to replace), and at most once.

const UPDATE_INTERVAL_MS = 60 * 1000
const MANIFEST_URL = '/index.html'

/** The entry script this document is actually running, e.g. `index-abc123.js`. */
function runningEntryAsset(): string | null {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src]')
  const src = script?.getAttribute('src')
  if (!src) return null
  const match = src.match(/\/([^/]+\.js)(?:[?#]|$)/)
  return match ? match[1] : null
}

/** The entry script the currently deployed build references. */
async function deployedEntryAsset(): Promise<string | null> {
  try {
    // no-store: the point is to bypass every cache between here and the origin.
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' })
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/\/assets\/js\/([^"'?#]+\.js)/)
    return match ? match[1] : null
  } catch {
    // Offline or blocked — no answer, so no conclusion, so no reload.
    return null
  }
}

/**
 * Wire update checks onto a registration. Exported for testing the decision
 * logic; `startPwaUpdates` is the only caller in the app.
 */
export function watchForUpdates(
  registration: ServiceWorkerRegistration,
  reload: () => void,
): void {
  let reloading = false
  const reloadOnce = (reason: string) => {
    if (reloading) return
    reloading = true
    console.info(`[pwa] ${reason} — reloading to the new version`)
    reload()
  }

  // A new worker taking control means a new version is in charge. Skipped on the
  // very first install: there was no previous controller, so there is nothing
  // stale to replace and reloading would be a gratuitous flash on first visit.
  const hadControllerOnLoad = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerOnLoad) return
    reloadOnce('new service worker active')
  })

  const check = async () => {
    if (reloading) return
    // Only burn a request when the tab can actually act on the answer.
    if (document.visibilityState === 'hidden') return
    try {
      await registration.update()
    } catch {
      // A failed update check is not a user-facing error — the next tick retries.
      return
    }
    if (reloading) return
    const [running, deployed] = [runningEntryAsset(), await deployedEntryAsset()]
    if (running && deployed && running !== deployed) {
      reloadOnce(`new build detected (${running} → ${deployed})`)
    }
  }

  setInterval(check, UPDATE_INTERVAL_MS)
  // A backgrounded tab wakes on focus; a reconnect means the deploy may be live.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check()
  })
  window.addEventListener('online', () => { void check() })
}

/** Register the service worker (production only) and keep it current. */
export function startPwaUpdates(): void {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      // updateViaCache 'none': the SW script is revalidated against the origin
      // every time rather than answered from the HTTP cache.
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        watchForUpdates(registration, () => window.location.reload())
      })
      .catch((err) => {
        console.error('[sw] registration failed', err)
      })
  })
}
