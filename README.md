# SARANIN.

Katalog film & TV berbasis **React 18 + Vite 4 + TypeScript**, data dari [TMDB API v3](https://developer.themoviedb.org/docs).
Halaman: trending / now playing / popular / top rated, pencarian multi (`/search?q=`), detail film-TV
(+ trailer, watch providers, cast, similar), detail orang (filmografi), detail studio, dan penelusuran
per genre/platform. Filter platform (Netflix, Prime Video, …) dikerjakan **server-side** lewat
`/discover` dengan `with_watch_providers` + `watch_region`, bukan difilter di klien.

## Kebutuhan

- Node.js 20 atau lebih baru
- Token TMDB **API Read Access Token** (v4) — https://www.themoviedb.org/settings/api

## Menjalankan lokal

```bash
git clone https://github.com/GrayZeus20/Saranin.git
cd Saranin
npm ci
# buat file .env berisi satu baris: VITE_TMDB_TOKEN=<token-kamu>
npm run dev                 # http://localhost:5173
```

## Environment

Hanya satu variabel, dan nilainya di-inject ke bundle saat build — jadi token ini **publik by design**
(TMDB read token memang dipakai dari klien). Jangan pernah taruh secret lain di sini.

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `VITE_TMDB_TOKEN` | ya | Bearer token TMDB v3/v4 read access. Tanpa ini setiap request 401 dan konsol mencetak `[tmdb] VITE_TMDB_TOKEN is missing`. |

## Skrip

```bash
npm run dev        # dev server + security headers (lihat vite.config.js)
npm run build      # tsc lalu vite build -> dist/
npm run preview    # serve hasil build
npm run test:drag  # test drag rail di headless Chromium 390x844 (9 check)
npx tsc --noEmit   # type-check saja (tsconfig noEmit: true)
```

Build menjalankan `tsc` lebih dulu, jadi type error menggagalkan build — bukan sekadar warning.

`npm run test:drag` menjalankan `scripts/dragtest/run.mjs`: boot dev server untuk harness,
luncurkan Chromium headless (Playwright cache / Chrome / Edge), lalu kirim mouse asli lewat
DevTools Protocol dan assert: drag menggeser `scrollLeft`, klik yang mengakhiri drag ditelan,
tap biasa tetap membuka kartu, `ArrowRight` memindah rail, rail yang tidak overflow mematikan
panah, `pointercancel` membersihkan state drag, dan 0 console error. Exit code 1 kalau ada
yang gagal. Tanpa framework — Node 20+ saja.

## Struktur

| Path | Isi |
|------|-----|
| `src/main.tsx` | entry: router, react-query client, ErrorBoundary, `MotionConfig reducedMotion="user"` |
| `src/App.tsx` | beranda: hero, rail horizontal, grid berpaginasi, filter genre/tipe/platform |
| `src/components/ScrollRow.tsx` | satu rail horizontal bersama (drag mouse/pen, pan native di touch, snap di pointer kasar, panah md+, fade tepi, keyboard) |
| `src/components/Navbar.tsx` | nav sticky + pencarian (satu renderer `SearchField`/`SearchPanel` untuk desktop & mobile) |
| `src/utils/api.ts` | `fetchWithRateLimit`: semaphore 6 konkuren, pacing 120 ms, dedupe in-flight, 429 retry, `HttpError` |
| `src/utils/discover.ts` | pembungkus `/discover` + `CATEGORY_SORT` bersama rumah & kategori |
| `src/utils/tmdb.ts` | `normalizeMovie` / `normalizeTv` |
| `src/index.css` | token `@theme`, helper safe-area, gaya `.scroll-row`, blok `prefers-reduced-motion` |
| `scripts/dragtest/` | test drag rail headless-Chromium (`npm run test:drag`) |
| `public/_headers` | header keamanan + CSP produksi (Cloudflare Pages) |
| `public/site.webmanifest` | manifest PWA |

## Catatan teknis

- **Rate limit TMDB.** Semua request lewat `fetchWithRateLimit`. Batas 6 request bersamaan, jeda mulai
  minimum 120 ms, URL GET identik yang masih in-flight dibagi satu promise. Jangan panggil `fetch()`
  langsung ke TMDB — lewati helper ini.
- **Rail horizontal.** Di perangkat sentuh perilaku pan dan momentum dibiarkan native (tidak ada
  `touch-action` yang dibajak); drag pointer hanya dipasang untuk mouse/pen, dan klik yang mengakhiri
  drag ditelan di fase capture supaya swipe tidak membuka kartu. Kontrol panah hanya dirender di
  `min-width: 768px` — di layar kecil panah tak terlihat tetap bisa mencuri tap.
- **Paginasi.** Grid beranda dan halaman kategori mengambil **satu halaman TMDB per view** (bukan
  infinite scroll); angka halaman dihitung dari `total_pages` respons.
- **Anime.** `TV` selalu mengecualikan anime (`Animation` + bahasa `ja`) di beranda, kategori, dan
  halaman pencarian, supaya tidak dobel dengan tab `Anime`.

## Deployment (Cloudflare Pages)

- Build command: `npm run build` · output dir: `dist`
- Set `VITE_TMDB_TOKEN` di environment produksi
- `public/_headers` mengirim CSP produksi; kalau menambah origin baru (font, gambar, embed) tambahkan
  ke direktif yang sesuai di `_headers` **dan** di plugin `securityHeaders()` pada `vite.config.js`,
  kalau tidak dev dan produksi akan berbeda perilaku.
- Jangan menaruh direktori `functions/` di repo ini kecuali memang memakai Cloudflare Pages Functions —
  Pages mendeteksinya otomatis dan build Functions akan gagal bila dependensinya tidak lengkap.

## Lisensi

MIT
