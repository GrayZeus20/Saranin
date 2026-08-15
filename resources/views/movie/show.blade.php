@extends('layouts.app')

@section('title', $movie['title'] ?? 'Movie Detail')

@section('content')
<div class="relative min-h-screen">
    {{-- Backdrop with enhanced gradient --}}
    @if(!empty($movie['backdrop_path']))
    <div class="absolute inset-0 h-[70vh] -z-10">
        <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['backdrop_path'], 'original') }}"
             alt=""
             class="w-full h-full object-cover filter blur-sm opacity-60"
             onerror="this.style.display='none'">
        <div class="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-[#020617]/40"></div>
    </div>
    @endif

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="flex flex-col lg:flex-row gap-10 lg:gap-12">
            {{-- Poster with enhanced styling --}}
            <div class="flex-shrink-0 w-48 sm:w-56 md:w-72 lg:w-80 mx-auto lg:mx-0">
                <div class="relative group">
                    <div class="absolute -inset-1 bg-gradient-to-r from-accent to-green-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                    <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '') }}"
                         alt="{{ $movie['title'] ?? '' }}"
                         class="relative w-full rounded-2xl shadow-2xl shadow-black/60 border border-white/10 group-hover:scale-[1.02] transition-transform duration-300"
                         onerror="this.src='/img/no-poster.svg'">
                </div>
            </div>

            {{-- Info with enhanced typography --}}
            <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between mb-4">
                    <h1 class="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">{{ $movie['title'] ?? '' }}</h1>
                    @if(!empty($movie['vote_average']))
                    <div class="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl">
                        <svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        <span class="text-amber-400 font-bold text-lg">{{ number_format($movie['vote_average'], 1) }}</span>
                    </div>
                    @endif
                </div>

                @if(!empty($movie['tagline']))
                <p class="text-xl text-slate-400 italic mb-6 font-light leading-relaxed">"{{ $movie['tagline'] }}"</p>
                @endif

                <div class="flex flex-wrap items-center gap-4 text-sm mb-8">
                    @if(!empty($movie['release_date']))
                    <div class="flex items-center gap-2 text-slate-300">
                        <svg class="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <span>{{ $movie['release_date'] }}</span>
                    </div>
                    @endif
                    @if(!empty($movie['runtime']))
                    <div class="flex items-center gap-2 text-slate-300">
                        <svg class="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>{{ floor($movie['runtime'] / 60) }}h {{ $movie['runtime'] % 60 }}m</span>
                    </div>
                    @endif
                </div>

                {{-- Genres with enhanced styling --}}
                @if(!empty($movie['genres']))
                <div class="flex flex-wrap gap-3 mb-8">
                    @foreach($movie['genres'] as $genre)
                    <a href="{{ route('genre.show', $genre['id']) }}" class="bg-gradient-to-r from-white/10 to-white/5 hover:from-accent/20 hover:to-accent/10 border border-white/10 hover:border-accent/40 px-4 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white transition-all duration-300 backdrop-blur-sm">{{ $genre['name'] }}</a>
                    @endforeach
                </div>
                @endif

                {{-- Overview with enhanced typography --}}
                <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
                    <h3 class="text-sm font-semibold text-accent uppercase tracking-wider mb-3">Synopsis</h3>
                    <p class="text-slate-300 leading-relaxed text-base">{{ $movie['overview'] ?? 'No overview available.' }}</p>
                </div>

                {{-- Platforms with enhanced styling --}}
                @if(!empty($movie['watch/providers']['results']['ID']['flatrate']))
                <div class="mb-8">
                    <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Available on</h3>
                    <div class="flex flex-wrap gap-3">
                        @foreach($movie['watch/providers']['results']['ID']['flatrate'] as $provider)
                        <div class="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 rounded-xl px-4 py-3 transition-all duration-300">
                            <img src="{{ app(App\Services\TmdbService::class)->imageUrl($provider['logo_path'], 'w92') }}"
                                 alt="{{ $provider['provider_name'] }}"
                                 class="w-8 h-8 rounded-lg"
                                 onerror="this.style.display='none'">
                            <span class="text-sm text-slate-300 font-medium">{{ $provider['provider_name'] }}</span>
                        </div>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Trailer with enhanced styling --}}
                @if(!empty($movie['videos']['results']))
                @php $trailer = collect($movie['videos']['results'])->firstWhere('type', 'Trailer') ?? $movie['videos']['results'][0] @endphp
                @if($trailer && $trailer['site'] === 'YouTube')
                <div class="mb-8">
                    <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Trailer</h3>
                    <div class="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
                        <iframe src="https://www.youtube.com/embed/{{ $trailer['key'] }}"
                                class="w-full h-full"
                                allowfullscreen
                                loading="lazy"></iframe>
                    </div>
                </div>
                @endif
                @endif

                {{-- Cast with enhanced styling --}}
                @if(!empty($movie['credits']['cast']))
                <div class="mb-8">
                    <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Cast</h3>
                    <div class="scroll-container">
                        @foreach(array_slice($movie['credits']['cast'], 0, 15) as $cast)
                        <a href="{{ route('person.show', $cast['id']) }}" class="group w-[120px]">
                            <div class="aspect-[2/3] rounded-xl overflow-hidden bg-slate-800/50 border border-white/10 mb-3 transition-all duration-300 group-hover:border-accent/50 group-hover:shadow-lg group-hover:shadow-accent/20">
                                <img src="{{ app(App\Services\TmdbService::class)->imageUrl($cast['profile_path'] ?? '', 'w185') }}"
                                     alt="{{ $cast['name'] }}"
                                     class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                     loading="lazy"
                                     onerror="this.src='/img/no-poster.svg'">
                            </div>
                            <p class="text-sm font-semibold text-slate-300 truncate group-hover:text-white transition-colors">{{ $cast['name'] }}</p>
                            <p class="text-xs text-slate-400 truncate">{{ $cast['character'] }}</p>
                        </a>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Crew with enhanced styling --}}
                @if(!empty($movie['credits']['crew']))
                <div class="mb-8">
                    <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Crew</h3>
                    <div class="flex flex-wrap gap-x-6 gap-y-3">
                        @foreach(array_slice($movie['credits']['crew'], 0, 10) as $crew)
                        <a href="{{ route('person.show', $crew['id']) }}" class="text-sm text-slate-400 hover:text-white transition-colors">
                            <span class="font-semibold text-slate-300">{{ $crew['name'] }}</span>
                            <span class="text-slate-500"> · {{ $crew['job'] }}</span>
                        </a>
                        @endforeach
                    </div>
                </div>
                @endif

                {{-- Recommendations with enhanced styling --}}
                @if(!empty($movie['recommendations']['results']))
                <div>
                    <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">You might also like</h3>
                    <div class="scroll-container">
                        @foreach(array_slice($movie['recommendations']['results'], 0, 15) as $rec)
                            <div class="w-28 sm:w-[120px]">
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
