import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const testLabels = ['Blog', 'News', 'Article', 'Video'];

async function getLabels() {
  const labels = await testLabels;
  return labels.reduce((acc: Record<string, string>, label: string) => {
    acc[label.toUpperCase()] = label;
    return acc;
  }, {});
}

const prompt = async (data: string) => {
  const labels = await getLabels();
  return `As an advanced content classifier, your task is to categorize the given content into one of these predefined categories: ${Object.values(
    labels
  ).join(', ')}. 

After selecting the most appropriate category, provide up to 3 alternative suggestions that capture the essence of the content. These suggestions should:

1. Be highly specific to the content
2. Relate to human interests and perspectives
3. Facilitate easy content discovery later
4. Balance uniqueness with common search terms
5. Not be limited to traditional classification labels

Rank your suggestions from most to least useful for finding the content later. Aim for a mix of creativity and practicality. Your goal is to provide insightful, human-centric categories that also serve as effective search terms.

Content to classify: ${data}

Please respond with:
1. The chosen category from the predefined list
2. Up to 3 ranked alternative suggestions that best describe the content's core themes or ideas, optimized for future discoverability`;
};

const oai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict',
});

export async function classify(
  content: string,
  intent?: string
): Promise<TextClassification> {
  const classification = await generateObject({
    model: oai('gpt-4o'),
    schema: TextClassificationSchema,
    prompt: await prompt(content),
  });
  console.log(classification);

  return classification.object;
}

export const TextClassificationSchema = z.object({
  label: z.string(),
  suggestions: z.array(z.string()).max(3),
});

export type TextClassification = z.infer<typeof TextClassificationSchema>;
