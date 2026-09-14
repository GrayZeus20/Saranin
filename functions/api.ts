import { Elysia, t } from 'elysia';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

const app = new Elysia()
  .get('/', () => new Response('MovieFlix API'))
  .get('/movie/:id', async ({ params }) => {
    const url = `https://api.themoviedb.org/3/movie/${params.id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,watch/providers,recommendations`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  })
  .get('/search', async ({ query }) => {
    const q = query.q ?? '';
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  })
  .get('/trending', async () => {
    const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  });

export default {
  async fetch(request: Request, env: Record<string, any>, ctx: any) {
    return app.handle(request);
  },
};
