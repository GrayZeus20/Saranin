import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import Navbar from '../components/Navbar';
import { fetchWithRateLimit, BASE_URL, IMG_BASE } from '../utils/api';
import { GENRE_MAP, formatDate } from '../utils/constants';
function normalizeTv(tv) {
    return {
        ...tv,
        title: tv.name || tv.title,
        release_date: tv.first_air_date || tv.release_date,
        media_type: 'tv',
        origin_country: tv.origin_country || [],
        status: tv.status || '',
    };
}
function normalizeMovie(movie) {
    return {
        ...movie,
        media_type: 'movie',
    };
}
export default function CategoryPage() {
    const { type } = useParams();
    const [allMovies, setAllMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [activeGenres, setActiveGenres] = useState([]);
    const [activeProviders, setActiveProviders] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [contentType, setContentType] = useState('movie');
    const sentinelRef = useRef(null);
    const titles = {
        trending: 'Trending',
        popular: 'Popular',
        top_rated: 'Top Rated',
        now_playing: 'Now Playing',
    };
    // Map category to both movie and TV endpoints
    const endpointMap = {
        trending: { movie: '/trending/movie/week', tv: '/trending/tv/week' },
        popular: { movie: '/movie/popular', tv: '/tv/popular' },
        top_rated: { movie: '/movie/top_rated', tv: '/tv/top_rated' },
        now_playing: { movie: '/movie/now_playing', tv: '/tv/on_the_air' },
    };
    const { data: movies, isLoading } = useQuery({
        queryKey: ['category', type, page],
        queryFn: async () => {
            const endpoints = endpointMap[type || 'popular'];
            // Fetch both movie and TV using rate-limited fetch
            const [movieData, tvData] = await Promise.all([
                fetchWithRateLimit(`${BASE_URL}${endpoints.movie}?language=en-US&page=${page}`),
                fetchWithRateLimit(`${BASE_URL}${endpoints.tv}?language=en-US&page=${page}`)
            ]);
            const movies = (movieData.results || []).map(normalizeMovie);
            const tvShows = (tvData.results || []).map(normalizeTv);
            // Interleave or combine results
            return [...movies, ...tvShows];
        },
        retry: 2,
        retryDelay: 1000,
    });
    const renderDedup = (arr) => {
        const seen = new Set();
        return arr.filter(m => { if (seen.has(m.id))
            return false; seen.add(m.id); return true; });
    };
    useEffect(() => {
        setAllMovies([]);
        setPage(1);
        setActiveGenres([]);
        setActiveProviders([]);
        setLoading(true);
    }, [type]);
    useEffect(() => {
        if (movies) {
            setAllMovies(prev => renderDedup([...prev, ...movies]));
            setLoading(false);
        }
    }, [movies]);
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading) {
                setPage(prev => prev + 1);
            }
        }, { rootMargin: '400px' });
        if (sentinelRef.current)
            observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [isLoading]);
    // Fetch providers for loaded movies - optimized with parallel requests
    useEffect(() => {
        if (allMovies.length === 0)
            return;
        const fetchProviders = async () => {
            const updated = new Map();
            // Get movies without providers
            const moviesToFetch = allMovies.filter(m => !m.providers);
            // Parallel batch fetch (max 5 concurrent to avoid rate limits)
            const BATCH_SIZE = 5;
            for (let i = 0; i < moviesToFetch.length; i += BATCH_SIZE) {
                const batch = moviesToFetch.slice(i, i + BATCH_SIZE);
                const results = await Promise.all(batch.map(async (movie) => {
                    try {
                        const data = await fetchWithRateLimit(`${BASE_URL}/movie/${movie.id}/watch/providers`);
                        const regionResults = data.results?.ID || {};
                        return { id: movie.id, providers: regionResults.flatrate || regionResults.rent || regionResults.buy || [] };
                    }
                    catch {
                        return { id: movie.id, providers: [] };
                    }
                }));
                // Apply batch results immediately
                results.forEach(r => updated.set(r.id, r.providers));
                setAllMovies(prev => prev.map(m => ({ ...m, providers: updated.get(m.id) || m.providers })));
            }
        };
        fetchProviders();
    }, [allMovies.length]);
    const [isFiltering, setIsFiltering] = useState(false);
    const [filteredMovies, setFilteredMovies] = useState([]);
    useEffect(() => {
        setIsFiltering(true);
        const filtered = allMovies.filter(m => {
            const genreMatch = activeGenres.length === 0 || m.genre_ids?.some(id => activeGenres.includes(id));
            const providerMatch = activeProviders.length === 0 || (m.providers || []).some(p => activeProviders.includes(p.provider_id));
            const isJapaneseAnimation = m.genre_ids?.includes(16) && m.original_language === 'ja';
            // Unified type match
            let typeMatch = false;
            if (contentType === 'all') {
                typeMatch = true;
            }
            else if (contentType === 'anime') {
                typeMatch = isJapaneseAnimation;
            }
            else {
                typeMatch = m.media_type === contentType;
            }
            return genreMatch && providerMatch && typeMatch;
        });
        // Sort by release date descending to ensure newest first
        filtered.sort((a, b) => {
            const dateA = new Date(a.release_date || 0).getTime();
            const dateB = new Date(b.release_date || 0).getTime();
            return dateB - dateA;
        });
        setFilteredMovies(filtered);
        setIsFiltering(false);
    }, [allMovies, activeGenres, activeProviders, contentType]);
    // Filter by contentType first to compute available genres dynamically
    const typeFilteredMovies = useMemo(() => allMovies.filter(m => {
        const isJapaneseAnimation = m.genre_ids?.includes(16) && m.original_language === 'ja';
        if (contentType === 'all')
            return true;
        if (contentType === 'anime')
            return isJapaneseAnimation;
        return m.media_type === contentType;
    }), [allMovies, contentType]);
    const availableGenres = useMemo(() => {
        const genreIds = new Set();
        typeFilteredMovies.forEach(m => m.genre_ids?.forEach(id => genreIds.add(id)));
        return [...genreIds].map(id => ({ id, name: GENRE_MAP[id] })).filter(g => g.name).sort((a, b) => a.name.localeCompare(b.name));
    }, [typeFilteredMovies]);
    const availableProviders = useMemo(() => {
        const map = new Map();
        typeFilteredMovies.forEach(m => m.providers?.forEach(p => map.set(p.provider_id, p)));
        return [...map.values()].sort((a, b) => a.provider_name.localeCompare(b.provider_name));
    }, [typeFilteredMovies]);
    return (_jsxs("div", { className: "min-h-screen bg-surface", children: [_jsx(Navbar, {}), _jsxs("div", { className: "max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h1", { className: "text-2xl sm:text-3xl font-black text-text-primary", children: titles[type || 'popular'] }), _jsxs("button", { onClick: () => setShowFilters(!showFilters), className: "bg-surface-elevated border border-zinc-800 text-text-primary text-xs font-bold px-4 py-2 rounded-full hover:border-accent transition-all active:scale-95 flex items-center gap-2", children: [showFilters ? 'Hide Filters' : 'Filters', (activeGenres.length > 0 || activeProviders.length > 0 || contentType !== 'all') && (_jsx("span", { className: "bg-accent text-black text-[10px] px-1.5 py-0.5 rounded-full", children: [activeGenres.length, activeProviders.length, contentType !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0) }))] })] }), _jsx(AnimatePresence, { children: showFilters && (_jsxs(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.3, ease: 'easeInOut' }, className: "overflow-hidden mb-8", children: [_jsxs("div", { className: "pb-4 border-b border-zinc-800/50", children: [_jsx("p", { className: "text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3", children: "Genre" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { onClick: () => setActiveGenres([]), className: `shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${activeGenres.length === 0
                                                        ? 'bg-accent text-black'
                                                        : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: "All" }), availableGenres.map(g => (_jsx("button", { onClick: () => setActiveGenres(prev => prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]), className: `shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${activeGenres.includes(g.id)
                                                        ? 'bg-accent text-black'
                                                        : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: g.name }, g.id)))] })] }), availableProviders.length > 0 && (_jsxs("div", { className: "pt-4 pb-2", children: [_jsx("p", { className: "text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3", children: "Platform" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { onClick: () => setActiveProviders([]), className: `shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${activeProviders.length === 0
                                                        ? 'bg-accent text-black'
                                                        : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: "All" }), availableProviders.map(p => (_jsxs("button", { onClick: () => setActiveProviders(prev => prev.includes(p.provider_id) ? prev.filter(id => id !== p.provider_id) : [...prev, p.provider_id]), className: `shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full transition-all duration-200 active:scale-95 ${activeProviders.includes(p.provider_id)
                                                        ? 'bg-accent text-black'
                                                        : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: [_jsx("img", { src: `${IMG_BASE}/w45${p.logo_path}`, alt: p.provider_name, className: "w-4 h-4 rounded-sm object-cover", loading: "lazy" }), p.provider_name] }, p.provider_id)))] })] })), _jsxs("div", { className: "pt-4 pb-4 border-b border-zinc-800/50", children: [_jsx("p", { className: "text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3", children: "Type" }), _jsx("div", { className: "flex flex-wrap gap-2", children: [
                                                { key: 'all', label: 'All' },
                                                { key: 'movie', label: 'Movies' },
                                                { key: 'tv', label: 'TV Series' },
                                                { key: 'anime', label: 'Anime' },
                                            ].map(t => (_jsx("button", { onClick: () => setContentType(t.key), className: `shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${contentType === t.key
                                                    ? 'bg-accent text-black'
                                                    : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: t.label }, t.key))) })] })] })) }), _jsx("p", { className: "text-text-muted text-xs mb-4", children: isFiltering ? 'Filtering...' : `${filteredMovies.length} results` }), _jsx(motion.div, { animate: { opacity: isFiltering ? 0.4 : 1 }, transition: { duration: 0.25, ease: 'easeInOut' }, children: loading && allMovies.length === 0 ? (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4", children: Array.from({ length: 20 }).map((_, i) => (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("div", { className: "skeleton w-full aspect-[2/3] rounded-xl" }), _jsx("div", { className: "skeleton h-4 w-3/4 rounded" }), _jsx("div", { className: "skeleton h-3 w-1/2 rounded" })] }, `skeleton-${i}`))) })) : (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4", children: filteredMovies.map((m) => (_jsxs(Link, { to: m.media_type === 'tv' ? `/tv/${m.id}` : `/movie/${m.id}`, className: "block group", children: [_jsxs("div", { className: "relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]", children: [_jsx(ImageWithFallback, { src: m.poster_path ? `${IMG_BASE}/w500${m.poster_path}` : '', alt: m.title, className: "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" }), _jsxs("div", { className: "absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md", children: ["\u2605 ", m.vote_average?.toFixed(1)] }), m.media_type === 'tv' && (_jsx("div", { className: "absolute top-2 left-2 bg-accent text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md", children: "TV" })), m.genre_ids?.includes(16) && m.original_language === 'ja' && (_jsx("div", { className: `absolute top-2 left-2 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md ${m.media_type === 'tv' ? 'top-8' : ''}`, children: "Anime" }))] }), _jsx("p", { className: "mt-2 text-xs sm:text-sm font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors", children: m.title }), _jsx("p", { className: "text-text-muted text-[10px]", children: formatDate(m.release_date) })] }, m.id))) })) }), filteredMovies.length === 0 && !loading && !isFiltering && (_jsxs("div", { className: "text-center py-16", children: [_jsx("p", { className: "text-4xl mb-3", children: "\uD83D\uDD0D" }), _jsx("p", { className: "text-text-primary text-sm font-bold mb-2", children: "No results found" }), _jsx("p", { className: "text-text-muted text-xs mb-6", children: "Try adjusting your filters or explore these suggestions" }), _jsxs("div", { className: "flex flex-wrap justify-center gap-2", children: [contentType === 'anime' && (_jsx("button", { onClick: () => setContentType('all'), className: "text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all", children: "Show All Content" })), contentType !== 'anime' && (_jsx("button", { onClick: () => setContentType('anime'), className: "text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all", children: "Browse Anime" })), _jsx("button", { onClick: () => { setActiveGenres([]); setActiveProviders([]); setContentType('movie'); }, className: "text-xs font-medium px-4 py-2 rounded-full bg-accent text-black hover:bg-accent/90 transition-all", children: "Reset All Filters" })] })] })), _jsx("div", { ref: sentinelRef, className: "h-10 flex items-center justify-center", children: isLoading && _jsx("p", { className: "text-text-muted text-sm animate-pulse", children: "Loading more movies..." }) })] })] }));
}
