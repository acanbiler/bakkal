import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { products, categories } from '$lib/server/db/schema.js';
import { desc, ilike, or, sql } from 'drizzle-orm';
import { syncProductToMeilisearch } from '$lib/server/search/sync.js';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const page = Math.max(1, Number(url.searchParams.get('sayfa') ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  const where = q
    ? or(ilike(products.name, `%${q}%`), ilike(products.sku, `%${q}%`))
    : undefined;

  const [allProducts, cats, [{ count }]] = await Promise.all([
    db.select().from(products).where(where).orderBy(desc(products.createdAt)).limit(PAGE_SIZE).offset(offset),
    db.select({ id: categories.id, name: categories.name }).from(categories),
    db.select({ count: sql<number>`count(*)` }).from(products).where(where)
  ]);

  return { products: allProducts, categories: cats, total: Number(count), page, q };
};

export const actions: Actions = {
  'csv-import': async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('csv');
    if (!(file instanceof File)) return fail(400, { error: 'CSV dosyası gerekli.' });

    const text = await file.text();
    const lines = text.trim().split('\n').slice(1); // skip header
    const cats = await db.select().from(categories);
    const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

    let imported = 0;
    const { randomUUID } = await import('crypto');

    for (const line of lines) {
      const [name, sku, price, stock, category_slug, brand] = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      if (!name || !sku || !price || !category_slug) continue;
      const categoryId = catBySlug[category_slug];
      if (!categoryId) continue;

      const slug = name
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const id = randomUUID();
      await db
        .insert(products)
        .values({
          id,
          name,
          slug: `${slug}-${id.slice(0, 6)}`,
          sku,
          price,
          stockQty: Number(stock ?? 0),
          categoryId,
          brand: brand || null,
          isActive: false,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: products.sku,
          set: { name, price, stockQty: Number(stock ?? 0), brand: brand || null, updatedAt: new Date() }
        });

      // Fire-and-forget sync
      syncProductToMeilisearch(id).catch(() => {});
      imported++;
    }

    return { imported };
  }
};
