import { db } from './db';
import { links, userLinks, categories, stripeCustomers } from './schema';
import { sql, eq, and } from 'drizzle-orm';
import { DatabaseError, NotFoundError } from '../errors';

interface LinkData {
  url: string;
  title: string;
  intent?: string;
  classification: string;
  siteName: string;
}

export async function saveLink(data: LinkData, userId: string) {
  try {
    console.log(`Attempting to save link for user ${userId}:`, data);

    const categoryId = await getCategoryId(data.classification, userId);
    console.log(`Retrieved category ID: ${categoryId}`);

    const insertedLink = await db
      .insert(links)
      .values({
        url: data.url,
        title: data.title,
        user_id: userId,
        category_id: categoryId,
        siteName: data.siteName,
      })
      .returning();

    if (insertedLink.length === 0) {
      throw new DatabaseError('Failed to insert link');
    }

    const linkId = insertedLink[0].id;
    console.log(`Link inserted successfully with ID: ${linkId}`);

    return {
      success: true,
      data: {
        ...data,
        id: linkId,
      },
    };
  } catch (error) {
    console.error('Error saving link:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      data,
      userId,
    });

    if (error instanceof DatabaseError || error instanceof NotFoundError) {
      console.error(`${error.constructor.name} details:`, error);
    }

    throw new DatabaseError('Failed to save link');
  }
}

async function getCategoryId(
  categoryName: string,
  userId: string
): Promise<string> {
  try {
    console.log(
      `Fetching category ID for '${categoryName}' and user '${userId}'`
    );

    const category = await db
      .select()
      .from(categories)
      .where(
        and(eq(categories.name, categoryName), eq(categories.user_id, userId))
      );

    if (category.length === 0) {
      throw new NotFoundError(
        `Category '${categoryName}' not found for user '${userId}'`
      );
    }

    console.log(`Category found:`, category[0]);

    return category[0].id;
  } catch (error) {
    console.error('Error fetching category ID:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      categoryName,
      userId,
    });
    throw new DatabaseError('Failed to fetch category ID');
  }
}

export async function getUserCategories(userId: string) {
  try {
    console.log(`Fetching categories for user '${userId}'`);

    const labels = await db
      .select()
      .from(categories)
      .where(eq(categories.user_id, userId));

    console.log(`Retrieved ${labels.length} categories for user '${userId}'`);

    return labels;
  } catch (error) {
    console.error('Error fetching user categories:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId,
    });
    throw new DatabaseError('Failed to fetch user categories');
  }
}

export async function checkStripeSubscription(userId: string) {
  console.log(`Checking Stripe subscription for user '${userId}'`);

  const user = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.user_id, userId));

  if (user.length === 0) {
    console.log(`No Stripe customer found for user '${userId}'`);
    return false;
  }

  const subscriptionStatus = user[0].current_sub_status;
  console.log(
    `Subscription status for user '${userId}': ${subscriptionStatus}`
  );

  switch (subscriptionStatus) {
    case 'active':
      return true;
    case 'inactive':
      return false;
  }
}
