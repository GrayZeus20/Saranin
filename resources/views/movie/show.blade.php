@extends('layouts.app')

@section('title', $movie['title'] ?? 'Movie Detail')

@push('styles')
<style>
    .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
</style>
@endpush

@section('content')
<div class="relative">
    {{-- Backdrop --}}
    @if(!empty($movie['backdrop_path']))
    <div class="absolute inset-0 h-[60vh] -z-10">
        <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['backdrop_path'], 'original') }}" 
             alt="" 
             class="w-full h-full object-cover"
             onerror="this.style.display='none'">
        <div class="absolute inset-0 bg-gradient-to-t from-dark-200 via-dark-200/80 to-transparent"></div>
    </div>
    @endif

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col md:flex-row gap-8">
            {{-- Poster --}}
            <div class="flex-shrink-0 w-full md:w-[300px]">
                <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '') }}" 
                     alt="{{ $movie['title'] }}"
                     class="w-full rounded-xl shadow-2xl"
                     onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'">
            </div>

            {{-- Info --}}
            <div class="flex-1">
                <h1 class="text-3xl md:text-5xl font-bold mb-2">{{ $movie['title'] }}</h1>
                @if(!empty($movie['tagline']))
                <p class="text-gray-400 italic mb-4">{{ $movie['tagline'] }}</p>
                @endif

                <div class="flex flex-wrap items-center gap-4 text-sm mb-6">
                    @if(!empty($movie['vote_average']))
                    <span class="flex items-center gap-1 text-yellow-400 font-semibold">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        {{ number_format($movie['vote_average'], 1) }}/10
                    </span>
                    @endif
                    <span class="text-gray-400">{{ $movie['release_date'] ?? '' }}</span>
                    @if(!empty($movie['runtime']))
                    <span class="text-gray-400">{{ floor($movie['runtime'] / 60) }}h {{ $movie['runtime'] % 60 }}m</span>
                    @endif
                </div>

                {{-- Genres --}}
                @if(!empty($movie['genres']))
                <div class="flex flex-wrap gap-2 mb-6">
                    @foreach($movie['genres'] as $genre)
                    <a href="{{ route('genre.show', $genre['id']) }}" class="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-sm transition-colors">{{ $genre['name'] }}</a>
                    @endforeach
                </div>
                @endif

                {{-- Overview --}}
                <p class="text-gray-300 leading-relaxed mb-6">{{ $movie['overview'] ?? 'No overview available.' }}</p>

                {{-- Actions --}}
                <div class="flex flex-wrap gap-3 mb-8">
                    <button onclick="watchlistAction(this, {{ $movie['id'] }}, '{{ addslashes($movie['title']) }}', '{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '') }}')" 
                            class="bg-accent hover:bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        <span id="wl-text-{{ $movie['id'] }}">Add to Watchlist</span>
                    </button>
                    <button onclick="shareMovie('{{ addslashes($movie['title']) }}', window.location.href)" 
                            class="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                        Share
                    </button>
                </div>

                {{-- Platforms --}}
                @if(!empty($movie['watch/providers']['results']['ID']['flatrate']))
                <div class="mb-6">
                    <h3 class="text-sm font-semibold text-gray-400 mb-2">Available on</h3>
                    <div class="flex gap-3">
                        @foreach($movie['watch/providers']['results']['ID']['flatrate'] as $provider)
                        <div class="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                            <img src="{{ app(App\Services\TmdbService::class)->imageUrl($provider['logo_path'], 'w92') }}" 
                                 alt="{{ $provider['provider_name'] }}" 
                                 class="w-8 h-8 rounded"
                                 onerror="this.style.display='none'">
                            <span class="text-sm">{{ $provider['provider_name'] }}</span>
                        </div>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Trailer --}}
                @if(!empty($movie['videos']['results']))
                @php $trailer = collect($movie['videos']['results'])->firstWhere('type', 'Trailer') ?? $movie['videos']['results'][0] @endphp
                @if($trailer && $trailer['site'] === 'YouTube')
                <div class="mb-6">
                    <h3 class="text-sm font-semibold text-gray-400 mb-2">Trailer</h3>
                    <div class="aspect-video rounded-xl overflow-hidden">
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
                <div class="mb-6">
                    <h3 class="text-lg font-bold mb-4">🎭 Cast</h3>
                    <div class="scroll-container pb-2">
                        @foreach(array_slice($movie['credits']['cast'], 0, 15) as $cast)
                        <a href="{{ route('person.show', $cast['id']) }}" class="flex-shrink-0 w-[120px] text-center group">
                            <div class="w-[100px] h-[100px] mx-auto rounded-full overflow-hidden bg-dark-100 mb-2">
                                <img src="{{ app(App\Services\TmdbService::class)->imageUrl($cast['profile_path'] ?? '', 'w185') }}" 
                                     alt="{{ $cast['name'] }}"
                                     class="w-full h-full object-cover"
                                     loading="lazy"
                                     onerror="this.src='https://via.placeholder.com/100x100?text=No+Photo'">
                            </div>
                            <p class="text-sm font-semibold truncate group-hover:text-accent">{{ $cast['name'] }}</p>
                            <p class="text-xs text-gray-400 truncate">{{ $cast['character'] }}</p>
                        </a>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Crew --}}
                @if(!empty($movie['credits']['crew']))
                <div class="mb-6">
                    <h3 class="text-lg font-bold mb-4">👥 Crew</h3>
                    <div class="flex flex-wrap gap-4">
                        @foreach(array_slice($movie['credits']['crew'], 0, 10) as $crew)
                        <a href="{{ route('person.show', $crew['id']) }}" class="text-sm hover:text-accent">
                            <span class="font-semibold">{{ $crew['name'] }}</span>
                            <span class="text-gray-400"> ({{ $crew['job'] }})</span>
                        </a>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Recommendations --}}
                @if(!empty($movie['recommendations']['results']))
                <div>
                    <h3 class="text-lg font-bold mb-4">🎯 You Might Also Like</h3>
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
    // Check watchlist status
    if (isInWatchlist({{ $movie['id'] }})) {
        const btn = document.querySelector('#wl-text-{{ $movie['id'] }}');
        if (btn) {
            btn.textContent = 'Remove from Watchlist';
            btn.closest('button').classList.add('bg-white/10', 'hover:bg-white/20');
            btn.closest('button').classList.remove('bg-accent', 'hover:bg-green-600');
        }
    }

    function watchlistAction(btn, id, title, poster) {
        const removed = toggleWatchlist({id, title, poster});
        const text = btn.querySelector('span');
        if (!removed) {
            text.textContent = 'Remove from Watchlist';
            btn.classList.remove('bg-accent', 'hover:bg-green-600');
            btn.classList.add('bg-white/10', 'hover:bg-white/20');
        } else {
            text.textContent = 'Add to Watchlist';
            btn.classList.remove('bg-white/10', 'hover:bg-white/20');
            btn.classList.add('bg-accent', 'hover:bg-green-600');
        }
    }

    // Log view
    logView({{ $movie['id'] }}, '{{ addslashes($movie['title']) }}', 'movie',
        @json(collect($movie['genres'] ?? [])->pluck('id')),
        @json(collect($movie['genres'] ?? [])->pluck('name'))
    );

    // Add to recently viewed
    addRecentlyViewed({
        id: {{ $movie['id'] }},
        title: '{{ addslashes($movie['title']) }}',
        poster: '{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '') }}'
    });
</script>
@endpush
@endsection
