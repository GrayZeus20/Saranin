@extends('layouts.app')

@section('title', $movie['title'] ?? 'Movie Detail')

@section('content')
<div class="relative">
    {{-- Backdrop --}}
    @if(!empty($movie['backdrop_path']))
    <div class="absolute inset-0 h-[55vh] -z-10">
        <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['backdrop_path'], 'original') }}"
             alt=""
             class="w-full h-full object-cover"
             onerror="this.style.display='none'">
        <div class="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/70 to-[#020617]/20"></div>
    </div>
    @endif

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col md:flex-row gap-8 lg:gap-10">
            {{-- Poster --}}
            <div class="flex-shrink-0 w-full md:w-[280px] lg:w-[300px]">
                <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '') }}"
                     alt="{{ $movie['title'] }}"
                     class="w-full rounded-2xl shadow-2xl shadow-black/40 border border-white/5"
                     onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'">
            </div>

            {{-- Info --}}
            <div class="flex-1 pt-2">
                <h1 class="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight leading-tight">{{ $movie['title'] }}</h1>
                @if(!empty($movie['tagline']))
                <p class="text-slate-400 italic mb-5 text-sm">"{{ $movie['tagline'] }}"</p>
                @endif

                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-6">
                    @if(!empty($movie['vote_average']))
                    <span class="flex items-center gap-1.5 text-amber-400 font-semibold">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        {{ number_format($movie['vote_average'], 1) }}
                    </span>
                    @endif
                    @if(!empty($movie['release_date']))
                    <span class="text-slate-400">{{ $movie['release_date'] }}</span>
                    @endif
                    @if(!empty($movie['runtime']))
                    <span class="text-slate-500">{{ floor($movie['runtime'] / 60) }}h {{ $movie['runtime'] % 60 }}m</span>
                    @endif
                </div>

                {{-- Genres --}}
                @if(!empty($movie['genres']))
                <div class="flex flex-wrap gap-2 mb-6">
                    @foreach($movie['genres'] as $genre)
                    <a href="{{ route('genre.show', $genre['id']) }}" class="bg-white/5 hover:bg-accent/20 hover:text-accent border border-white/10 hover:border-accent/30 px-3 py-1.5 rounded-full text-xs font-medium transition-all">{{ $genre['name'] }}</a>
                    @endforeach
                </div>
                @endif

                {{-- Overview --}}
                <p class="text-slate-300 leading-relaxed mb-7 text-sm md:text-base">{{ $movie['overview'] ?? 'No overview available.' }}</p>

                {{-- Actions --}}
                <div class="flex flex-wrap gap-3 mb-8">
                    <button onclick="watchlistAction(this, {{ $movie['id'] }}, '{{ addslashes($movie['title']) }}', '{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '') }}')"
                            class="inline-flex items-center gap-2 bg-accent hover:bg-opacity-90 text-slate-900 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        <span id="wl-text-{{ $movie['id'] }}">Watchlist</span>
                    </button>
                    <button onclick="shareMovie('{{ addslashes($movie['title']) }}', window.location.href)"
                            class="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                        Share
                    </button>
                </div>

                {{-- Platforms --}}
                @if(!empty($movie['watch/providers']['results']['ID']['flatrate']))
                <div class="mb-7">
                    <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Available on</h3>
                    <div class="flex gap-3">
                        @foreach($movie['watch/providers']['results']['ID']['flatrate'] as $provider)
                        <div class="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2">
                            <img src="{{ app(App\Services\TmdbService::class)->imageUrl($provider['logo_path'], 'w92') }}"
                                 alt="{{ $provider['provider_name'] }}"
                                 class="w-7 h-7 rounded"
                                 onerror="this.style.display='none'">
                            <span class="text-xs text-slate-300 font-medium">{{ $provider['provider_name'] }}</span>
                        </div>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Trailer --}}
                @if(!empty($movie['videos']['results']))
                @php $trailer = collect($movie['videos']['results'])->firstWhere('type', 'Trailer') ?? $movie['videos']['results'][0] @endphp
                @if($trailer && $trailer['site'] === 'YouTube')
                <div class="mb-7">
                    <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Trailer</h3>
                    <div class="aspect-video rounded-2xl overflow-hidden border border-white/5 shadow-xl shadow-black/30">
                        <iframe src="https://www.youtube.com/embed/{{ $trailer['key'] }}"
                                class="w-full h-full"
                                allowfullscreen
                                loading="lazy"></iframe>
                    </div>
                </div>
                @endif
                @endif

                {{-- Cast --}}
                @if(!empty($movie['credits']['cast']))
                <div class="mb-7">
                    <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Cast</h3>
                    <div class="scroll-container">
                        @foreach(array_slice($movie['credits']['cast'], 0, 15) as $cast)
                        <a href="{{ route('person.show', $cast['id']) }}" class="group w-[110px]">
                            <div class="aspect-[2/3] rounded-xl overflow-hidden bg-slate-800/50 border border-white/5 mb-2 transition-all group-hover:border-accent/30">
                                <img src="{{ app(App\Services\TmdbService::class)->imageUrl($cast['profile_path'] ?? '', 'w185') }}"
                                     alt="{{ $cast['name'] }}"
                                     class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                     loading="lazy"
                                     onerror="this.src='https://via.placeholder.com/150x225?text=No+Photo'">
                            </div>
                            <p class="text-xs font-semibold text-slate-300 truncate group-hover:text-white transition-colors">{{ $cast['name'] }}</p>
                            <p class="text-[10px] text-slate-500 truncate">{{ $cast['character'] }}</p>
                        </a>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Crew --}}
                @if(!empty($movie['credits']['crew']))
                <div class="mb-7">
                    <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Crew</h3>
                    <div class="flex flex-wrap gap-x-5 gap-y-2">
                        @foreach(array_slice($movie['credits']['crew'], 0, 10) as $crew)
                        <a href="{{ route('person.show', $crew['id']) }}" class="text-sm text-slate-400 hover:text-white transition-colors">
                            <span class="font-semibold text-slate-300">{{ $crew['name'] }}</span>
                            <span class="text-slate-600"> &middot; {{ $crew['job'] }}</span>
                        </a>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Recommendations --}}
                @if(!empty($movie['recommendations']['results']))
                <div>
                    <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">You might also like</h3>
                    <div class="scroll-container">
                        @foreach($movie['recommendations']['results'] as $rec)
                            @include('partials.movie-card', ['movie' => $rec])
                        @endforeach
                    </div>
                </div>
                @endif
            </div>
        </div>
    </div>
</div>

@push('scripts')
<script>
    if (isInWatchlist({{ $movie['id'] }})) {
        const btn = document.querySelector('#wl-text-{{ $movie['id'] }}');
        if (btn) {
            btn.textContent = 'Remove';
            btn.closest('button').classList.add('bg-white/10', 'text-white');
            btn.closest('button').classList.remove('bg-accent', 'text-slate-900');
        }
    }

    function watchlistAction(btn, id, title, poster) {
        const removed = toggleWatchlist({id, title, poster});
        const text = btn.querySelector('span');
        if (!removed) {
            text.textContent = 'Remove';
            btn.classList.remove('bg-accent', 'text-slate-900');
            btn.classList.add('bg-white/10', 'text-white');
            showToast('Added to watchlist');
        } else {
            text.textContent = 'Watchlist';
            btn.classList.remove('bg-white/10', 'text-white');
            btn.classList.add('bg-accent', 'text-slate-900');
            showToast('Removed from watchlist');
        }
    }

    logView({{ $movie['id'] }}, '{{ addslashes($movie['title']) }}', 'movie',
        @json(collect($movie['genres'] ?? [])->pluck('id')),
        @json(collect($movie['genres'] ?? [])->pluck('name'))
    );

    addRecentlyViewed({
        id: {{ $movie['id'] }},
        title: '{{ addslashes($movie['title']) }}',
        poster: '{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '') }}'
    });
</script>
@endpush
@endsection
