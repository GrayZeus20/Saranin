import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import Navbar from '../components/Navbar';
import { fetchWithRateLimit, IMG_BASE } from '../utils/api';
import { GENRE_MAP, REGION_MAP, formatDate } from '../utils/constants';
function formatRuntime(min) {
    if (!min)
        return '';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function formatMoney(n) {
    if (!n)
        return '';
    if (n >= 1_000_000_000)
        return `$${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000)
        return `$${(n / 1_000_000).toFixed(0)}M`;
    return `$${n.toLocaleString()}`;
}
export default function MovieDetailPage() {
    const { id } = useParams();
    const location = useLocation();
    const isTv = location.pathname.startsWith('/tv/');
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const region = 'ID';
    const scrollRef = useRef(null);
    const castScrollRef = useRef(null);
    const similarScrollRef = useRef(null);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        const controller = new AbortController();
        const endpoint = isTv ? 'tv' : 'movie';
        fetchWithRateLimit(`/${endpoint}/${id}?append_to_response=credits,videos,similar&language=en-US`, { signal: controller.signal })
            .then(data => {
            const normalized = isTv ? {
                ...data,
                title: data.name || data.title,
                release_date: data.first_air_date || data.release_date,
                runtime: data.episode_run_time?.[0] || null,
            } : data;
            setDetail(normalized);
            setLoading(false);
        })
            .catch(() => { if (!controller.signal.aborted) {
            setDetail(null);
            setLoading(false);
        } });
        return () => controller.abort();
    }, [id, isTv]);
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);
    const scroll = useCallback((ref, direction) => {
        if (ref.current) {
            const scrollAmount = ref.current.clientWidth * 0.8;
            ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    }, []);
    if (loading) {
        return (_jsx("div", { className: "fixed inset-0 z-50 bg-surface", children: _jsxs("div", { className: "w-full h-full overflow-y-auto", children: [_jsx("div", { className: "relative h-[40vh] sm:h-[50vh] md:h-[60vh]", children: _jsx("div", { className: "skeleton absolute inset-0" }) }), _jsxs("div", { className: "relative z-10 -mt-32 sm:-mt-40 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-16", children: [_jsxs("div", { className: "flex flex-col sm:flex-row gap-5 sm:gap-8 mb-8", children: [_jsx("div", { className: "shrink-0 w-36 sm:w-44 md:w-52", children: _jsx("div", { className: "skeleton w-full aspect-[2/3] rounded-xl" }) }), _jsxs("div", { className: "flex-1 space-y-4", children: [_jsx("div", { className: "skeleton h-10 w-3/4 rounded" }), _jsx("div", { className: "skeleton h-4 w-1/2 rounded" }), _jsx("div", { className: "skeleton h-20 w-full rounded" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "skeleton h-8 w-32 rounded" }), _jsx("div", { className: "skeleton h-48 w-full rounded-xl" }), _jsx("div", { className: "skeleton h-8 w-32 rounded" }), _jsx("div", { className: "skeleton h-40 w-full rounded-xl" })] })] })] }) }));
    }
    if (!detail) {
        return (_jsx("div", { className: "fixed inset-0 z-50 bg-surface flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-5xl mb-4", children: isTv ? '📺' : '🎬' }), _jsxs("p", { className: "text-text-primary text-lg font-semibold mb-2", children: [isTv ? 'TV Show' : 'Movie', " not found"] }), _jsx(Link, { to: "/", className: "mt-4 inline-block bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform", children: "Go Home" })] }) }));
    }
    const movie = detail;
    const trailer = detail.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) || detail.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer') || detail.videos?.results?.find(v => v.site === 'YouTube');
    const director = detail.credits?.crew?.find(c => c.job === 'Director')?.name;
    const detailProviders = detail['watch/providers']?.results?.[region]
        || detail['watch/providers']?.results?.ID
        || detail['watch/providers']?.results?.US
        || {};
    const flatrateProviders = detailProviders.flatrate || [];
    const rentProviders = detailProviders.rent || [];
    const buyProviders = detailProviders.buy || [];
    const allProviders = [...flatrateProviders, ...rentProviders, ...buyProviders];
    const uniqueProviders = allProviders.length > 0
        ? [...new Map(allProviders.map(p => [p.provider_id, p])).values()]
        : [];
    const allRegionResults = detail['watch/providers']?.results || {};
    const availableRegions = Object.entries(allRegionResults)
        .filter(([, data]) => data.flatrate?.length || data.rent?.length || data.buy?.length)
        .map(([code, data]) => ({
        code,
        name: REGION_MAP[code]?.name || code,
        flag: REGION_MAP[code]?.flag || '🌍',
        providers: [...(data.flatrate || []), ...(data.rent || []), ...(data.buy || [])],
    }));
    const cast = detail.credits?.cast?.slice(0, 10) || [];
    const similar = detail.similar?.results?.slice(0, 20) || [];
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-surface", children: _jsxs("div", { ref: scrollRef, className: "w-full h-full overflow-y-auto", children: [_jsx(Navbar, {}), _jsxs("div", { className: "relative h-[40vh] sm:h-[50vh] md:h-[60vh]", children: [movie.backdrop_path ? (_jsx("img", { src: `${IMG_BASE}/original${movie.backdrop_path}`, alt: movie.title, className: "w-full h-full object-cover" })) : (_jsx("div", { className: "w-full h-full bg-surface-card flex items-center justify-center text-zinc-700 text-4xl font-black", children: movie.title })), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-surface/60 to-transparent" })] }), _jsxs("div", { className: "relative z-10 -mt-32 sm:-mt-40 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-16", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: "flex flex-col sm:flex-row gap-5 sm:gap-8 mb-8", children: [_jsx("div", { className: "shrink-0 w-36 sm:w-44 md:w-52 mx-auto sm:mx-0", children: movie.poster_path ? (_jsx("img", { src: `${IMG_BASE}/w500${movie.poster_path}`, alt: movie.title, className: "w-full aspect-[2/3] object-cover rounded-xl shadow-2xl border border-zinc-800" })) : (_jsx("div", { className: "w-full aspect-[2/3] bg-surface-card rounded-xl flex items-center justify-center text-zinc-700 text-lg font-bold", children: movie.title?.charAt(0) })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h1", { className: "text-2xl sm:text-3xl md:text-4xl font-black text-text-primary leading-tight mb-1", children: movie.title }), detail.tagline && _jsxs("p", { className: "text-accent text-sm italic mb-3", children: ["\"", detail.tagline, "\""] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 text-sm text-text-muted mb-4", children: [_jsx("span", { children: formatDate(movie.release_date) }), detail.runtime && _jsxs(_Fragment, { children: [_jsx("span", { className: "text-zinc-700", children: "\u2022" }), _jsx("span", { children: formatRuntime(detail.runtime) })] }), _jsx("span", { className: "text-zinc-700", children: "\u2022" }), _jsxs("span", { className: "text-accent font-mono font-bold", children: ["\u2605 ", movie.vote_average?.toFixed(1)] }), director && _jsxs(_Fragment, { children: [_jsx("span", { className: "text-zinc-700", children: "\u2022" }), _jsxs("span", { children: ["Dir. ", director] })] })] }), _jsx("div", { className: "flex flex-wrap gap-1.5 mb-5", children: (detail.genres || movie.genre_ids.map(gid => ({ id: gid, name: GENRE_MAP[gid] }))).map(g => (_jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-md", children: g.name }, g.id))) }), _jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2", children: "Synopsis" }), _jsx("p", { className: "text-text-secondary text-sm leading-relaxed", children: movie.overview || 'No synopsis available.' })] }), uniqueProviders.length > 0 && (_jsxs("div", { className: "mb-5", children: [_jsxs("h3", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2", children: ["Available in ", REGION_MAP[region]?.flag || '🌍', " ", REGION_MAP[region]?.name || region] }), _jsx("div", { className: "flex flex-wrap gap-2", children: uniqueProviders.map(p => (_jsxs("div", { className: "flex items-center gap-1.5 bg-white rounded-lg px-3 py-2", children: [_jsx("img", { src: `${IMG_BASE}/w92${p.logo_path}`, alt: p.provider_name, className: "w-6 h-6 rounded-md object-cover", loading: "lazy" }), _jsx("span", { className: "text-black text-[11px] font-bold", children: p.provider_name })] }, p.provider_id))) })] })), detail.budget > 0 && (_jsxs("div", { className: "flex gap-6 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] uppercase tracking-widest text-text-muted font-bold", children: "Budget" }), _jsx("p", { className: "text-text-primary font-bold", children: formatMoney(detail.budget) })] }), detail.revenue > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-[10px] uppercase tracking-widest text-text-muted font-bold", children: "Revenue" }), _jsx("p", { className: "text-text-primary font-bold", children: formatMoney(detail.revenue) })] }))] }))] })] }), trailer && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.1 }, className: "mb-10", children: [_jsx("h3", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4", children: "Trailer" }), _jsx("div", { className: "relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800 bg-black", children: _jsx("iframe", { src: `https://www.youtube.com/embed/${trailer.key}`, title: `${movie.title} trailer`, className: "absolute inset-0 w-full h-full", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowFullScreen: true }) })] })), cast.length > 0 && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.2 }, className: "mb-10 relative group", children: [_jsx("h3", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4", children: "Cast" }), _jsx("button", { onClick: () => scroll(castScrollRef, 'left'), className: "absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2", children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }) }), _jsx("div", { ref: castScrollRef, className: "flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide", children: cast.map((c, i) => (_jsx(motion.div, { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.4, delay: 0.1 + i * 0.05 }, className: "shrink-0 w-20 sm:w-24 text-center", children: _jsxs(Link, { to: `/person/${c.id}`, className: "block", children: [_jsx("div", { className: "w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-surface-card border border-zinc-800 mx-auto mb-2 hover:border-accent transition-colors", children: c.profile_path ? (_jsx("img", { src: `${IMG_BASE}/w185${c.profile_path}`, alt: c.name, className: "w-full h-full object-cover", loading: "lazy" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-zinc-700 text-lg font-bold", children: c.name.charAt(0) })) }), _jsx("p", { className: "text-text-primary text-[11px] font-bold line-clamp-1 hover:text-accent transition-colors", children: c.name }), _jsx("p", { className: "text-text-muted text-[9px] line-clamp-1", children: c.character })] }) }, c.id))) }), _jsx("button", { onClick: () => scroll(castScrollRef, 'right'), className: "absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2", children: _jsx("polyline", { points: "9 18 15 12 9 6" }) }) })] })), availableRegions.length > 0 && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.15 }, className: "mb-10", children: [_jsx("h3", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4", children: "Available In These Countries" }), _jsx("div", { className: "space-y-4", children: availableRegions.slice(0, 8).map(({ code, name, flag, providers }) => (_jsxs("div", { className: "bg-surface-elevated border border-zinc-800 rounded-xl p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("span", { className: "text-lg", children: flag }), _jsx("span", { className: "text-text-primary text-sm font-bold", children: name }), _jsxs("span", { className: "text-text-muted text-[10px]", children: ["(", code, ")"] })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: providers.map(p => (_jsxs("div", { className: "flex items-center gap-1.5 bg-white rounded-lg px-3 py-2", children: [_jsx("img", { src: `${IMG_BASE}/w92${p.logo_path}`, alt: p.provider_name, className: "w-5 h-5 rounded-md object-cover", loading: "lazy" }), _jsx("span", { className: "text-black text-[11px] font-bold", children: p.provider_name })] }, p.provider_id))) })] }, code))) }), availableRegions.length > 8 && (_jsxs("p", { className: "text-text-muted text-[10px] mt-3 text-center", children: ["+", availableRegions.length - 8, " more countries available"] }))] })), detail.production_companies?.length > 0 && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.25 }, className: "mb-10", children: [_jsx("h3", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4", children: "Production" }), _jsx("div", { className: "flex flex-wrap gap-3", children: detail.production_companies.map(c => (_jsxs(Link, { to: `/company/${c.id}`, className: "flex items-center gap-2.5 bg-white rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:scale-105 transition-all", children: [c.logo_path ? (_jsx("img", { src: `${IMG_BASE}/w154${c.logo_path}`, alt: c.name, className: "h-8 w-auto object-contain", loading: "lazy", onError: (e) => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.nextElementSibling; if (fb)
                                                    fb.style.display = 'flex'; } })) : null, _jsx("div", { className: `w-8 h-8 rounded-lg bg-zinc-200 items-center justify-center ${c.logo_path ? 'hidden' : 'flex'}`, style: c.logo_path ? { display: 'none' } : undefined, children: _jsx("span", { className: "text-zinc-500 text-sm font-black", children: c.name.charAt(0) }) })] }, c.id))) })] })), similar.length > 0 && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.3 }, className: "mb-10 relative group", children: [_jsxs("h3", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted mb-4", children: ["Similar ", isTv ? 'TV Shows' : 'Movies'] }), _jsx("button", { onClick: () => scroll(similarScrollRef, 'left'), className: "absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2", children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }) }), _jsx("div", { ref: similarScrollRef, className: "flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide", children: similar.map((m, i) => (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: 0.15 + i * 0.06 }, children: _jsxs(Link, { to: `/${isTv ? 'tv' : 'movie'}/${m.id}`, onClick: () => scrollRef.current?.scrollTo({ top: 0 }), className: "block shrink-0 w-28 sm:w-32 cursor-pointer group/card", children: [_jsxs("div", { className: "relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]", children: [m.poster_path ? (_jsx("img", { src: `${IMG_BASE}/w342${m.poster_path}`, alt: m.title, className: "w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105", loading: "lazy" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-zinc-700 text-sm font-bold", children: m.title?.charAt(0) })), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" }), _jsxs("div", { className: "absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-accent text-[9px] font-mono font-bold px-1 py-0.5 rounded", children: ["\u2605 ", m.vote_average?.toFixed(1)] })] }), _jsx("p", { className: "text-text-primary text-[11px] font-bold line-clamp-1 mt-1.5 group-hover/card:text-accent transition-colors", children: m.title })] }) }, m.id))) }), _jsx("button", { onClick: () => scroll(similarScrollRef, 'right'), className: "absolute right-0 top-[40%] -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2", children: _jsx("polyline", { points: "9 18 15 12 9 6" }) }) })] }))] })] }) }));
}
