# Tasks

## Deepscan pass — error hunt (2026-10-17)

Request: "deepscan cari error". Method: strict tsc (`--noUnusedLocals
--noUnusedParameters`), grep lensa (debug leftovers, flag-emoji doubling, DOM
nesting), plus a headless-Chromium sweep (7 routes, popup edge probes, region
rail probe, SPA navigation, 0-console-error gate).

Found and fixed (all real, verified in the sweep):
- [x] **Popup clipped on grid edge columns & slid under the navbar on the top
      row** — placement is now measured at open time: centered on the card,
      clamped into the viewport horizontally, flipping below the card when
      above has no room. Probe results: first col left=59, last col
      right=1382 (both inside a 1440 viewport; the old CSS put the right
      column's panel at ~68px off-screen on mobile widths).
- [x] **Popup painted UNDER the next tile row** — each transformed
      `motion.article` is its own stacking context, so the panel's z-30 was
      local to the card; hovered cards now lift (`hover:z-40`).
- [x] **"Open details" double-pushed history** — the card's onClick fired
      after the link's navigation; stopPropagation on the link.
- [x] **Region still doubled in three places** — the rail chips (flag emoji
      inside the badge + code beneath it read "ID / ID" on Windows), the
      region dropdown rows, and the detail "Available in" heading. One
      identifier per surface now; names live in tooltips/aria-labels.
- [x] **Preview pause/title chrome dimmed by hover gradients** — DOM order
      painted TrailerHover beneath the gradient at every call site; gradient
      renders first now (home rails + grid, category, search, detail rails).
- [x] **Category grid had no detail popup** (parity gap) and its old
      Link-wrapping would have nested anchors once the popup was added —
      converted to a `role=link` tile with SPA navigate + keyboard handler.
- [x] **latinAltOf missed third-country romanizations** — some TMDB titles
      only carry a Latin alt title from another country; falls back now.
- [x] **strict tsc failures** — dead `React` import (main.tsx), dead
      `WatchButton` import (WatchlistPage).
- [x] **Stale doc comments** — drama presets described a genre-AND that the
      code does not send; TrailerHover said "top-left" where the glyph sits
      bottom-left. Comments now match behavior.

Gate: strict tsc clean · build green · dragtest 9/9 · sweep 0 console errors.
Commit: c7b3fcf1.

## Feature pass 5 — drama presets, age filter, latin titles, navbar/chrome fixes (2026-10-17)

Request: "filter platform netflix/prime/viu/wetv/bstation · Sinetron drakor dracin · fitur search
masih ketutup ga responsif · Navbar nya jelek nempel di div bukan body · Nama lain dari judul
film ada yang bahasa korea cina buatkan judul versi latin · Preview ada pause + judul + popup
detail di card · Ketika card di zoom judul film tertutup · Filter 18+ dan all age · Filter
region lock tertulis double untuk id (cukup 1)."

Method: every claim was first reproduced or refuted in a live headless Chromium against the dev
server AND against the TMDB API itself (certification lists, discover shapes, alternative_titles,
region provider catalogs). Nothing was implemented from the report text alone.

Plan (1 line per step + files touched):
- [x] 1. `src/utils/discover.ts` — `originCountries` (`with_origin_country`, OR'd) +
      `ageBand` ('all' → US cert lte PG-13/TV-PG, 'adult' → gte R/TV-MA). TMDB's `adult`
      flag is false on EVERY discover result (verified live), so certifications are the only
      working 18+ constraint; both shapes return 19k/12k titles on the live API.
- [x] 2. `src/App.tsx` + `src/pages/CategoryPage.tsx` — Drama presets Sinetron (ID) /
      Drakor (KR) / Dracin (CN) as a new URL dimension (`?drama=`), single-select, implies
      Type=tv; Age Rating pills (All Ages / 18+ / Any) ride the existing discover-filter
      writer; both reset cleanly with category/platform/reset-all.
- [x] 3. `src/components/DiscoverFilterSections.tsx` — Age Rating section (shared renderer,
      so home and category can never drift).
- [x] 4. `src/utils/providers.ts` — FEATURED_ORDER gains Viu/WeTV/Bstation/Bilibili/iQIYI/
      Viki/Crunchyroll/iflix + case-insensitive name matching (TMDB spells the same service
      'VIU' vs 'Viu' per region, and the case-sensitive lookup silently dropped the pill).
      Bstation is absent from TMDB's ID catalog (verified) — it appears only where the
      provider actually exists; the pills always follow the region's real catalog.
- [x] 5. `src/components/Navbar.tsx` — search debounce 400→250ms, and a settled zero-result
      query now keeps the panel open with a real "No title matches … Press Enter" message
      instead of silently closing (the "search ketutup / ga responsif" report).
- [x] 6. `src/components/Navbar.tsx` — navbar is `fixed` + full-bleed (outside the
      `max-w-[1400px]` page container, with a body-level spacer): the bar and its border
      now span the whole body instead of stopping at the content gutters ("nempel di div").
- [x] 7. Flag-emoji doubling — Windows Chromium has no color flag font, so 🇮🇩 painted as
      the letters "ID" next to the code "ID" (the "region lock dobel" report). `Navbar`
      region button, `RegionFlagRail` chip and `AvailabilityModal` rows now carry the code
      or the name alone; flags stay where a name disambiguates them.
- [x] 8. `src/pages/MovieDetailPage.tsx` — LATIN title line: `alternative_titles` is fetched
      per title; when the original title is Hangul/Hanzi/Kana (regex-detected), the
      romanized entry (TMDB type "Revised romanization" or any Latin alt from the origin
      country) renders under a "Latin" label, and the original script under "Original".
      Squid Game → Latin "Ojingeo Geim" / Original 오징어 게임 (verified live). Titles with
      no recorded romanization just show the original line.
- [x] 9. `src/pages/MovieDetailPage.tsx` — US age badge from `release_dates` /
      `content_ratings`: R/NC-17/TV-MA render a red "18+", other certs render neutral.
- [x] 10. `src/components/TrailerHover.tsx` — while a preview plays, a pause glyph
      (bottom-left) and the title bar (top) paint above the video, so the preview states
      what it is. (Both only render while the video does.)
- [x] 11. `src/components/CardDetailPopup.tsx` (new) + home/search grids — hover popup
      (desktop) with rating, year, genres, synopsis and an "Open details" link, fed from
      data the grid already holds (zero extra requests), opening after a 300ms rest.
- [x] 12. Caption clipping ("judul tertutup saat zoom") — grid captions moved OUT of the
      `overflow-hidden` poster box (they used to sit inside it and were cropped by the
      card's hover-scale); they now grow the card instead. Home + search grids.
- [x] 13. `src/components/ImageWithFallback.tsx` — React 18 warns on `fetchPriority`
      (camelCase); the DOM attribute is now passed lowercase, killing the console warning
      the sweep surfaced.
- [x] 14. Verify — all green in this pass:
      `tsc --noEmit` clean · `npm run build` green (11 chunks) · `npm run test:drag` 9/9 ·
      headless desktop (1440) + mobile (390) sweeps: navbar full-bleed (1434/1440 = scrollbar
      only), region pill reads "ID" once, filter panel shows Category/Genre/Year/Rating/
      Runtime/Age Rating/Platform/Drama/Type, Drakor pill → grid of Korean dramas (URL
      `?drama=drakor&type=tv`), +18+ → mature KDramas (`&age=adult`), card popup opens with
      rating/genre/synopsis, hover preview shows pause + title chrome, empty search keeps its
      panel open with the Enter hint, 0 console errors on every sweep.

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

## Feature pass 4 — filter loading-first (server-side filters) + PWA self-update (2026-10-16)

Request: "perbaiki bug yang dimana saat filter dijalankan langsung menampilkan contohnya anime
padahal masih mengambil data, jadi buatkan agar loading aja dulu hingga terkumpul data cukup
untuk 1 page lalu tampilkan. terapkan ke semua filter dan tampilan karena datanya tertulis 20
tapi ketika saya liat hanya 19 yang tampil dan bahkan kadang sampai tak ada sama sekali" +
"buatkan agar saya update website nya maka pwa nya juga ikut terupdate".

Root cause (read in source before writing):
- Genre + Type/Anime are **client-side** filters over one TMDB page (20 movie + 20 tv). They
  cut the page down to a handful — often 0 — while the label kept promising a full page. Anime
  is the worst case: `Animation + ja` is ~1 per 40 items, so "Anime" showed 0-2 tiles.
- `placeholderData: keepPreviousData` on App/Category/Search keeps rendering the OLD page while
  the new one loads, so a filter change showed stale (wrong-filter) tiles instead of loading.
- `App` page 1 hides `filteredMovies[0]` behind the hero, so the label said N while the grid
  showed N-1 — the reported "tertulis 20 tapi hanya 19 tampil".
- `public/sw.js` registers with default `updateViaCache`, is never re-checked while a tab is
  open, and nothing reloads the live tab after a deploy → an installed PWA kept the old bundle.

Plan (1 line per step + files touched):
- [x] 1. `src/utils/discover.ts` — server-side filter surface: `media: 'movie'|'tv'|'both'`
      (one or both /discover kinds), `genreIds` (OR, `with_genres=a|b`), `animeOnly`
      (`with_genres=16` + `with_original_language=ja`), plus the existing year/rating/runtime;
      `fetchDiscoverPage` slices each kind's page to a fixed GRID_PAGE_SIZE view and reports
      `totalPages` so one view is always a full, correctly-filtered page. `heroSlot` asks for
      one extra title on a hero view. New `fetchCuratedPage` merges a curated movie+tv pair to
      the same shape, so an unfiltered view keeps its real feed (Trending ≠ popularity.desc).
- [x] 2. `src/pages/CategoryPage.tsx` — Type/Genre become query-key inputs and go server-side;
      drop client filtering + the client now_playing re-sort; drop `keepPreviousData`; grid count
      = what the grid renders; empty state + `isFetching` gate; unfiltered categories restored to
      their real curated endpoints via `fetchCuratedPage` + the same `useDiscover` gate as home
- [x] 3. `src/App.tsx` — same server-side path for the home grid (media from Type, genres,
      animeOnly); drop `keepPreviousData`; hero keeps `filteredMovies[0]` but the results line
      counts the grid and says `+ featured`, so the number never over-promises; default Type is
      now `all` (the old `movie` default was itself client-filtering the merged page in half)
- [x] 4. `src/pages/SearchPage.tsx` — drop `keepPreviousData`; Type pills pick the kind-specific
      `/search/movie|tv` endpoint instead of client-filtering `/search/multi` (which interleaves
      people and left ~8 tiles); page resets to 1 on a pill change; grid + empty state gated on
      the query having settled so "No results" cannot flash mid-fetch
- [x] 5. `src/utils/pwaUpdate.ts` (new) + `src/main.tsx` — PWA self-update:
      `register('/sw.js', { updateViaCache: 'none' })`, poll `registration.update()` (60 s + on
      `visibilitychange`/`online`), compare the running `/assets/js` entry hash against a
      no-store `/index.html` fetch to catch a deploy where `sw.js` itself did not change,
      reload once on `controllerchange`; never reloads while the tab is hidden and never on the
      first install
- [x] 6. `public/_headers` + `public/sw.js` — `Cache-Control: no-cache` for `/`, `/index.html`,
      `/sw.js`, `/site.webmanifest` so the update check is never answered from the HTTP cache;
      `SHELL_CACHE` bumped `saranin-shell-v1` → `v2` (and `/index.html` added to SHELL_ASSETS)
      so `activate()` purges an old shell instead of serving it
- [x] 7. Verify — all green in this pass:
      `node --check public/sw.js` clean · `npx tsc --noEmit` clean (TSC_CLEAN) ·
      `npm run build` green, 523 modules → `dist` · `vite preview` on :4173 ·
      headless sweep `.scratch/filter-sweep.mjs`, **31 checks, 0 failed**: 23 views
      (home/category/search/watchlist × default, genre, type, anime, year+rating+runtime, page 2,
      no-results) each settle with **tile count == printed label** and **0 console errors,
      0 poster failures**; 4 filter-click cases with the API blocked mid-flight stay at
      **0 tiles / 20 skeletons** (the exact regression — stale tiles from the old filter);
      4 same cases resolved to a full page with a matching label · PWA deploy test
      `.scratch/pwa-deploy-test.mjs`, **5/5**: v1 installs and controls the page; a deploy whose
      `sw.js` is byte-identical but whose bundle hash changed reloads onto the new entry; a deploy
      that bumps `sw.js` reloads and purges the old shell cache (caches = `saranin-shell-v3` +
      `saranin-img-v1` only); a first-ever visit does **not** reload

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

