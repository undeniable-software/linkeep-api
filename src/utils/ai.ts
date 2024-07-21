import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
import { getUserCategories } from './db/queries';

dotenv.config();

const testLabels = [
  'cat memes',
  'shower thoughts',
  'dad jokes',
  'conspiracy theories',
  'food porn',
  'ai article',
];

async function getLabels(userId: string) {
  const labels = await getUserCategories(userId);
  return labels.reduce(
    (
      acc: Record<string, string>,
      label: {
        id: string;
        name: string;
        user_id: string;
        created_at: Date | null;
        updated_at: Date | null;
      }
    ) => {
      acc[label.name.toUpperCase()] = label.name;
      return acc;
    },
    {}
  );
}

const prompt = async (data: string, userId: string) => {
  const labels = await getLabels(userId);

  return `As an advanced content classifier, your task is to categorize the given content into one of these predefined categories: ${Object.values(
    labels
  ).join(', ')}. 

After selecting the most appropriate category, provide up to 3 alternative suggestions that capture the essence of the content. These suggestions should:

1. Be concise and specific to the content while maintaining broad appeal
2. Relate to human interests, emotions, and perspectives
3. Facilitate easy content discovery and recall
4. Balance uniqueness with commonly used search terms
5. Transcend traditional classification labels
6. Reflect the content's core themes or ideas

Aim for a mix of creativity and practicality in your suggestions, keeping them brief and category-like. Your goal is to provide insightful, human-centric categories that serve as effective search terms and aid in content organization.

When formulating your suggestions, consider:
- The main topic or subject matter
- The tone or style of the content
- Any unique angles or perspectives presented
- Broader themes or trends the content relates to

Keep your suggestions concise and to the point, as they will be used as categories.

Content to classify: ${data}

Remember, your chosen category must be one of the predefined categories provided. For the alternative suggestions, prioritize those that would be most useful for finding or categorizing the content in the future, while keeping them short and category-like.`;
};

const oai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict',
});

export async function classify(
  content: string,
  userId: string,
  intent?: string
): Promise<TextClassification> {
  const classification = await generateObject({
    model: oai('gpt-4o-mini'),
    schema: TextClassificationSchema,
    prompt: await prompt(content, userId),
  });

  return classification.object;
}

export const TextClassificationSchema = z.object({
  label: z.string(),
  suggestions: z.array(z.string()).max(3),
});

export type TextClassification = z.infer<typeof TextClassificationSchema>;
