import { PostHog } from 'posthog-node';
import dotenv from 'dotenv';

dotenv.config();

export const posthogClient = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: 'https://us.i.posthog.com',
});

function trackLinkSaving() {
  posthogClient.capture({
    distinctId: 'global',
    event: 'link-saved',
  });
}

function trackClassificationFailureByDomain(url: string) {
  const domain = new URL(url).hostname;
  posthogClient.capture({
    distinctId: 'global',
    event: 'classification-failure',
    properties: {
      domain,
    },
  });
}
