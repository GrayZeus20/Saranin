@extends('layouts.app')

@section('title', 'Home')

@section('content')
@extends('layouts.app')

@section('title', 'Home')

@section('content')
<div class="relative bg-dark-200">
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {{-- Hero Section --}}
        @if(!empty($trending['results']))
        <div class="relative h-[80vh] rounded-3xl overflow-hidden shadow-2xl">
            <div class="absolute inset-0 bg-gradient-to-t from-dark-200 via-dark-200/50 to-transparent z-10"></div>
            <img src="{{ app(App\Services\TmdbService::class)->imageUrl($trending['results'][0]['backdrop_path'], 'original') }}"
                alt="{{ $trending['results'][0]['title'] ?? '' }}"
                class="w-full h-full object-cover">
            <div class="absolute bottom-0 left-0 right-0 p-10 z-20">
                <h1 class="text-5xl md:text-7xl font-extrabold mb-4 text-white tracking-tight drop-shadow-lg">{{ $trending['results'][0]['title'] ?? '' }}</h1>
                <p class="text-gray-200 text-lg md:text-xl max-w-2xl mb-6 line-clamp-3 drop-shadow-md leading-relaxed">{{ $trending['results'][0]['overview'] ?? '' }}</p>
                <div class="flex gap-4">
                    <a href="{{ route('movie.show', $trending['results'][0]['id']) }}" class="bg-accent hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg">
                        Watch Now
                    </a>
                    <button class="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-3 rounded-full font-bold transition-all border border-white/10">
                        View Details
                    </button>
                </div>
            </div>
        </div>
        @endif

        {{-- Browse Sections --}}
        @php
            $sections = [
                ['title' => '🔥 Trending Now', 'data' => $trending['results'] ?? [], 'link' => route('movie.trending')],
                ['title' => '⭐ Popular', 'data' => $popular['results'] ?? [], 'link' => route('movie.popular')],
                ['title' => '🎬 Now Playing', 'data' => $nowPlaying['results'] ?? [], 'link' => route('calendar')],
                ['title' => '🏆 Top Rated', 'data' => $topRated['results'] ?? [], 'link' => route('movie.topRated')],
            ];
        @endphp

        @foreach($sections as $section)
        <section>
            <div class="flex items-center justify-between mb-8">
                <h2 class="text-3xl font-bold text-white tracking-tight">{{ $section['title'] }}</h2>
                <a href="{{ $section['link'] }}" class="text-accent hover:text-white font-semibold transition-colors">See all →</a>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                @forelse($section['data'] as $movie)
                    @include('partials.movie-card', compact('movie'))
                @empty
                    @for($i=0; $i<6; $i++)
                        @include('partials.skeleton-card')
                    @endfor
                @endforelse
            </div>
        </section>
        @endforeach

        {{-- Upcoming Grid --}}
        <section>
            <div class="flex items-center justify-between mb-8">
                <h2 class="text-3xl font-bold text-white tracking-tight">📅 Upcoming</h2>
                <a href="{{ route('calendar') }}" class="text-accent hover:text-white font-semibold transition-colors">See all →</a>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                @forelse($upcoming['results'] ?? [] as $movie)
                    @include('partials.movie-card', compact('movie'))
                @empty
                    @for($i=0; $i<6; $i++)
                        @include('partials.skeleton-card')
                    @endfor
                @endforelse
            </div>
        </section>
    </div>
</div>
@endsection
