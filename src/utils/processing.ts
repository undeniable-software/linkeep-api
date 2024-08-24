import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { FetchError, ContentExtractionError } from './errors';
import { URL } from 'url';

interface ReadableContent {
  content: string;
  title: string;
  siteName: string;
}

export async function fetchWebPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/html' },
    });

    if (!response.ok) {
      throw new FetchError(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    console.error('Error fetching web page:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      url,
    });
    throw new FetchError('Failed to fetch web page');
  }
}

export function getReadableContent(html: string, url: string): ReadableContent {
  try {
    const doc = new JSDOM(html);
    const reader = new Readability(doc.window.document);
    const readable = reader.parse();

    if (!readable) {
      throw new ContentExtractionError('No readable content found');
    }

    const siteName = new URL(url).hostname;

    const data: ReadableContent = {
      content: readable.textContent?.trim() || 'No content available',
      title: readable.title || 'No title available',
      siteName: siteName || 'No site name available',
    };

    return data;
  } catch (error) {
    console.error('Error parsing readable content:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      htmlSnippet: html.slice(0, 100), // Log a snippet of the HTML for context
    });
    throw new ContentExtractionError('Failed to get readable content');
  }
}
