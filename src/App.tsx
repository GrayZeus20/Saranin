import { useState, useEffect } from 'react';

const TMDB_API_KEY = '80d19e918579975796277c1524311029';
const BASE_URL = 'https://api.themoviedb.org/3';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  release_date: string;
  genre_ids: number[];
}

interface Genre {
  id: number;
  name: string;
}

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('');

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

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <h1 className="text-4xl font-bold text-white mb-8">MovieFlix Popular</h1>
      
      <div className="mb-8 flex gap-4">
        <select 
          className="bg-slate-800 text-white p-2 rounded"
          onChange={(e) => setSelectedGenre(e.target.value)}
        >
          <option value="">All Genres</option>
          {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {filteredMovies.map(movie => (
          <div key={movie.id} className="bg-slate-900 rounded-lg overflow-hidden">
            <img 
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
              alt={movie.title}
              className="w-full"
            />
            <div className="p-3">
              <h2 className="text-sm font-semibold text-white truncate">{movie.title}</h2>
              <p className="text-xs text-slate-400">{movie.release_date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}