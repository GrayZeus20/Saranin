# MovieFlix

Katalog film berbasis Laravel 13 + Blade yang mengambil data dari [TMDB API](https://developer.themoviedb.org/docs).
Menampilkan film trending, populer, top rated, jadwal rilis, pencarian, penelusuran per genre/platform,
serta watchlist yang disimpan di browser (localStorage).

## Kebutuhan

- PHP 8.3+ dengan ekstensi `dom`, `curl`, `mbstring`, `zip`, `sqlite3`, `intl`
- Composer 2
- Node.js 22+ (untuk membangun aset Vite)
- Token TMDB (API Read Access Token) dari https://www.themoviedb.org/settings/api

## Menjalankan secara lokal

```bash
git clone https://github.com/GrayZeus20/Movieflix.git
cd Movieflix

composer install
cp .env.example .env
php artisan key:generate
# isi TMDB_API_TOKEN di .env

npm ci
npm run build

php artisan serve
```

## Konfigurasi

Semua nilai rahasia hanya dibaca dari environment — tidak ada default yang di-commit.

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `APP_KEY` | ya | `php artisan key:generate` |
| `APP_URL` | ya | dipakai untuk membuat URL absolut; HTTPS dipaksa saat `APP_ENV=production` |
| `TMDB_API_TOKEN` | ya | Bearer token TMDB v4 |
| `TMDB_BASE_URL` | tidak | default `https://api.themoviedb.org/3` |
| `TMDB_IMAGE_URL` | tidak | default `https://image.tmdb.org/t/p` |
| `CACHE_STORE` | disarankan | gunakan store persisten (redis/memcached/database) di produksi |

Respons TMDB di-cache 1 jam. Dengan `CACHE_STORE=array` (default) cache hanya hidup selama satu request,
sehingga setiap kunjungan halaman memicu panggilan TMDB baru — di produksi sebaiknya pakai Redis.

## Testing & lint

```bash
php artisan test        # seluruh test, TMDB di-fake (tidak ada request keluar)
vendor/bin/pint --test  # cek gaya penulisan kode
npm run build           # pastikan aset frontend bisa dibangun
```

## Struktur singkat

| Path | Isi |
|------|-----|
| `app/Services/TmdbService.php` | seluruh pemanggilan TMDB + caching |
| `app/Http/Controllers/` | satu controller per bagian (home, movie, genre, platform, search, person, calendar, stats) |
| `resources/views/` | layout, partial kartu film, dan halaman Blade |
| `routes/web.php` | seluruh rute aplikasi |
| `api/index.php` | entry point untuk runtime PHP di Vercel |

## Deployment (Vercel)

Konfigurasi ada di `vercel.json` (runtime `vercel-php`, seluruh request diarahkan ke `api/index.php`).
Set `APP_KEY`, `APP_URL`, `TMDB_API_TOKEN`, dan `CACHE_STORE` di dashboard Vercel sebelum deploy.

## Lisensi

MIT
