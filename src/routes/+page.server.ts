import type { PageServerLoad } from './$types';
import { getMeiliClient } from '$lib/server/search/client.js';
import { db } from '$lib/server/db/index.js';
import { categories } from '$lib/server/db/schema.js';
import { isNull } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const topCategories = await db.select().from(categories).where(isNull(categories.parentId));
  let featured: any[] = [];
  try {
    const client = getMeiliClient();
    const result = await client.index('products').search('', {
      filter: 'is_featured = true AND is_active = true',
      limit: 12
    });
    featured = result.hits;
  } catch { /* Meilisearch may not be running in dev */ }
  return { categories: topCategories, featured };
};
