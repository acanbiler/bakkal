import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { orders, products } from '$lib/server/db/schema.js';
import { sql, lt, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [revenueToday] = await db.execute(sql`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM orders
    WHERE payment_status = 'BASARILI' AND created_at >= ${today}
  `);
  const [revenueMonth] = await db.execute(sql`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM orders
    WHERE payment_status = 'BASARILI' AND created_at >= ${monthStart}
  `);
  const lowStock = await db.select().from(products).where(lt(products.stockQty, 5));
  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10);

  return { revenueToday: revenueToday.total, revenueMonth: revenueMonth.total, lowStock, recentOrders };
};
