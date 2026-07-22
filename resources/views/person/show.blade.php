@extends('layouts.app')

@section('title', $person['name'] ?? 'Person')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex flex-col md:flex-row gap-8">
        <div class="flex-shrink-0 w-full md:w-[300px]">
            <img src="{{ app(App\Services\TmdbService::class)->imageUrl($person['profile_path'] ?? '', 'w500') }}"
                 alt="{{ $person['name'] }}"
                 class="w-full rounded-xl shadow-2xl"
                 onerror="this.src='https://via.placeholder.com/300x450?text=No+Photo'">
        </div>
        <div class="flex-1">
            <h1 class="text-3xl md:text-5xl font-bold mb-4">{{ $person['name'] }}</h1>

            @if(!empty($person['biography']))
            <p class="text-gray-300 leading-relaxed mb-6">{{ $person['biography'] }}</p>
            @endif

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-8">
                @if(!empty($person['birthday']))
                <div>
                    <span class="text-gray-400">Birthday</span>
                    <p class="font-semibold">{{ $person['birthday'] }}</p>
                </div>
                @endif
                @if(!empty($person['place_of_birth']))
                <div>
                    <span class="text-gray-400">Place of Birth</span>
                    <p class="font-semibold">{{ $person['place_of_birth'] }}</p>
                </div>
                @endif
                @if(!empty($person['known_for_department']))
                <div>
                    <span class="text-gray-400">Known for</span>
                    <p class="font-semibold">{{ $person['known_for_department'] }}</p>
                </div>
                @endif
            </div>

            @if(!empty($person['movie_credits']['cast']))
            <h2 class="text-xl font-bold mb-4">🎬 Known For</h2>
            <div class="scroll-container pb-2">
                @foreach($person['movie_credits']['cast'] as $credit)
                <a href="{{ route('movie.show', $credit['id']) }}" class="flex-shrink-0 w-[140px] group">
                    <div class="aspect-[2/3] rounded-lg overflow-hidden bg-dark-100 mb-2">
                        <img src="{{ app(App\Services\TmdbService::class)->imageUrl($credit['poster_path'] ?? '', 'w185') }}"
                             alt="{{ $credit['title'] }}"
                             class="w-full h-full object-cover"
                             loading="lazy"
                             onerror="this.src='https://via.placeholder.com/140x210?text=No+Poster'">
                    </div>
                    <p class="text-sm font-semibold truncate group-hover:text-primary">{{ $credit['title'] }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ $credit['character'] ?? '' }}</p>
                </a>
                @endforeach
            </div>
            @endif
        </div>
    </div>
</div>
@endsection
