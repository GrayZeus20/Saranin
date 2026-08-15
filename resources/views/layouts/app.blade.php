<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'MovieFlix') - MovieFlix</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: '#0F172A',
                        secondary: '#1E293B',
                        accent: '#4ADE80',
                        surface: '#1E293B',
                        border: '#334155',
                        dark: {
                            100: '#0F172A',
                            200: '#020617',
                            300: '#1E293B',
                        },
                    },
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        display: ['"Space Grotesk"', 'sans-serif'],
                    },
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #020617; }
        h1, h2, h3, h4, .logo { font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em; }
        [x-cloak] { display: none !important; }

        .scroll-container { display: flex; gap: 0.75rem; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 0.5rem; }
        .scroll-container::-webkit-scrollbar { display: none; }
        .scroll-container > * { scroll-snap-align: start; flex-shrink: 0; }

        .loading-overlay {
            position: fixed; inset: 0; z-index: 9999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background-color: #020617;
            transition: opacity 0.6s ease;
        }
        .progress-bar {
            position: fixed; top: 0; left: 0; height: 2px; width: 0;
            background: linear-gradient(90deg, #4ADE80, #22D3EE);
            z-index: 9999;
            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .skeleton { background: linear-gradient(90deg, #1E293B 25%, #334155 50%, #1E293B 75%); background-size: 200% 100%; animation: shimmer 1.8s ease-in-out infinite; border-radius: 8px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease-out both; }

        .grain {
            position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.03;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
            background-repeat: repeat;
        }
    </style>
    @stack('styles')
</head>
<body class="bg-[#020617] text-slate-200 min-h-screen antialiased">
    <div class="grain"></div>

    {{-- LOADING OVERLAY --}}
    <div id="loader" class="loading-overlay">
        <div class="relative">
            <h1 class="text-accent text-5xl font-bold logo mb-6 tracking-tight">MovieFlix</h1>
            <div class="w-8 h-0.5 bg-accent/30 mx-auto overflow-hidden rounded-full">
                <div class="w-full h-full bg-accent rounded-full animate-[loading_1.2s_ease-in-out_infinite]"></div>
            </div>
        </div>
        <style>@keyframes loading { 0% { transform: translateX(-100%); } 50% { transform: translateX(0%); } 100% { transform: translateX(100%); } }</style>
    </div>

    {{-- PROGRESS BAR --}}
    <div id="progress" class="progress-bar" style="width: 0%"></div>

    {{-- TOAST --}}
    <div id="toast" class="fixed bottom-6 right-6 z-[100] translate-y-4 opacity-0 transition-all duration-500 pointer-events-none">
        <div class="bg-slate-800/95 backdrop-blur-md border border-slate-700/50 text-slate-200 px-5 py-3 rounded-2xl shadow-2xl shadow-black/40 flex items-center gap-3 text-sm font-medium">
            <i class="fas fa-check-circle text-accent"></i>
            <span id="toast-message">Done</span>
        </div>
    </div>

    {{-- NAVBAR --}}
    <nav class="fixed top-0 left-0 right-0 z-50 bg-slate-950/60 backdrop-blur-xl border-b border-white/5">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <div class="flex items-center gap-10">
                    <a href="{{ route('home') }}" class="text-accent font-bold text-xl logo tracking-tight hover:opacity-80 transition-opacity">MovieFlix</a>
                    <div class="hidden md:flex items-center gap-1">
                        <a href="{{ route('home') }}" class="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Home</a>
                        <a href="{{ route('movie.trending') }}" class="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Trending</a>
                        <a href="{{ route('movie.popular') }}" class="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Popular</a>
                        <a href="{{ route('movie.topRated') }}" class="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Top Rated</a>
                        <a href="{{ route('platform.index') }}" class="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Platform</a>
                        <a href="{{ route('genre.index') }}" class="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Genre</a>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <form action="{{ url(route('search', [], false)) }}" method="GET" class="relative hidden sm:block">
                        <input type="text" name="q" value="{{ request('q') }}" placeholder="Search..."
                            class="bg-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-2 pl-9 w-44 focus:w-60 transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:bg-white/10 text-sm border border-white/5">
                        <svg class="absolute left-3 top-2.5 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </form>
                    <a href="{{ route('watchlist') }}" class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all" title="Watchlist">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                    </a>
                    <a href="{{ route('calendar') }}" class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all" title="Calendar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </a>
                    <button id="mobile-menu-btn" class="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        <div id="mobile-menu" class="hidden md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/5">
            <div class="px-4 py-3 space-y-1">
                <a href="{{ route('home') }}" class="block py-2.5 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm">Home</a>
                <a href="{{ route('movie.trending') }}" class="block py-2.5 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm">Trending</a>
                <a href="{{ route('movie.popular') }}" class="block py-2.5 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm">Popular</a>
                <a href="{{ route('movie.topRated') }}" class="block py-2.5 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm">Top Rated</a>
                <a href="{{ route('platform.index') }}" class="block py-2.5 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm">Platform</a>
                <a href="{{ route('genre.index') }}" class="block py-2.5 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm">Genre</a>
                <a href="{{ route('calendar') }}" class="block py-2.5 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm">Calendar</a>
                <a href="{{ route('watchlist') }}" class="block py-2.5 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm">Watchlist</a>
                <a href="{{ route('stats') }}" class="block py-2.5 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm">Stats</a>
                <form action="{{ url(route('search', [], false)) }}" method="GET" class="pt-2">
                    <input type="text" name="q" placeholder="Search movies..." class="w-full bg-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm border border-white/5">
                </form>
            </div>
        </div>
    </nav>

    {{-- MAIN CONTENT --}}
    <main class="pt-16">
        @yield('content')
    </main>

    {{-- FOOTER --}}
    <footer class="mt-20 border-t border-white/5">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                <div>
                    <h3 class="text-accent font-bold text-lg mb-3 logo">MovieFlix</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Discover the best movies and TV shows. Powered by TMDB data.</p>
                </div>
                <div>
                    <h4 class="font-semibold text-slate-300 mb-3 text-sm uppercase tracking-wider">Browse</h4>
                    <ul class="space-y-2 text-sm">
                        <li><a href="{{ route('movie.trending') }}" class="text-slate-500 hover:text-white transition-colors">Trending</a></li>
                        <li><a href="{{ route('movie.popular') }}" class="text-slate-500 hover:text-white transition-colors">Popular</a></li>
                        <li><a href="{{ route('movie.topRated') }}" class="text-slate-500 hover:text-white transition-colors">Top Rated</a></li>
                        <li><a href="{{ route('calendar') }}" class="text-slate-500 hover:text-white transition-colors">Calendar</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold text-slate-300 mb-3 text-sm uppercase tracking-wider">Platforms</h4>
                    <ul class="space-y-2 text-sm">
                        <li><a href="{{ route('platform.show', 8) }}" class="text-slate-500 hover:text-white transition-colors">Netflix</a></li>
                        <li><a href="{{ route('platform.show', 10) }}" class="text-slate-500 hover:text-white transition-colors">Amazon Prime</a></li>
                        <li><a href="{{ route('platform.show', 384) }}" class="text-slate-500 hover:text-white transition-colors">HBO Max</a></li>
                        <li><a href="{{ route('platform.show', 119) }}" class="text-slate-500 hover:text-white transition-colors">Disney+</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold text-slate-300 mb-3 text-sm uppercase tracking-wider">More</h4>
                    <ul class="space-y-2 text-sm">
                        <li><a href="{{ route('stats') }}" class="text-slate-500 hover:text-white transition-colors">Statistics</a></li>
                        <li><a href="{{ route('genre.index') }}" class="text-slate-500 hover:text-white transition-colors">Genres</a></li>
                        <li><a href="{{ route('watchlist') }}" class="text-slate-500 hover:text-white transition-colors">Watchlist</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p class="text-slate-600 text-xs">&copy; {{ date('Y') }} MovieFlix</p>
                <p class="text-slate-600 text-xs">Data by <a href="https://www.themoviedb.org/" target="_blank" class="text-slate-400 hover:text-white transition-colors">The Movie Database</a></p>
            </div>
        </div>
    </footer>

    {{-- KEYBOARD SHORTCUTS --}}
    <div id="shortcuts-modal" class="fixed inset-0 z-[100] hidden bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 max-w-sm w-full border border-white/10 shadow-2xl shadow-black/50">
            <div class="flex justify-between items-center mb-5">
                <h3 class="text-lg font-bold text-white">Shortcuts</h3>
                <button onclick="document.getElementById('shortcuts-modal').classList.add('hidden')" class="text-slate-500 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between items-center py-1.5"><span class="text-slate-400">Focus search</span><kbd class="bg-white/10 px-2.5 py-1 rounded-md text-xs font-mono border border-white/10">K</kbd></div>
                <div class="flex justify-between items-center py-1.5"><span class="text-slate-400">Go home</span><kbd class="bg-white/10 px-2.5 py-1 rounded-md text-xs font-mono border border-white/10">H</kbd></div>
                <div class="flex justify-between items-center py-1.5"><span class="text-slate-400">Toggle theme</span><kbd class="bg-white/10 px-2.5 py-1 rounded-md text-xs font-mono border border-white/10">D</kbd></div>
                <div class="flex justify-between items-center py-1.5"><span class="text-slate-400">Shortcuts</span><kbd class="bg-white/10 px-2.5 py-1 rounded-md text-xs font-mono border border-white/10">?</kbd></div>
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
                    const bar = document.getElementById('progress');
                    bar.style.width = '70%';
                    setTimeout(() => { bar.style.width = '100%'; }, 200);
                    setTimeout(() => { bar.style.width = '0%'; }, 800);
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

        // Toast Helper
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            const toastMsg = document.getElementById('toast-message');
            const toastContainer = toast.querySelector('div');

            toastMsg.textContent = message;

            if (type === 'error') {
                toastContainer.querySelector('i').classList.add('text-red-400');
                toastContainer.querySelector('i').classList.remove('text-accent');
            } else {
                toastContainer.querySelector('i').classList.add('text-accent');
                toastContainer.querySelector('i').classList.remove('text-red-400');
            }

            toast.classList.remove('translate-y-20', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');

            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
                toast.classList.remove('translate-y-0', 'opacity-100');
            }, 3000);
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
