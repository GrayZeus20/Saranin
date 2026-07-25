@extends('layouts.app')

@section('title', 'My Watchlist')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">📋 My Watchlist</h1>

    <div id="watchlist-empty" class="text-center py-20 hidden">
        <div class="text-6xl mb-4">🎬</div>
        <p class="text-xl text-gray-400 mb-4">Your watchlist is empty</p>
        <a href="{{ route('home') }}" class="text-accent hover:underline">Browse movies →</a>
    </div>

    <div id="watchlist-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
    </div>

    <div id="recently-viewed-section" class="mt-12">
        <h2 class="text-xl font-bold mb-4">🕐 Recently Viewed</h2>
        <div id="recently-viewed-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        </div>
    </div>
</div>

@push('scripts')
<script>
    function renderMovieCards(containerId, movies, emptyMsg) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!movies || movies.length === 0) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-400 py-20">${emptyMsg}</p>`;
            return;
        }
        container.innerHTML = movies.map(m => `
            <div class="movie-card w-full">
                <a href="/movie/${m.id}" 
                   onclick="addRecentlyViewed(${JSON.stringify(m).replace(/"/g,'&quot;')})"
                   class="block">
                    <div class="relative aspect-[2/3] rounded-lg overflow-hidden bg-dark-100">
                        <img src="${m.poster || 'https://via.placeholder.com/300x450?text=No+Poster'}" 
                             alt="${m.title}"
                             loading="lazy"
                             class="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                             onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'">
                    </div>
                </a>
                <p class="mt-2 text-sm font-semibold truncate">${m.title}</p>
                <button onclick="removeFromWatchlist(${m.id}, this)" class="text-xs text-red-400 hover:text-red-300 mt-1">Remove</button>
            </div>
        `).join('');
    }

    function removeFromWatchlist(id, btn) {
        let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
        watchlist = watchlist.filter(m => m.id !== id);
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
        const card = btn.closest('.movie-card');
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
        checkEmpty();
    }

    function checkEmpty() {
        const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
        const empty = document.getElementById('watchlist-empty');
        const grid = document.getElementById('watchlist-grid');
        if (watchlist.length === 0) {
            empty.classList.remove('hidden');
            grid.innerHTML = '';
        } else {
            empty.classList.add('hidden');
        }
    }

    // Load watchlist
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    renderMovieCards('watchlist-grid', watchlist, 'Your watchlist is empty');
    checkEmpty();

    // Load recently viewed
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    renderMovieCards('recently-viewed-grid', recentlyViewed, 'No recently viewed movies');
</script>
@endpush
@endsection
