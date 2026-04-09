import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { products, productImages, vehicleFitments, categories } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getMeiliClient } from '$lib/server/search/client.js';

export const load: PageServerLoad = async ({ params }) => {
  const [product] = await db.select().from(products).where(eq(products.slug, params.slug));
  if (!product || !product.isActive) error(404, 'NOT_FOUND');

  const [category] = await db.select().from(categories).where(eq(categories.id, product.categoryId));
  const images = await db.select().from(productImages).where(eq(productImages.productId, product.id));
  const fitments = await db.select().from(vehicleFitments).where(eq(vehicleFitments.productId, product.id));

  let related: any[] = [];
  try {
    const client = getMeiliClient();
    const r = await client.index('products').search('', {
      filter: `category_id = "${product.categoryId}" AND is_active = true AND id != "${product.id}"`,
      limit: 6
    });
    related = r.hits;
  } catch { /* non-fatal */ }

  return { product, category, images, fitments, related };
};
