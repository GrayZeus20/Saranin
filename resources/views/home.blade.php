@extends('layouts.app')

@section('title', 'Home')

@section('content')
<div x-data="{ showFilter: false }" class="relative bg-dark-200">
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        
        {{-- Header dengan Tombol Filter --}}
        <div class="flex justify-between items-center">
            <h1 class="text-3xl font-bold">Discover Movies</h1>
            <button @click="showFilter = true" class="flex items-center gap-2 bg-white/10 hover:bg-green-500 px-6 py-3 rounded-full transition-all">
                <i class="fas fa-filter"></i> Filter Platforms
            </button>
        </div>

        {{-- Filter Popup --}}
        <div x-show="showFilter" 
             x-cloak
             class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
             @click.away="showFilter = false">
            <div class="bg-dark-100 p-8 rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl">
                <div class="flex justify-between mb-6">
                    <h2 class="text-2xl font-bold">Select Platforms</h2>
                    <button @click="showFilter = false" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
                </div>
                <form action="{{ route('platform.filter') }}" method="GET" class="grid grid-cols-2 gap-4">
                    @foreach([8 => 'Netflix', 119 => 'Disney+', 384 => 'HBO Max', 10 => 'Prime Video'] as $id => $name)
                    <label class="flex items-center gap-3 p-4 bg-dark-200 rounded-xl cursor-pointer hover:bg-dark-300 transition-colors">
                        <input type="checkbox" name="providers[]" value="{{ $id }}" class="accent-green-500 w-5 h-5">
                        <span class="font-semibold">{{ $name }}</span>
                    </label>
                    @endforeach
                    <button type="submit" class="col-span-2 bg-green-500 py-3 rounded-xl font-bold hover:bg-green-600">Apply Filter</button>
                </form>
            </div>
        </div>

        {{-- Hero Section ... (tetap sama) --}}
        <div x-data="{ heroLoaded: false }" class="relative h-[80vh] rounded-3xl overflow-hidden shadow-2xl">
            {{-- Skeleton Hero --}}
            <div x-show="!heroLoaded" x-transition.opacity class="absolute inset-0 skeleton bg-dark-100"></div>
            @if(!empty($trending['results']))
            <div class="absolute inset-0 bg-gradient-to-t from-dark-200 via-dark-200/50 to-transparent z-10"></div>
            <img src="{{ app(App\Services\TmdbService::class)->imageUrl($trending['results'][0]['backdrop_path'], 'original') }}"
                alt="{{ $trending['results'][0]['title'] ?? '' }}"
                @load="heroLoaded = true"
                class="w-full h-full object-cover">
            <div class="absolute bottom-0 left-0 right-0 p-10 z-20">
                <h1 class="text-5xl md:text-7xl font-extrabold mb-4 text-white tracking-tight drop-shadow-lg">{{ $trending['results'][0]['title'] ?? '' }}</h1>
                <p class="text-gray-200 text-lg md:text-xl max-w-2xl mb-6 line-clamp-3 drop-shadow-md leading-relaxed">{{ $trending['results'][0]['overview'] ?? '' }}</p>
                <div class="flex gap-4">
                    <a href="{{ route('movie.show', $trending['results'][0]['id']) }}" class="bg-accent hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg">
                        Watch Now
                    </a>
                </div>
            </div>
            @endif
        </div>

        {{-- Section list ... --}}
        @php
            $sections = [
                ['title' => '🔥 Trending Now', 'data' => $trending['results'] ?? [], 'link' => route('movie.trending')],
                ['title' => '⭐ Popular', 'data' => $popular['results'] ?? [], 'link' => route('movie.popular')],
            ];
        @endphp

        @foreach($sections as $section)
        <section>
            <div class="flex items-center justify-between mb-8">
                <h2 class="text-3xl font-bold text-white tracking-tight">{{ $section['title'] }}</h2>
                <a href="{{ $section['link'] }}" class="text-accent hover:text-white font-semibold transition-colors">See all →</a>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                @foreach($section['data'] as $movie)
                    @include('partials.movie-card', compact('movie'))
                @endforeach
            </div>
        </section>
        @endforeach
    </div>
</div>
@endsection
