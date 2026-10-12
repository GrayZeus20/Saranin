# Tasks

## Platform filter on CategoryPage (2026-10-12)

Request: "tambahkan filter platform seperti netflix, prime" on the category page.

Problem: home already has a real Platform filter (region catalog + server-side /discover). The
CategoryPage still builds its Platform pills from providers found on the currently-loaded 20 items,
so Netflix/Prime are often absent, and picking one client-filters down to an empty grid.

Approach (reuse-first): lift the home platform machinery into one shared module, call it from both.

Plan:
- [x] 1. `src/utils/discover.ts` (new) — shared `fetchDiscoverPage(sort, region, provider, page)`
       + `CATEGORY_SORT`; home + category both call it (no duplicate logic)
- [x] 2. `src/App.tsx` — replace its local `fetchDiscoverPage` / `CATEGORY_SORT` with the shared module
- [x] 3. `src/pages/CategoryPage.tsx` — Platform section from `getRegionProviders('ID')` catalog
       (Netflix / Prime first + "All"), single-select `activePlatform`; when set, fetch
       `/discover/movie|tv` via the shared module instead of client-filtering the loaded page
- [x] 4. Verify: tsc, build, browser (Netflix -> distinct titles; "All" resets; existing
       provider pills removed; pagination still moves)

### Proof (2026-10-12)
- `npx tsc --noEmit` → exit 0 ; `npm run build` → 505 modules, built in 5.12s, exit 0
- `[CLAIM] category platform catalog — [PROOF] /category/popular: 49 pills, first = All / Netflix /
  Amazon Prime Video / HBO Max / Vidio (pre-fix: ~6 pills derived from the loaded 20 titles,
  Netflix/Prime usually absent)`
- `[CLAIM] category Netflix filter is server-side — [PROOF]`:
  `https://api.themoviedb.org/3/discover/movie?language=en-US&page=1&watch_region=ID&with_watch_providers=8&with_watch_monetization_types=flatrate&sort_by=popularity.desc`
  grid: The Mongoose/Animals/Other Mommy → Animals/Reporting Live/Doing Life/UNABOMBER (1223ms)
- `[CLAIM] category "All" resets — [PROOF] back to The Mongoose/Animals/Other Mommy in 401ms`
- `[CLAIM] home unregressed — [PROOF] hero "Animals", 19 cards, 49 pills, Netflix/Prime first`
- `[CLAIM] 0 console errors — [PROOF] /category/popular + / → 0 error messages`

## Deep-scan bug sweep (2026-10-12)

Bugs found by reading every source file + live API/curl probes:

1. `src/components/Navbar.tsx` — search dropdown maps TV results with `title`/`release_date` only.
   TMDB `/search/multi` sends `name`/`first_air_date` for TV, so TV rows show a blank title and
   no year. Also duplicates rows across media types and shows `results.length` in the
   "See all results" count instead of the true total.
2. `src/App.tsx` — now_playing grid client-sort uses `new Date(str).getTime()`; an ISO date-only
   string parses as UTC midnight, shifting the displayed order by timezone. Replace with lexical
   compare (ISO strings sort chronologically).
3. `src/App.tsx` — ambient glow uses `radial-gradient(..., url(...) 0%, ...)`; `url()` is invalid
   as a gradient color stop, so that layer never paints.
4. `src/App.tsx` — platform-filtered `/discover/tv` is sent `sort_by=primary_release_date.desc`
   (a movie-only sort). TMDB silently ignores it and the TV half of the grid returns in default
   order. Needs per-kind sort.
5. `src/utils/api.ts` — `throttledFetch` retries a 429 but does not special-case 4xx; a 404/401
   propagates fine, but a caller-supplied `AbortSignal` abort is retried by react-query. Also
   request dedupe was missing.
6. `src/pages/CategoryPage.tsx` — anime TV shows (Animation genre + `ja`, e.g. One Piece) appear
   under BOTH "TV Series" and "Anime". TV Series should exclude anime.
7. `src/pages/CompanyDetailPage.tsx` — `/discover/movie|tv?with_companies=` returns only page 1;
   large studios (Warner Bros., Marvel) silently show ~20 of hundreds of titles.
8. `public/_headers` — production CSP `style-src 'self' 'unsafe-inline'` omits
   `https://fonts.googleapis.com`, which `index.html` loads its stylesheet from. Production blocks
   the font CSS (dev CSP already allows it).

Found but NOT fixed in this pass (needs call):
9. `functions/` — `functions/api.ts` imports `elysia` (not in package.json; not installed) and
   nothing calls `/api`; the whole dir is dead. Cloudflare Pages auto-detects `functions/` and may
   fail its Functions build on the missing dep. Recommend delete.

Plan:
- [x] 1. Navbar — normalize search/multi (name→title, first_air_date→release_date), dedupe by
       media_type+id, use `total_results` for the count
- [x] 2. App — lexical ISO date sort for the now_playing grid
- [x] 3. App — fix ambient glow to a valid backdrop backdrop layer
- [x] 4. App + CategoryPage — per-kind discover sort; TV excludes anime (without_genres=16)
- [x] 5. api.ts — request dedupe, http-error classification, no retry on abort
- [x] 6. CompanyDetail — paginate company credits (fixes truncated studios)
- [x] 7. public/_headers — add fonts.googleapis.com to style-src
- [x] 8. Untrack build.log / build-output.txt / saranin-page.png, add to .gitignore
- [x] 9. Verify: tsc, build, browser

### Proof (2026-10-12)
- `npx tsc --noEmit` → exit 0
- `npm run build` → 505 modules, built in 5.80s, exit 0
- Ambient layer — `[PROOF]` home: `div.fixed img[alt=""]` present, computed `filter` contains `blur`
  (was: `radial-gradient(..., url(...))` which painted nothing)
- Genre/Type grid changed — `[PROOF]` CategoryPage trending after fix:
  `TV Series → 14`, `Anime → 6`, `All → 40`. 14 + 6 = 20 = the full TV set, so anime is no longer
  double-counted (pre-fix TV Series read the full 20 including the 6 anime).
- CompanyDetail — `[PROOF]` `/company/420` (Marvel Studios): `138 titles`, 138 cards rendered
  (pre-fix: single page = ~20 per kind).
- Navbar dropdown — `[PROOF]` `/search/multi?query=one piece`: 8 rows, every row has a non-empty
  title; TV rows show `One Piece 📺 TV 1999` / `ONE PIECE 📺 TV 2023` (name→title works).
- 0 console errors on home / category / company / search.

### Not fixed (needs call)
- `functions/` imports `elysia` (not in package.json, not installed) and nothing calls `/api`.
  Dead + a Cloudflare Pages build risk. Recommend: `git rm -r functions`.

## Home pagination fix + search page (2026-10-12)

Root causes found in deep scan:
1. Home grid reads only `nowPlaying` query (2 pages = 40 items) while infinite scroll appends to
   a `movies` array the grid never renders -> `totalPages === 2`, Next disabled on page 2 ("nyangkut").
2. Feature item is pulled out of `filteredMovies` on every page but the hero only renders on page 1 ->
   pages 2+ silently lose one item.
3. 12 stale tsc-emitted `.js` files live next to the `.tsx` sources. Vite resolve order prefers `.js`,
   so dev/prod can serve compiled output instead of the edited `.tsx`.
4. Provider filter only worked because the app held every fetched item in memory (bulk provider fetch).

Plan:
- [x] 1. Delete stale compiled `.js` duplicates in `src/` (`git rm`)
- [x] 2. `tsconfig.json` -> `noEmit: true` (tsc emits next to source otherwise)
- [x] 3. `src/utils/tmdb.ts` — shared `normalizeMovie` / `normalizeTv` (was duplicated in App + CategoryPage)
- [x] 4. `src/App.tsx` — grid fetches ONE TMDB page per view (movies + TV for active category);
       Prev / Next only, page numbers removed; infinite scroll deleted; dead `nowPlaying` / `tvOnAir`
       queries and bulk provider fetch removed; per-page progressive provider fetch with cache
- [x] 5. `src/pages/CategoryPage.tsx` — use shared normalizers
- [x] 6. `src/pages/SearchPage.tsx` — new `/search?q=` page (multi search, type filter, Prev / Next)
- [x] 7. `src/main.tsx` — register `/search` route
- [x] 8. `src/components/Navbar.tsx` — Enter key + "See all results" go to `/search?q=`
- [x] 9. Verify: `npx tsc --noEmit`, `npm run build`, browser run (Next -> page 2 content, search flow)

## Home platform filter (Netflix / Prime / …) — 2026-10-12

Problem: the home Platform pills were built from `availableProviders` = providers found on the
currently loaded 20 items only. Picking one filtered client-side and emptied the grid (Apple TV -> 0).

Fix: real server-side platform filtering + a fixed "All" default.
- [x] 1. `src/App.tsx` — platform list from TMDB `/watch/providers/movie?watch_region=ID` (cached),
       curated priority (Netflix, Prime Video, Disney+, Apple TV+, Max, …) + "All" first
- [x] 2. `src/App.tsx` — when a platform is picked, fetch `/discover/movie|tv` with
       `with_watch_providers` + `watch_region` + `sort_by` (category-derived), paginated
- [x] 3. `src/App.tsx` — single-select `activePlatform`; drop per-title provider hydration
       (no longer needed on home); client-side filter keeps genre + type
- [x] 4. Verify: tsc, build, browser (All default, Netflix -> distinct titles, paginate, back to All)

## Proof (2026-10-12)
- tsc --noEmit: exit 0
- npm run build: 505 modules, built in 4.64s, exit 0
- Browser: Platform bar renders 40 providers, "All" active by default; Netflix -> discover
  `with_watch_providers=8`, grid swaps to Netflix catalog; Platform "All" -> grid resets to
  unfiltered Now Playing in 308ms; 0 console errors.
