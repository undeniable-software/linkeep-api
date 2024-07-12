import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { fetchWebPage, getReadableContent } from '../utils/processing';
import { classify } from '../utils/ai';

export const classifyRoute = new Hono();

const BodySchema = z.object({
  // needs https
  url: z.string().url(),
  title: z.string(),
  intent: z.string().optional(),
});

classifyRoute.post('/', zValidator('json', BodySchema), async (c) => {
  try {
    const { url, title, intent } = await c.req.valid('json');

    const rawHTML = await fetchWebPage(url);
    if (!rawHTML) {
      throw new Error('Failed to fetch web page');
    }

    const readableContent = getReadableContent(rawHTML);
    if (!readableContent || !readableContent.content) {
      throw new Error('Failed to extract readable content');
    }

    const classification = await classify(readableContent.content, intent);
    if (!classification) {
      throw new Error('Failed to classify content');
    }

    const data = {
      url,
      title: title || 'Untitled',
      intent,
      classification,
    };

    //await saveLink(data);

    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in classification process:', error);
    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      switch (error.message) {
        case 'Failed to fetch web page':
          statusCode = 404;
          break;
        case 'Failed to extract readable content':
        case 'Failed to classify content':
          statusCode = 422;
          break;
      }
    }

    // return c.json({ success: false, error: errorMessage }, statusCode);
  }
});
