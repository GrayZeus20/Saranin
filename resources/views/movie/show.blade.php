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
            <div class="flex-shrink-0 w-40 sm:w-52 md:w-[280px] lg:w-[300px]">
                <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '') }}"
                     alt="{{ $movie['title'] ?? '' }}"
                     class="w-full rounded-2xl shadow-2xl shadow-black/40 border border-white/5"
                     onerror="this.src='/img/no-poster.svg'">
            </div>

            {{-- Info --}}
            <div class="flex-1 min-w-0 pt-2">
                <h1 class="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight leading-tight">{{ $movie['title'] ?? '' }}</h1>
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
                    <span class="text-slate-400">{{ floor($movie['runtime'] / 60) }}h {{ $movie['runtime'] % 60 }}m</span>
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

                {{-- Platforms --}}
                @if(!empty($movie['watch/providers']['results']['ID']['flatrate']))
                <div class="mb-7">
                    <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Available on</h3>
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
                    <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Trailer</h3>
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
                    <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Cast</h3>
                    <div class="scroll-container">
                        @foreach(array_slice($movie['credits']['cast'], 0, 15) as $cast)
                        <a href="{{ route('person.show', $cast['id']) }}" class="group w-[110px]">
                            <div class="aspect-[2/3] rounded-xl overflow-hidden bg-slate-800/50 border border-white/5 mb-2 transition-all group-hover:border-accent/30">
                                <img src="{{ app(App\Services\TmdbService::class)->imageUrl($cast['profile_path'] ?? '', 'w185') }}"
                                     alt="{{ $cast['name'] }}"
                                     class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                     loading="lazy"
                                     onerror="this.src='/img/no-poster.svg'">
                            </div>
                            <p class="text-xs font-semibold text-slate-300 truncate group-hover:text-white transition-colors">{{ $cast['name'] }}</p>
                            <p class="text-[10px] text-slate-400 truncate">{{ $cast['character'] }}</p>
                        </a>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Crew --}}
                @if(!empty($movie['credits']['crew']))
                <div class="mb-7">
                    <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Crew</h3>
                    <div class="flex flex-wrap gap-x-5 gap-y-2">
                        @foreach(array_slice($movie['credits']['crew'], 0, 10) as $crew)
                        <a href="{{ route('person.show', $crew['id']) }}" class="text-sm text-slate-400 hover:text-white transition-colors">
                            <span class="font-semibold text-slate-300">{{ $crew['name'] }}</span>
                            <span class="text-slate-400"> &middot; {{ $crew['job'] }}</span>
                        </a>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Recommendations --}}
                @if(!empty($movie['recommendations']['results']))
                <div>
                    <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">You might also like</h3>
                    <div class="scroll-container">
                        @foreach(array_slice($movie['recommendations']['results'], 0, 15) as $rec)
                            <div class="w-24 sm:w-[110px]">
                                @include('partials.movie-card', ['movie' => $rec])
                            </div>
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
    addRecentlyViewed({
        id: {{ $movie['id'] }},
        title: @js($movie['title'] ?? ''),
        poster: @js(app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? null))
    });
</script>
@endpush
@endsection
