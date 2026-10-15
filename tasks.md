# Tasks

## Deepscan + fix UI/feature/image bugs (2026-10-15)

Request: "deepscan dan perbaiki bug ui dan fitur yang ada termasuk gambar yang error lalu
berikan saya saran apa saja yang bisa kita kembangkan lagi".

Method: 6 read lenses over the whole app (images/media, UI/layout, data/state, resilience,
a11y/SEO/PWA, cross-surface consistency). Every finding below was read in the source before it
was written down; anything that could not be proven from the code was dropped.

Plan:
- [x] 1. `src/components/Navbar.tsx` — `md:hidden` wrapper on the compact RegionSelect (two
      pickers rendered side by side at >=768px); search panel: `aria-expanded` reflects state,
      `aria-controls`, chips + "See all" get `onClick` (keyboard), blur into the panel no
      longer closes it; result thumbnails go through ImageWithFallback
- [x] 2. `src/components/ImageWithFallback.tsx` — reset error/loaded when `src` changes; adopt
      an already-complete image on mount (`img.complete`), otherwise a cached poster never
      fires `onLoad` and stays `opacity-0` behind its own skeleton
- [x] 3. `src/utils/tmdb.ts` — `dedupById` keys on `media_type + id`; the bare id merged the
      movie and tv namespaces and silently dropped titles from every combined page
- [x] 4. `src/utils/api.ts` — per-caller abort wrapper so a shared in-flight promise cannot be
      rejected by another caller's AbortSignal
- [x] 5. `src/utils/providers.ts` — drop the failed catalog from the cache instead of
      remembering `[]` forever; surface failure instead of a permanent "Loading platforms…"
- [x] 6. `src/App.tsx` — page title, Navbar+Footer on the error screen, hero backdrop
      `onError`, row skeleton only while loading, platform error/retry, `!`-prefix cleanup,
      TV badge in the grid, grid + rail keys namespaced by media_type (collision after the
      dedupe fix), grid WatchButton now `compact` (was overlapping the card title),
      provider logos degrade
- [x] 7. `src/pages/CategoryPage.tsx` — sort only where the category needs it (Top Rated was
      being re-sorted newest-first), badge counts a real deviation, page/filters in the URL so
      Back from a detail page restores the view, error screen keeps its chrome, provider
      logos degrade
- [x] 8. `src/pages/MovieDetailPage.tsx` — scroll reset per title, region block stops
      mislabelling another country's providers, every logo/poster/backdrop degrades instead
      of breaking (poster via ImageWithFallback, all four bare `<img>` get `onError`)
- [x] 9. `src/pages/SearchPage.tsx` — trending typo, badge class conflict, `w342` posters
- [x] 10. `src/pages/PersonDetailPage.tsx` — date-only parse without the UTC day shift,
      `w185` credit posters, profile via ImageWithFallback
- [x] 11. `src/index.css` — `--color-text-muted` to an AA-passing value
- [x] 12. `public/sw.js` — trim the shell cache as well as the image cache; `CompanyDetailPage`
      poster + logo degrade through the same component
- [x] 13. Verify: `tsc --noEmit`, `vite build`, headless run of every route, 0 console errors
      — GREEN (run in the 2026-10-16 pass once shell commands were reachable again): `tsc`
      clean, 522-module build green, 8-route headless sweep on the production artifact with
      0 console errors and 0 image failures.
- [x] 14. Write the development suggestions (delivered in the session report; the ranked
      shortlist lives in the chat, not in the repo)

## Feature pass 2 — suggestions 1/2/3/4/5/8/10/11 + filter-scroll bug (2026-10-15)

Request: implement the picked suggestions (watch deep-links, search history, more
filters, srcset posters, recommendations rail, ID locale toggle, trailer hover,
offline watchlist) and fix: opening the filter panel must not scroll the page to top.

Plan (1 line per step + files touched):
- [x] 0. `src/App.tsx` + `src/pages/CategoryPage.tsx` — scroll fix: filter interactions
      never move the viewport (opening the panel, every pill inside it, and the
      PUSH→REPLACE flip of the first filter write — the old searchParams-keyed effect
      smooth-scrolled to top on any URL write); Back/Forward restores via the saved
      position, paging scrolls itself (home → top of grid, category → top)
- [x] 0b. Deepscan of the image pipeline found the root cause of "gambar tidak muncul":
      **TMDB rejects size tokens that do not belong to the image TYPE.** `w92` is a
      POSTER size; `image.tmdb.org/t/p/w92/<provider_logo>` 404s. Same for the profile
      and logo call sites. Every bare `<img>` that hid itself with `onError` left a
      blank hole; `ImageWithFallback` had no idea it was being fed an invalid size.
      Fix: one per-type size table (`staticImage`) + a shared `onError`-degrade path.
- [x] 1. `src/pages/MovieDetailPage.tsx` — watch deep-links: per-region `link` (JustWatch)
      makes provider pills + country rows real anchors
- [x] 2. `src/utils/searchHistory.ts` (new) + `src/components/Navbar.tsx` +
      `src/pages/SearchPage.tsx` — recent searches store (watchlist pattern), recorded on
      commit, rendered above trending, removable + clearable
- [x] 3. `src/utils/discover.ts` + `src/App.tsx` + `src/pages/CategoryPage.tsx` — year /
      rating floor / runtime URL params, server-side via /discover when set, counted in the
      badge, cleared by reset
- [x] 4. `src/components/ImageWithFallback.tsx` + poster call sites — TMDB srcset ladder
      (w92→w780) with per-surface `sizes`; srcset is emitted only when `sizes` is passed
      (without one the browser assumes 100vw and over-fetches), all call sites now pass it
- [x] 5. `src/pages/MovieDetailPage.tsx` + `src/App.tsx` — "More Like This" rail from
      recommendations + home "Because you saved X" rail seeded by the newest watchlist entry
- [x] 8. `src/utils/locale.ts` (new) + Navbar toggle + `language` threaded through App /
      CategoryPage / SearchPage / MovieDetailPage / PersonDetailPage / CompanyDetailPage /
      discover / providers (provider catalog cache keyed region+locale)
- [x] 10. `src/utils/trailer.ts` + `src/components/TrailerHover.tsx` (new) + home hero,
      home grid + rail cards, detail hero, similar/recommendation cards, category grid,
      company grid — muted looping hover preview, desktop pointers only, reduced-motion
      respected, one cached key fetch per title
- [x] 11. `public/site.webmanifest` + `src/main.tsx` — watchlist + search shortcuts; the lazy
      watchlist chunk is warmed once the SW controls the page so the offline route boots
- [x] 12. Verify: `tsc --noEmit`, `vite build`, dragtest harness, 0 console errors
      — GREEN (run in the 2026-10-16 pass): `tsc` clean, build green, dragtest 9/9, and the
      production-artifact sweep's search/rail/modal checks all pass on the same tree.

## Feature pass 3 — flag-scroll region picker, "list" popup, search icon (2026-10-15)

Request: "deepscan dan perbaiki gambar gambar yang tidak muncul / available pada detail
buatkan negara nya ber icon bendera bentuk bulan yang bisa di scroll dan drag ke kanan jika
over dan buatkan button list agar saat di klik list maka muncul popup yang bisa di scroll
untuk melihat list dimana saja tersedia / di navbar buatkan icon search jadi saat ditekan
baru muncul bar untuk search nya / lakukan pengecekan untuk gambar dan fitur nya sebelum done"

Plan (1 line per step + files touched):
- [x] 0. `src/utils/imageSizes.ts` (new) — per-image-TYPE size ladders + `posterSrcSet`
      (posters, backdrops, logos, profiles, stills each have their own valid token set;
      the old single ladder offered `w185/w300/w342` to provider logos, which 404s);
      **profile ladder corrected to `w45/w185/h632`** — `w632` is not a TMDB token
      (632 ships as a HEIGHT) and the live CDN answers it with HTTP 400, which is the
      31-failure class the sweep surfaced once images started loading again. The token
      regex now also accepts `h632`; a `w`-only regex reported every h632 URL as
      "not a TMDB image" and silently disabled its srcset.
- [x] 1. `src/components/ImageWithFallback.tsx` — accept `kind` (poster/backdrop/logo/
      profile/still) so the srcset ladder is per-type; keep the sizes-gated behaviour
- [x] 2. Image call sites — every `<img>` that pointed at a logo/profile/backdrop with a
      poster token now uses the right size, and every bare `<img>` got a real degrade
      (`App`, `CategoryPage`, `MovieDetailPage`, `Navbar` search thumbs)
- [x] 3. `src/components/RegionFlagRail.tsx` (new) — half-moon flag rail: horizontal
      scroll, pointer drag with click suppression, snap, arrows, keyboard; edge fades
- [x] 4. `src/pages/MovieDetailPage.tsx` — "Available in" becomes the flag rail + a
      `List` button opening a scrollable modal of every country (providers, deep links)
- [x] 5. `src/components/Navbar.tsx` — search collapses to an icon button on BOTH
      desktop and mobile; the field only mounts when tapped; Escape closes panel then
      field, outside-click closes it, route change resets it
- [x] 6. Verify: `tsc --noEmit`, `vite build`, headless route sweep, 0 console errors
      — GREEN. `tsc` clean; 522-module production build green; `dragtest` 9/9; and a
      production-artifact sweep (dist served exactly as Cloudflare does: real
      `public/_headers` CSP + SPA fallback) passes 22/22 checks across 8 routes —
      images load on every route, 0 HTTP failures, 0 console errors, search gating,
      crescent rail (129 chips, arc 0→14px, 220px drag, click suppressed), and the
      scrollable List modal (`scrollHeight 16144` / `clientHeight 595`).

Root cause of the image outage (found in this pass):
- The shipping CSP's `connect-src` listed only `api.themoviedb.org`. Chrome refuses
  the `image.tmdb.org` request outright (`net::ERR_FAILED`, never a response) when the
  host is missing there — and the service worker's own `fetch(request)` for posters is
  a `connect-src` request governed by the worker's CSP, so offline image caching died
  with it. Proof: with the policy as shipped, unregistering the SW restored images
  (0/28 → 30/58 on `/movie/550`); adding `https://image.tmdb.org` to `connect-src` in
  `public/_headers` and `vite.config.js` restored every route (company 139/139,
  person 23/23, home 63/69, detail 43/58) with 0 failures.

