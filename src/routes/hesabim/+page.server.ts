import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { orders } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/giris');
  const userOrders = await db.select().from(orders)
    .where(eq(orders.userId, locals.user.id))
    .orderBy(desc(orders.createdAt));
  return { orders: userOrders };
};
