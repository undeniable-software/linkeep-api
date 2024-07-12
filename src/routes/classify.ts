import { Hono } from 'hono';

export const classifyRoute = new Hono();

classifyRoute.post('/', (c) => {
  return c.text('Hello Hono!');
});
