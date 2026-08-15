@extends('layouts.app')

@section('title', $person['name'] ?? 'Person')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex flex-col md:flex-row gap-8 lg:gap-10">
        <div class="flex-shrink-0 w-40 sm:w-52 md:w-[260px] lg:w-[280px]">
            <img src="{{ app(App\Services\TmdbService::class)->imageUrl($person['profile_path'] ?? '', 'w500') }}"
                 alt="{{ $person['name'] }}"
                 class="w-full rounded-2xl shadow-2xl shadow-black/40 border border-white/5"
                 onerror="this.src='/img/no-poster.svg'">
        </div>
        <div class="flex-1 min-w-0">
            <h1 class="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">{{ $person['name'] }}</h1>

            @if(!empty($person['biography']))
            <p class="text-slate-300 leading-relaxed mb-7 text-sm md:text-base">{{ $person['biography'] }}</p>
            @endif

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm mb-8">
                @if(!empty($person['birthday']))
                <div>
                    <span class="text-slate-400 text-xs font-medium uppercase tracking-wider">Birthday</span>
                    <p class="font-semibold text-slate-200 mt-1">{{ $person['birthday'] }}</p>
                </div>
                @endif
                @if(!empty($person['place_of_birth']))
                <div>
                    <span class="text-slate-400 text-xs font-medium uppercase tracking-wider">Place of birth</span>
                    <p class="font-semibold text-slate-200 mt-1">{{ $person['place_of_birth'] }}</p>
                </div>
                @endif
                @if(!empty($person['known_for_department']))
                <div>
                    <span class="text-slate-400 text-xs font-medium uppercase tracking-wider">Known for</span>
                    <p class="font-semibold text-slate-200 mt-1">{{ $person['known_for_department'] }}</p>
                </div>
                @endif
            </div>

            @if(!empty($person['movie_credits']['cast']))
            <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Known for</h2>
            <div class="scroll-container pb-2">
                @foreach($person['movie_credits']['cast'] as $credit)
                <a href="{{ route('movie.show', $credit['id']) }}" class="flex-shrink-0 w-[120px] group">
                    <div class="aspect-[2/3] rounded-xl overflow-hidden bg-slate-800/50 border border-white/5 mb-2 transition-all group-hover:border-accent/30">
                        <img src="{{ app(App\Services\TmdbService::class)->imageUrl($credit['poster_path'] ?? '', 'w185') }}"
                             alt="{{ $credit['title'] }}"
                             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                             loading="lazy"
                             onerror="this.src='/img/no-poster.svg'">
                    </div>
                    <p class="text-xs font-semibold text-slate-300 truncate group-hover:text-white transition-colors">{{ $credit['title'] }}</p>
                    <p class="text-[10px] text-slate-400 truncate">{{ $credit['character'] ?? '' }}</p>
                </a>
                @endforeach
            </div>
            @endif
        </div>
    </div>
</div>
@endsection
