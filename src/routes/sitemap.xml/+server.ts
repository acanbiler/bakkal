import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { products, categories } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
  const base = process.env.PUBLIC_BASE_URL ?? '';
  const allProducts = await db.select({ slug: products.slug })
    .from(products).where(eq(products.isActive, true));
  const allCategories = await db.select({ slug: categories.slug }).from(categories);

  const urls = [
    `<url><loc>${base}/</loc></url>`,
    `<url><loc>${base}/urunler</loc></url>`,
    ...allCategories.map(c => `<url><loc>${base}/urunler?kategori=${c.slug}</loc></url>`),
    ...allProducts.map(p => `<url><loc>${base}/urunler/${p.slug}</loc></url>`)
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
