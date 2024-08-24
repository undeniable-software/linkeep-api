import { db } from './db';
import { links, userLinks, categories, stripeCustomers } from './schema';
import { sql, eq, and } from 'drizzle-orm';
import { DatabaseError, NotFoundError } from '../errors';

interface LinkData {
  url: string;
  title: string;
  intent?: string;
  classification: string;
}

export async function saveLink(data: LinkData, userId: string) {
  try {
    const categoryId = await getCategoryId(data.classification, userId);

    // Insert the link into the links table
    const insertedLink = await db
      .insert(links)
      .values({
        url: data.url,
        title: data.title,
        user_id: userId,
        category_id: categoryId,
      })
      .returning();

    if (insertedLink.length === 0) {
      throw new DatabaseError('Failed to insert link');
    }

    const linkId = insertedLink[0].id;

    // Insert the user link into the user_links table
    // await db.insert(userLinks).values({
    //   link_id: linkId,
    //   user_id: userId,
    // });

    return {
      success: true,
      data: {
        ...data,
        id: linkId,
      },
    };
  } catch (error) {
    console.error('Error saving link:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      data,
      userId,
    });
    throw new DatabaseError('Failed to save link');
  }
}

async function getCategoryId(
  categoryName: string,
  userId: string
): Promise<string> {
  try {
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

    return category[0].id;
  } catch (error) {
    console.error('Error fetching category ID:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      categoryName,
      userId,
    });
    throw new DatabaseError('Failed to fetch category ID');
  }
}

export async function getUserCategories(userId: string) {
  try {
    const labels = await db
      .select()
      .from(categories)
      .where(eq(categories.user_id, userId));
    return labels;
  } catch (error) {
    console.error('Error fetching user categories:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      userId,
    });
    throw new DatabaseError('Failed to fetch user categories');
  }
}

export async function checkStripeSubscription(userId: string) {
  const user = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.user_id, userId));

  if (user.length === 0) {
    return false;
  }

  switch (user[0].current_sub_status) {
    case 'active':
      return true;
    case 'inactive':
      return false;
  }
}
