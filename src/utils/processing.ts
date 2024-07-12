import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export async function fetchWebPage(url: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/html' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    console.error('Error fetching web page:', error);
    throw new Error('Failed to fetch web page');
  }
}

export function getReadableContent(html: string) {
  try {
    const doc = new JSDOM(html);
    const reader = new Readability(doc.window.document);
    const readable = reader.parse();

    if (!readable) {
      throw new Error('No readable content found');
    }

    let data = {
      title: readable.title || 'Untitled',
      content: readable.textContent?.trim() || 'No content available',
    };

    return data;
  } catch (error) {
    console.error('Error parsing readable content:', error);
    throw new Error('Failed to get readable content');
  }
}
