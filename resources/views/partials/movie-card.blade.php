<div class="movie-card group fade-in" x-data>
    <a href="{{ route('movie.show', $movie['id']) }}"
       onclick="addRecentlyViewed({id:{{ $movie['id'] }},title:'{{ addslashes($movie['title'] ?? $movie['name'] ?? '') }}',poster:'{{ app(\App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '') }}'})"
       class="block">
        <div class="relative aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800/50 border border-white/5 shadow-lg shadow-black/20 transition-all duration-500 group-hover:border-accent/30 group-hover:shadow-xl group-hover:shadow-black/40 group-hover:-translate-y-1">
            <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '') }}"
                 alt="{{ $movie['title'] ?? $movie['name'] ?? '' }}"
                 loading="lazy"
                 class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                 onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5">
                @if(!empty($movie['vote_average']))
                <span class="text-xs font-semibold text-slate-100 flex items-center gap-1.5 mb-1">
                    <svg class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    {{ number_format($movie['vote_average'], 1) }}
                </span>
                @endif
            </div>
            <span class="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">View</span>
        </div>
    </a>
    <p class="mt-2.5 text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{{ $movie['title'] ?? $movie['name'] ?? '' }}</p>
    @if(!empty($movie['release_date']))
    <p class="text-xs text-slate-500">{{ substr($movie['release_date'], 0, 4) }}</p>
    @elseif(!empty($movie['first_air_date']))
    <p class="text-xs text-slate-500">{{ substr($movie['first_air_date'], 0, 4) }}</p>
    @endif
</div>
