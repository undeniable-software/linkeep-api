import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { checkStripeSubscription } from './utils/db/queries';
import { cors } from 'hono/cors';

export const app = new Hono();

app.use(
  '*',
  clerkMiddleware(),
  cors({
    origin: [
      'chrome-extension://lhmaiopbmgceajpnadgcddokdjfjbmap',
      'chrome-extension://lkhfmfeekcpejadphjpajcaahakealon',
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.get('/test-route', (c) => {
  const auth = getAuth(c);

  // i know this is wrong
  if (auth?.userId) {
    return c.json(
      { message: 'You are not authorized to access this resource.' },
      401
    );
  }
  return c.text('Hello Hono!');
});

app.post('/subscription-check', async (c) => {
  const auth = getAuth(c);

  if (!auth || !auth.userId) {
    return c.json(
      { message: 'You are not authorized to access this resource.' },
      401
    );
  }

  const userId = auth.userId;
  const isSubscribed = await checkStripeSubscription(userId);

  return c.json({ isSubscribed });
});

const port = 8080;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
