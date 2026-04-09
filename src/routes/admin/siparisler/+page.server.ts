import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { orders } from '$lib/server/db/schema.js';
import { desc, eq, gte, lte, and, sql } from 'drizzle-orm';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ url }) => {
  const status = url.searchParams.get('durum') ?? '';
  const dateFrom = url.searchParams.get('tarih_baslangic') ?? '';
  const dateTo = url.searchParams.get('tarih_bitis') ?? '';
  const page = Math.max(1, Number(url.searchParams.get('sayfa') ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];
  if (status) conditions.push(eq(orders.status, status as any));
  if (dateFrom) conditions.push(gte(orders.createdAt, new Date(dateFrom)));
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(orders.createdAt, end));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [allOrders, [{ count }]] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(PAGE_SIZE).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(where)
  ]);

  return { orders: allOrders, total: Number(count), page, status, dateFrom, dateTo };
};
