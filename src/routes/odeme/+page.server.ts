import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { addresses } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) return { savedAddresses: [] };
  const savedAddresses = await db.select().from(addresses).where(eq(addresses.userId, locals.user.id));
  return { savedAddresses };
};
