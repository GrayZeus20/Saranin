# Tasks

## Mobile UX pass: drag-scroll rails + mobile hardening (2026-10-15)

Request: "deepscan + bikin user friendly untuk mobile, scroll ke kanan bisa digeser dengan drag".
Approved scope: A (drag rails) + B (mobile polish) + C (real bugs) + D (dead-code cleanup + README).

Root cause of "gak bisa digeser": the row-aligned arrow buttons are `opacity-0` with no
`pointer-events-none`, so on touch they are invisible but still capture every tap at both edges;
no mouse drag, no snap, no edge affordance, no overscroll containment.

Plan:
- [x] 1. `src/components/ScrollRow.tsx` (new) — one drag-scroll rail: native touch pan untouched,
       pointer drag for mouse/pen, drag-guard on click, persistent md+ arrows, edge fade,
       snap on coarse pointers only, keyboard arrows, `overscroll-behavior-x: contain`
- [x] 2. `src/index.css` — `.scroll-row` styles, `.safe-top`/`.safe-bottom`, reduced-motion block
- [x] 3. `src/App.tsx` — `HorizontalSection` -> `ScrollRow`; row queries get a real error/empty
       state instead of an endless skeleton
- [x] 4. `src/pages/MovieDetailPage.tsx` — cast + similar -> `ScrollRow`; watch/providers actually
       requested; trailer behind a click-to-play facade
- [x] 5. `src/pages/CategoryPage.tsx`, `src/pages/SearchPage.tsx` — 44px pills; SearchPage "TV"
       excludes anime so it matches App/CategoryPage
- [x] 6. `src/pages/PersonDetailPage.tsx` — `also_known_as` guard; filmography reveals in pages
- [x] 7. `src/pages/CompanyDetailPage.tsx` — media_type-aware React key
- [x] 8. `src/components/Navbar.tsx` — sticky wrapper keeps mobile search bar under the nav;
       desktop/mobile dropdown markup deduped
- [x] 9. `src/utils/api.ts` — settle the dedupe map without an unhandled rejection
- [x] 10. `src/main.tsx` — `MotionConfig reducedMotion="user"`
- [x] 11. `index.html` / `public/site.webmanifest` — viewport-fit, manifest + icon links,
       theme-color unified with `--color-surface`
- [x] 12. `git rm` `src/Modal.tsx`, `functions/`, `public/index.php`, `public/.htaccess`
- [x] 13. `README.md` — rewrite for the actual stack (React 18 + Vite + Cloudflare Pages)
- [x] 14. Verify: tsc, build, Playwright 390x844 drag test, 0 console errors

### Proof (2026-10-15)
- `tsc --noEmit` → exit 0 (run via `.scratch/verify.config.js` tunnel: `[verify] tsc -> exit=0`)
- `vite build` → 507 modules, built in 4.47s, exit 0
- Headless-Chromium drag test, 390x844, real CDP mouse input, **9/9 checks**:
  `dragMovedPx 180` (0→180), `dragSwallowedClick true`, `tapStillClicks true`,
  `keyboardPagedPx 299`, `fitsNoOverflow true`, `fitsArrowsDisabled true`,
  `cancelClearedDragState true`, `isDraggingClassCleared true`, `consoleErrors []`
- Runnable: `npm run test:drag` (headless, no framework — `scripts/dragtest/`)

### Not in this pass (needs a separate call)
- Laravel shell still tracked: `app/`, `resources/`, `storage/`, `.github/workflows/ci.yml`
  (its PHP job runs `composer install` with no `composer.json` -> always red), plus a 0-byte
  `public/favicon.ico`.

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

## Cleanup pass: buang sisa + data testing (2026-10-15)

Request: "hapus sisa yang tak terpakai dan data testing serta data example yang tidak digunakan".
Tiap penghapusan diverifikasi dulu (grep/glob) tidak ada referensi dari `src/`.

- [x] `app/`, `resources/`, `storage/` — shell Laravel; tidak di-import `src/` (mati sejak migrasi Vite/CF)
- [x] `.inverse/` — konfigurasi pipeline agent; tool tidak terpasang (tanpa CLI/extension/`~/.inverse`)
- [x] `public/favicon.ico` (0 byte, tak dirujuk — index.html pakai `favicon.svg`), `public/img/no-poster.svg`
      (hanya dipakai blade yang dihapus)
- [x] Orphan worktree `.claude/worktrees/agent-a3f07c715b162237f/` + `git worktree prune` +
      branch `worktree-agent-…` (dihapus hanya bila sudah merged ke main)
- [x] Data testing: `.playwright-mcp/`, `saranin-page.png`, `build.log`, `build-output.txt`, `.scratch/`
- [x] `.github/workflows/ci.yml` — job PHP dihapus (selalu merah: `composer install` tanpa
      `composer.json`); job Node `npm ci && npm run build` tetap
- [x] `.editorconfig` / `.gitattributes` / `.gitignore` — aturan Laravel dibuang, duplikat dibersihkan
- [x] `README.md` — URL clone benar (Saranin, bukan Movieflix), cara bikin `.env` (`.env.example`
      tidak ada), dokumentasi `npm run test:drag`
- [x] `git remote remove composer` — sisa laravel/laravel (re-add: `git remote add composer
      https://github.com/laravel/laravel.git`)
- [x] Verify: purge jalan → `tsc --noEmit` exit 0 + `vite build` hijau (bukti 0 referensi file terhapus)

### Proof (2026-10-15)
- Purge: `app/`, `resources/`, `storage/`, `.inverse/` (80 file staged `D`), `public/favicon.ico`,
  `public/img/no-poster.svg` (dir ikut hilang), `build.log`, `build-output.txt`,
  `saranin-page.png`, `.playwright-mcp/` — semua `gone` di existence check
- Worktree: prune membersihkan registrasi + `git branch -d worktree-agent-a3f07c715b162237f`
  (merged, tip `46845051`); `git worktree list` → cuma main; `git remote remove composer` →
  tinggal `origin`
- `[CLAIM] 0 referensi file terhapus — [PROOF] grep src/: `laravel|blade|artisan|composer|no-poster|favicon\.ico|inverse` → 0 hit`
- `[CLAIM] tsc --noEmit — [PROOF]: [typecheck] tsc exit=0`
- `[CLAIM] build hijau — [PROOF]: ✓ 507 modules transformed, built in 4.45s, exit 0`
- `[CLAIM] worktree bersih — [PROOF]: git worktree list → C:/laragon/www/Saranin [main]`
