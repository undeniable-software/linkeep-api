import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { fetchWebPage, getReadableContent } from '../utils/processing';
import { classify } from '../utils/ai';
import { saveLink } from '../utils/db/queries';
import { getAuth } from '@hono/clerk-auth';
import {
  FetchError,
  ContentExtractionError,
  ClassificationError,
} from '../utils/errors';

export const classifyRoute = new Hono();

const BodySchema = z.object({
  // needs https
  url: z.string().url(),
  intent: z.string().optional(),
});

classifyRoute.post('/', zValidator('json', BodySchema), async (c) => {
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

    const readableContent = getReadableContent(rawHTML);
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
    };

    await saveLink(data, auth.userId);

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
