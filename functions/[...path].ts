import { Elysia } from 'elysia';
import api from './api';

const app = new Elysia().use(api);

export default {
  async fetch(request: Request, env: Record<string, string>, ctx: any) {
    return app.handle(request);
  },
};
