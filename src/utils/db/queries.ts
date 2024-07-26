import { db } from './db';
import { links, userLinks, categories } from './schema';
import { sql, eq, inArray } from 'drizzle-orm';

export async function saveLink(
  data: {
    url: string;
    title: string;
    intent?: string;
    classification: string;
  },
  userId: string
) {
  try {
    // Insert the link into the links table
    const insertedLink = await db
      .insert(links)
      .values({
        url: data.url,
        title: data.title,
        user_id: userId,
      })
      .returning();

    if (insertedLink.length === 0) {
      throw new Error('Failed to insert link');
    }

    const linkId = insertedLink[0].id;

    // Insert the user link into the user_links table
    await db.insert(userLinks).values({
      link_id: linkId,
      user_id: userId,
    });

    return {
      success: true,
      data: {
        ...data,
        id: linkId,
      },
    };
  } catch (error) {
    console.error('Error saving link:', error);
    throw new Error('Failed to save link');
  }
}

// for testing purposes
// export async function getAllLinksForUser() {
//   try {
//     const userLinksData = await db
//       .select()
//       .from(userLinks)
//       .where(eq(userLinks.user_id, sql`requesting_user_id()`));

//     if (userLinksData.length === 0) {
//       return {
//         success: true,
//         data: [],
//       };
//     }

//     const linkIds = userLinksData
//       .map((userLink) => userLink.link_id)
//       .filter((linkId): linkId is string => linkId !== null);

//     const linksData = await db
//       .select()
//       .from(links)
//       .where(inArray(links.id, linkIds));

//     return {
//       success: true,
//       data: linksData,
//     };
//   } catch (error) {
//     console.error('Error fetching links for user:', error);
//     throw new Error('Failed to fetch links for user');
//   }
// }

export function getUserCategories(userId: string) {
  return db.select().from(categories).where(eq(categories.user_id, userId));
}
