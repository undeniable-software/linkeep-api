import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { classifyRoute } from './routes/classify';
// import { getAllLinksForUser } from './utils/db/queries';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';

const app = new Hono();
app.use('*', clerkMiddleware());

app.get('/', (c) => {
  const auth = getAuth(c);

  if (auth?.userId) {
    return c.json(
      { message: 'You are not authorized to access this resource.' },
      401
    );
  }
  return c.text('Hello Hono!');
});

app.route('/classify', classifyRoute);

// app.post('/links', async (c) => {
//   const { user_id } = await c.req.json();

//   const links = await getAllLinksForUser();
//   return c.json(links);
// });

const port = 8080;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
