import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
const TMDB_API_KEY = '80d19e918579975796277c1524311029';
const BASE_URL = 'https://api.themoviedb.org/3';
export default function App() {
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState('');
    useEffect(() => {
        fetch(`${BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`)
            .then(res => res.json())
            .then(data => setMovies(data.results));
        fetch(`${BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`)
            .then(res => res.json())
            .then(data => setGenres(data.genres));
    }, []);
    const filteredMovies = selectedGenre
        ? movies.filter(m => m.genre_ids.includes(Number(selectedGenre)))
        : movies;
    return (_jsxs("div", { className: "min-h-screen bg-slate-950 p-6", children: [_jsx("h1", { className: "text-4xl font-bold text-white mb-8", children: "MovieFlix Popular" }), _jsx("div", { className: "mb-8 flex gap-4", children: _jsxs("select", { className: "bg-slate-800 text-white p-2 rounded", onChange: (e) => setSelectedGenre(e.target.value), children: [_jsx("option", { value: "", children: "All Genres" }), genres.map(g => _jsx("option", { value: g.id, children: g.name }, g.id))] }) }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6", children: filteredMovies.map(movie => (_jsxs("div", { className: "bg-slate-900 rounded-lg overflow-hidden", children: [_jsx("img", { src: `https://image.tmdb.org/t/p/w500${movie.poster_path}`, alt: movie.title, className: "w-full" }), _jsxs("div", { className: "p-3", children: [_jsx("h2", { className: "text-sm font-semibold text-white truncate", children: movie.title }), _jsx("p", { className: "text-xs text-slate-400", children: movie.release_date })] })] }, movie.id))) })] }));
}
