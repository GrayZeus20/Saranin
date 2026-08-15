@extends('layouts.app')

@section('title', 'My Watchlist')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight">My watchlist</h1>
        <p class="text-slate-400 text-sm mt-1">Movies you want to watch</p>
    </div>

    <div id="watchlist-empty" class="text-center py-20 hidden">
        <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center">
            <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
        </div>
        <p class="text-lg font-semibold text-slate-300 mb-2">Nothing here yet</p>
        <p class="text-sm text-slate-400 mb-5">Start building your watchlist</p>
        <a href="{{ route('home') }}" class="inline-flex items-center gap-2 text-sm text-accent hover:text-opacity-80 font-medium transition-colors">
            Browse movies
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </a>
    </div>

    <div id="watchlist-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
    </div>

    <div id="recently-viewed-section" class="mt-14">
        <h2 class="text-lg font-bold text-white mb-1">Recently viewed</h2>
        <p class="text-slate-400 text-sm mb-5">Your browsing history</p>
        <div id="recently-viewed-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
        </div>
    </div>
</div>

@push('scripts')
<script>
    function renderMovieCards(containerId, movies, emptyMsg, {removable = false} = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.textContent = '';

        if (!movies || movies.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'col-span-full text-center text-slate-400 py-12 text-sm';
            empty.textContent = emptyMsg;
            container.append(empty);
            return;
        }

        movies.forEach(m => container.append(buildMovieCard(m, removable)));
    }

    function buildMovieCard(m, removable) {
        const id = Number(m.id);
        const title = String(m.title ?? '');
        const poster = String(m.poster ?? '');

        const card = document.createElement('div');
        card.className = 'movie-card fade-in';

        const link = document.createElement('a');
        link.href = `/movie/${id}`;
        link.className = 'block';
        link.addEventListener('click', () => addRecentlyViewed({id, title, poster}));

        const frame = document.createElement('div');
        frame.className = 'relative aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800/50 border border-white/5 shadow-lg shadow-black/20';

        const img = document.createElement('img');
        img.src = poster.startsWith('http') || poster.startsWith('/') ? poster : '/img/no-poster.svg';
        img.alt = title;
        img.loading = 'lazy';
        img.className = 'w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-[1.06]';
        img.addEventListener('error', () => { img.src = '/img/no-poster.svg'; });

        const caption = document.createElement('p');
        caption.className = 'mt-2.5 text-sm font-semibold text-slate-200 truncate';
        caption.textContent = title;

        frame.append(img);
        link.append(frame);
        card.append(link, caption);

        if (removable) {
            card.append(buildRemoveButton(id, title));
        }

        return card;
    }

    function buildRemoveButton(id, title) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'absolute top-2 right-2 z-10 flex items-center justify-center w-11 h-11 rounded-xl bg-slate-950/70 backdrop-blur-sm text-slate-200 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors';
        button.setAttribute('aria-label', `Remove ${title} from watchlist`);
        button.title = 'Remove from watchlist';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('class', 'w-5 h-5');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('d', 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16');

        svg.append(path);
        button.append(svg);
        button.addEventListener('click', () => removeFromWatchlist(id, button));

        return button;
    }

    function removeFromWatchlist(id, btn) {
        let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
        watchlist = watchlist.filter(m => m.id !== id);
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
        const card = btn.closest('.movie-card');
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        card.style.transition = 'all 0.3s ease';
        setTimeout(() => card.remove(), 300);
        checkEmpty();
        showToast('Removed from watchlist');
    }

    function checkEmpty() {
        const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
        const empty = document.getElementById('watchlist-empty');
        const grid = document.getElementById('watchlist-grid');
        if (watchlist.length === 0) {
            empty.classList.remove('hidden');
            grid.textContent = '';
        } else {
            empty.classList.add('hidden');
        }
    }

    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    renderMovieCards('watchlist-grid', watchlist, 'Your watchlist is empty', {removable: true});
    checkEmpty();

    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    renderMovieCards('recently-viewed-grid', recentlyViewed, 'No recently viewed movies');
</script>
@endpush
@endsection
