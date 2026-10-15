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
- [ ] 13. Verify: `tsc --noEmit`, `vite build`, headless run of every route, 0 console errors
      — BLOCKED: the safety classifier for shell tools (`oc/mimo-v2.6-flash-free`) was down
      for the whole session, so no command could run. Static verification done instead:
      every edited file re-read end to end, import contracts cross-checked against exports,
      Tailwind `!`-prefix claim settled by grepping the shipped `tailwindcss/dist/lib.mjs`
      (`startsWith("!")` = 0 hits, `endsWith("!")` = 2 hits).
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
- [ ] 12. Verify: `tsc --noEmit`, `vite build`, dragtest harness, 0 console errors
      — BLOCKED: the safety classifier (`oc/mimo-v2.6-flash-free`) is still down, every
      Bash call is refused before it runs. Static verification done instead: every edited
      file re-read end to end, query-key dimensions cross-checked (locale + year/rating/
      runtime present in every key that consumes them), ImageWithFallback `sizes` gating
      verified against every call site via grep (0 call sites without `sizes`).
      Retry the three commands when the classifier recovers.
