@props(['currentPage', 'lastPage'])

@if($lastPage > 1)
<div class="flex justify-center items-center gap-1.5 mt-12 mb-6">
    @if($currentPage > 1)
        <a href="{{ request()->fullUrlWithQuery(['page' => $currentPage - 1]) }}"
           class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-slate-300 transition-all border border-white/5 hover:border-white/10">
            ← Prev
        </a>
    @else
        <span class="px-4 py-2 bg-white/5 rounded-xl text-sm text-slate-500 border border-white/5 cursor-not-allowed">← Prev</span>
    @endif

    @php
        $start = max(1, $currentPage - 2);
        $end = min($lastPage, $currentPage + 2);
    @endphp

    @if($start > 1)
        <a href="{{ request()->fullUrlWithQuery(['page' => 1]) }}"
           class="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-sm text-slate-400 transition-all border border-white/5 hover:border-white/10">1</a>
        @if($start > 2)
            <span class="px-1 text-slate-500 text-sm">…</span>
        @endif
    @endif

    @for($i = $start; $i <= $end; $i++)
        @if($i == $currentPage)
            <span class="w-9 h-9 flex items-center justify-center bg-accent text-slate-900 rounded-xl text-sm font-semibold">{{ $i }}</span>
        @else
            <a href="{{ request()->fullUrlWithQuery(['page' => $i]) }}"
               class="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-sm text-slate-400 transition-all border border-white/5 hover:border-white/10">{{ $i }}</a>
        @endif
    @endfor

    @if($end < $lastPage)
        @if($end < $lastPage - 1)
            <span class="px-1 text-slate-500 text-sm">…</span>
        @endif
        <a href="{{ request()->fullUrlWithQuery(['page' => $lastPage]) }}"
           class="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-sm text-slate-400 transition-all border border-white/5 hover:border-white/10">{{ $lastPage }}</a>
    @endif

    @if($currentPage < $lastPage)
        <a href="{{ request()->fullUrlWithQuery(['page' => $currentPage + 1]) }}"
           class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-slate-300 transition-all border border-white/5 hover:border-white/10">
            Next →
        </a>
    @else
        <span class="px-4 py-2 bg-white/5 rounded-xl text-sm text-slate-500 border border-white/5 cursor-not-allowed">Next →</span>
    @endif
</div>
@endif
