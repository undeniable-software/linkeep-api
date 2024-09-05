import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { checkStripeSubscription } from './utils/db/queries';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { fetchWebPage, getReadableContent } from './utils/processing';
import { classify } from './utils/ai';
import { saveLink } from './utils/db/queries';
import {
  FetchError,
  ContentExtractionError,
  ClassificationError,
} from './utils/errors';
import { posthogClient } from './utils/analytics';
import { sign } from 'hono/jwt';
import dotenv from 'dotenv';

dotenv.config();

const app = new Hono();

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

app.get('/get-subscription-token', async (c) => {
  const auth = getAuth(c);

  if (!auth || !auth.userId) {
    return c.json(
      { message: 'You are not authorized to access this resource.' },
      401
    );
  }

  try {
    const userId = auth.userId;
    const isSubscribed = await checkStripeSubscription(userId);

    const token = await sign(
      {
        userId: userId,
        subscriptionStatus: isSubscribed,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Expires in 24 hours
      },
      process.env.JWT_SECRET as string
    );

    return c.json({ token });
  } catch (error) {
    console.error('Error generating subscription token:', error);
    return c.json(
      { message: 'An error occurred while generating the subscription token.' },
      500
    );
  }
});

const BodySchema = z.object({
  url: z.string().url(),
  intent: z.string().optional(),
});

app.post('/classify', zValidator('json', BodySchema), async (c) => {
  const auth = getAuth(c);

  if (!auth || !auth.userId) {
    return c.json(
      { message: 'You are not authorized to access this resource.' },
      401
    );
  }

  try {
    const { url, intent } = await c.req.valid('json');

    const rawHTML = await fetchWebPage(url);
    if (!rawHTML) {
      throw new FetchError('Failed to fetch web page');
    }

    const readableContent = getReadableContent(rawHTML, url);
    if (!readableContent || !readableContent.content) {
      throw new ContentExtractionError('Failed to extract readable content');
    }

    const classification = await classify(
      readableContent.content,
      auth.userId,
      intent || ''
    );
    if (!classification) {
      throw new ClassificationError('Failed to classify content');
    }

    const data = {
      url,
      title: readableContent.title || 'Untitled',
      intent,
      classification: classification.label,
      suggestions: classification.suggestions,
      siteName: readableContent.siteName,
    };

    await saveLink(data, auth.userId);

    // Track successful link saving
    posthogClient.capture({
      distinctId: 'global',
      event: 'link-saved',
    });

    return c.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in classification process:', {
        message: error.message,
        stack: error.stack,
        // Include any other relevant details for debugging
      });
    } else {
      console.error('Error in classification process:', {
        message: 'An unknown error occurred',
        // Include any other relevant details for debugging
      });
    }

    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;

    if (error instanceof FetchError) {
      errorMessage = error.message;
      statusCode = 404;
    } else if (error instanceof ContentExtractionError) {
      errorMessage = error.message;
      statusCode = 422;
    } else if (error instanceof ClassificationError) {
      errorMessage = error.message;
      statusCode = 422;
    }

    return c.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
});

const port = 8080;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await posthogClient.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await posthogClient.shutdown();
  process.exit(0);
});
