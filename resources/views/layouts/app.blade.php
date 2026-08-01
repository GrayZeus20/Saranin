<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'MovieFlix') - MovieFlix</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Righteous&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: '#1E1B4B',
                        secondary: '#4338CA',
                        accent: '#22C55E',
                        background: 'var(--color-bg-dark)',
                        foreground: 'var(--color-text-primary)',
                        muted: 'var(--color-bg-surface)',
                        border: '#312E81',
                        destructive: '#EF4444',
                        dark: {
                            100: 'var(--color-bg-card)',
                            200: 'var(--color-bg-dark)',
                            300: 'var(--color-bg-surface)',
                        },
                    },
                    fontFamily: {
                        sans: ['Poppins', 'sans-serif'],
                        display: ['Righteous', 'sans-serif'],
                    },
                    textColor: {
                        white: 'var(--color-text-primary)',
                        gray: {
                            400: 'var(--color-text-secondary)',
                        },
                    },
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Poppins', sans-serif; }
        h1, h2, h3, .logo { font-family: 'Righteous', cursive; }
        [x-cloak] { display: none !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scroll-container { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: none; -ms-overflow-style: none; }
        .scroll-container::-webkit-scrollbar { display: none; }
        .loading-overlay {
            position: fixed; inset: 0; z-index: 9999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background-color: var(--color-bg-dark, #0F0F23);
            transition: opacity 0.5s;
        }
        .progress-bar {
            position: fixed; top: 0; left: 0; height: 4px; width: 0;
            background-color: #22C55E; z-index: 9999;
            transition: width 0.3s;
        }
        .skeleton { background: linear-gradient(90deg, #27273B 25%, #3a3a52 50%, #27273B 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    </style>
    @stack('styles')
</head>
<body class="bg-dark-200 text-white min-h-screen">
    {{-- LOADING OVERLAY --}}
    <div id="loader" class="loading-overlay">
        <h1 class="text-green-500 text-4xl font-bold logo mb-4">MovieFlix</h1>
        <div class="w-12 h-12 border-4 border-white/20 border-t-green-500 rounded-full animate-spin"></div>
    </div>
    
    {{-- PROGRESS BAR --}}
    <div id="progress" class="progress-bar" style="width: 0%"></div>

    {{-- NAVBAR --}}
    <nav class="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <div class="flex items-center gap-8">
                    <a href="{{ route('home') }}" class="text-green-500 font-bold text-2xl tracking-tight logo">MovieFlix</a>
                    <div class="hidden md:flex items-center gap-6 text-sm">
                        <a href="{{ route('home') }}" class="hover:text-green-500 transition-colors">Home</a>
                        <a href="{{ route('movie.trending') }}" class="hover:text-green-500 transition-colors">Trending</a>
                        <a href="{{ route('movie.popular') }}" class="hover:text-green-500 transition-colors">Popular</a>
                        <a href="{{ route('movie.topRated') }}" class="hover:text-green-500 transition-colors">Top Rated</a>
                        <a href="{{ route('platform.index') }}" class="hover:text-green-500 transition-colors">Platform</a>
                        <a href="{{ route('genre.index') }}" class="hover:text-green-500 transition-colors">Genre</a>
                        <a href="{{ route('calendar') }}" class="hover:text-green-500 transition-colors">Calendar</a>
                        <a href="{{ route('watchlist') }}" class="hover:text-green-500 transition-colors">Watchlist</a>
                        <a href="{{ route('stats') }}" class="hover:text-green-500 transition-colors">Stats</a>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <form action="{{ url(route('search', [], false)) }}" method="GET" class="relative hidden sm:block">
                        <input type="text" name="q" value="{{ request('q') }}" placeholder="Search movies..."
                            class="bg-white/10 text-white placeholder-gray-400 rounded-full px-4 py-2 pl-10 w-48 focus:w-64 transition-all focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                        <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </form>
                    <button id="theme-toggle" class="p-2 rounded-full hover:bg-white/10 transition-colors" title="Toggle theme">
                        <svg id="sun-icon" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                        </svg>
                        <svg id="moon-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                        </svg>
                    </button>
                    <button id="mobile-menu-btn" class="md:hidden p-2 rounded-full hover:bg-white/10">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        <div id="mobile-menu" class="hidden md:hidden bg-dark-200/95 backdrop-blur-sm border-t border-white/10">
            <div class="px-4 py-3 space-y-2">
                <a href="{{ route('home') }}" class="block py-2 hover:text-green-500">Home</a>
                <a href="{{ route('movie.trending') }}" class="block py-2 hover:text-green-500">Trending</a>
                <a href="{{ route('movie.popular') }}" class="block py-2 hover:text-green-500">Popular</a>
                <a href="{{ route('movie.topRated') }}" class="block py-2 hover:text-green-500">Top Rated</a>
                <a href="{{ route('platform.index') }}" class="block py-2 hover:text-green-500">Platform</a>
                <a href="{{ route('genre.index') }}" class="block py-2 hover:text-green-500">Genre</a>
                <a href="{{ route('calendar') }}" class="block py-2 hover:text-green-500">Calendar</a>
                <a href="{{ route('watchlist') }}" class="block py-2 hover:text-green-500">Watchlist</a>
                <a href="{{ route('stats') }}" class="block py-2 hover:text-green-500">Stats</a>
                <form action="{{ url(route('search', [], false)) }}" method="GET" class="pt-2">
                    <input type="text" name="q" placeholder="Search movies..." class="w-full bg-white/10 text-white placeholder-gray-400 rounded-lg px-4 py-2 text-sm">
                </form>
            </div>
        </div>
    </nav>

    {{-- MAIN CONTENT --}}
    <main class="pt-16">
        @yield('content')
    </main>

    {{-- FOOTER --}}
    <footer class="bg-black/50 mt-16 py-12 border-t border-white/10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                    <h3 class="text-green-500 font-bold text-lg mb-4 logo">MovieFlix</h3>
                    <p class="text-gray-400 text-sm">Platform rekomendasi film dan TV show terbaik. Temukan film favoritmu berdasarkan rating, trending, dan platform streaming.</p>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Browse</h4>
                    <ul class="space-y-2 text-sm text-gray-400">
                        <li><a href="{{ route('movie.trending') }}" class="hover:text-green-500">Trending</a></li>
                        <li><a href="{{ route('movie.popular') }}" class="hover:text-green-500">Popular</a></li>
                        <li><a href="{{ route('movie.topRated') }}" class="hover:text-green-500">Top Rated</a></li>
                        <li><a href="{{ route('calendar') }}" class="hover:text-green-500">Calendar</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Platform</h4>
                    <ul class="space-y-2 text-sm text-gray-400">
                        <li><a href="{{ route('platform.show', 8) }}" class="hover:text-green-500">Netflix</a></li>
                        <li><a href="{{ route('platform.show', 10) }}" class="hover:text-green-500">Amazon Prime</a></li>
                        <li><a href="{{ route('platform.show', 384) }}" class="hover:text-green-500">HBO Max</a></li>
                        <li><a href="{{ route('platform.show', 119) }}" class="hover:text-green-500">Disney+</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Info</h4>
                    <ul class="space-y-2 text-sm text-gray-400">
                        <li><a href="{{ route('stats') }}" class="hover:text-green-500">Statistics</a></li>
                        <li><a href="{{ route('genre.index') }}" class="hover:text-green-500">Genres</a></li>
                        <li><a href="{{ route('watchlist') }}" class="hover:text-green-500">My Watchlist</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-white/10 mt-8 pt-8 text-center text-gray-500 text-sm">
                <p>Powered by <a href="https://www.themoviedb.org/" target="_blank" class="text-green-500 hover:underline">TMDB</a> &copy; {{ date('Y') }} MovieFlix. Data provided by TMDB API.</p>
            </div>
        </div>
    </footer>

    {{-- KEYBOARD SHORTCUTS --}}
    <div id="shortcuts-modal" class="fixed inset-0 z-[100] hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-dark-100 rounded-2xl p-6 max-w-md w-full border border-white/10">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold">Keyboard Shortcuts</h3>
                <button onclick="document.getElementById('shortcuts-modal').classList.add('hidden')" class="text-gray-400 hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="space-y-3 text-sm">
                <div class="flex justify-between"><span class="text-gray-400">Focus search</span><kbd class="bg-white/10 px-2 py-0.5 rounded">K</kbd></div>
                <div class="flex justify-between"><span class="text-gray-400">Close modal</span><kbd class="bg-white/10 px-2 py-0.5 rounded">Esc</kbd></div>
                <div class="flex justify-between"><span class="text-gray-400">Go home</span><kbd class="bg-white/10 px-2 py-0.5 rounded">H</kbd></div>
                <div class="flex justify-between"><span class="text-gray-400">Toggle theme</span><kbd class="bg-white/10 px-2 py-0.5 rounded">D</kbd></div>
                <div class="flex justify-between"><span class="text-gray-400">Show shortcuts</span><kbd class="bg-white/10 px-2 py-0.5 rounded">?</kbd></div>
            </div>
        </div>
    </div>

    <script>
        // Theme Toggle
        const html = document.documentElement;
        const themeToggle = document.getElementById('theme-toggle');
        const sunIcon = document.getElementById('sun-icon');
        const moonIcon = document.getElementById('moon-icon');

        function setTheme(dark) {
            if (dark) {
                html.classList.add('dark');
                html.classList.remove('light');
                localStorage.setItem('theme', 'dark');
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                html.classList.remove('dark');
                html.classList.add('light');
                localStorage.setItem('theme', 'light');
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        }

        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme === 'dark');

        themeToggle.addEventListener('click', () => {
            const isDark = html.classList.contains('dark');
            setTheme(!isDark);
        });

        // Mobile Menu
        document.getElementById('mobile-menu-btn').addEventListener('click', () => {
            document.getElementById('mobile-menu').classList.toggle('hidden');
        });

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch(e.key) {
                case 'k':
                    e.preventDefault();
                    document.querySelector('input[name="q"]')?.focus();
                    break;
                case 'h':
                    window.location.href = '{{ route("home") }}';
                    break;
                case 'd':
                    const isDark = html.classList.contains('dark');
                    setTheme(!isDark);
                    break;
                case '?':
                    document.getElementById('shortcuts-modal').classList.toggle('hidden');
                    break;
                case 'Escape':
                    document.getElementById('shortcuts-modal').classList.add('hidden');
                    break;
            }
        });

        // Loading Overlay Logic
        window.addEventListener('load', () => {
            const loader = document.getElementById('loader');
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        });

        document.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.hostname === window.location.hostname && !link.getAttribute('href').startsWith('#')) {
                    document.getElementById('progress').style.width = '70%';
                }
            });
        });

        // Recently Viewed (localStorage)
        function addRecentlyViewed(movie) {
            let recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
            recent = recent.filter(m => m.id !== movie.id);
            recent.unshift(movie);
            if (recent.length > 20) recent = recent.slice(0, 20);
            localStorage.setItem('recentlyViewed', JSON.stringify(recent));
        }

        // Watchlist (localStorage)
        function toggleWatchlist(movie) {
            let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
            const exists = watchlist.find(m => m.id === movie.id);
            if (exists) {
                watchlist = watchlist.filter(m => m.id !== movie.id);
            } else {
                watchlist.push(movie);
            }
            localStorage.setItem('watchlist', JSON.stringify(watchlist));
            return !exists;
        }

        function isInWatchlist(id) {
            const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
            return watchlist.some(m => m.id === id);
        }

        // Log view to server for statistics
        function logView(tmdbId, title, type, genreIds, genreNames) {
            fetch('{{ url(route("api.viewLog", [], false)) }}', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ tmdb_id: tmdbId, title, type, genre_ids: genreIds, genre_names: genreNames })
            }).catch(() => {});
        }

        // Share
        function shareMovie(title, url) {
            if (navigator.share) {
                navigator.share({ title: 'MovieFlix - ' + title, url });
            } else {
                navigator.clipboard.writeText(url);
                alert('Link copied!');
            }
        }
    </script>
    @stack('scripts')
</body>
</html>
