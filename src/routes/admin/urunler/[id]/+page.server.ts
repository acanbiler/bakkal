import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index.js';
import { products, productImages, vehicleFitments, categories } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { syncProductToMeilisearch, deleteProductFromMeilisearch } from '$lib/server/search/sync.js';

export const load: PageServerLoad = async ({ params }) => {
  const isNew = params.id === 'yeni';
  const cats = await db.select().from(categories);

  if (isNew) {
    return { product: null, images: [], fitments: [], categories: cats, isNew: true };
  }

  const [product] = await db.select().from(products).where(eq(products.id, params.id));
  if (!product) redirect(302, '/admin/urunler');

  const [images, fitments] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, product.id)),
    db.select().from(vehicleFitments).where(eq(vehicleFitments.productId, product.id))
  ]);

  return { product, images, fitments, categories: cats, isNew: false };
};

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const actions: Actions = {
  save: async ({ request, params }) => {
    const data = await request.formData();
    const isNew = params.id === 'yeni';

    const name = String(data.get('name') ?? '').trim();
    const slugInput = String(data.get('slug') ?? '').trim();
    const sku = String(data.get('sku') ?? '').trim();
    const price = String(data.get('price') ?? '').trim();
    const comparePrice = String(data.get('comparePrice') ?? '').trim() || null;
    const stockQty = parseInt(String(data.get('stockQty') ?? '0'), 10);
    const categoryId = String(data.get('categoryId') ?? '').trim();
    const brand = String(data.get('brand') ?? '').trim() || null;
    const description = String(data.get('description') ?? '').trim() || null;
    const metaTitle = String(data.get('metaTitle') ?? '').trim() || null;
    const metaDescription = String(data.get('metaDescription') ?? '').trim() || null;

    // Validate
    if (name.length < 2 || name.length > 255) return fail(400, { error: 'Ad 2–255 karakter olmalıdır.' });
    if (!sku || sku.length > 100) return fail(400, { error: 'SKU zorunlu, max 100 karakter.' });
    if (!price || isNaN(Number(price)) || Number(price) <= 0) return fail(400, { error: 'Geçerli bir fiyat girin.' });
    if (comparePrice && Number(comparePrice) <= Number(price)) return fail(400, { error: 'Karşılaştırma fiyatı satış fiyatından büyük olmalıdır.' });
    if (isNaN(stockQty) || stockQty < 0) return fail(400, { error: 'Stok 0 veya daha büyük olmalıdır.' });
    if (!categoryId) return fail(400, { error: 'Kategori seçin.' });

    const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId));
    if (!cat) return fail(400, { error: 'Geçersiz kategori.' });

    const slug = slugInput || makeSlug(name);

    if (isNew) {
      const id = randomUUID();
      await db.insert(products).values({
        id, name, slug, sku, price, comparePrice, stockQty, categoryId, brand,
        description, metaTitle, metaDescription, isActive: false, updatedAt: new Date()
      });
      syncProductToMeilisearch(id).catch(() => {});
      redirect(302, `/admin/urunler/${id}`);
    } else {
      await db.update(products).set({
        name, slug, sku, price, comparePrice, stockQty, categoryId, brand,
        description, metaTitle, metaDescription, updatedAt: new Date()
      }).where(eq(products.id, params.id));
      syncProductToMeilisearch(params.id).catch(() => {});
      return { success: true };
    }
  },

  delete: async ({ params }) => {
    if (params.id === 'yeni') return;
    await db.delete(products).where(eq(products.id, params.id));
    deleteProductFromMeilisearch(params.id).catch(() => {});
    redirect(302, '/admin/urunler');
  },

  'toggle-active': async ({ params }) => {
    const [p] = await db.select({ isActive: products.isActive }).from(products).where(eq(products.id, params.id));
    if (!p) return;
    await db.update(products).set({ isActive: !p.isActive, updatedAt: new Date() }).where(eq(products.id, params.id));
    syncProductToMeilisearch(params.id).catch(() => {});
  },

  'toggle-featured': async ({ params }) => {
    const [p] = await db.select({ isFeatured: products.isFeatured }).from(products).where(eq(products.id, params.id));
    if (!p) return;
    await db.update(products).set({ isFeatured: !p.isFeatured, updatedAt: new Date() }).where(eq(products.id, params.id));
    syncProductToMeilisearch(params.id).catch(() => {});
  },

  'add-image': async ({ request, params }) => {
    const data = await request.formData();
    const url = String(data.get('url') ?? '').trim();
    const altText = String(data.get('altText') ?? '').trim() || null;
    const isPrimary = data.get('isPrimary') === 'true';
    if (!url) return fail(400, { error: 'URL zorunludur.' });
    if (isPrimary) {
      await db.update(productImages).set({ isPrimary: false }).where(eq(productImages.productId, params.id));
    }
    await db.insert(productImages).values({
      id: randomUUID(), productId: params.id, url, altText, isPrimary, sortOrder: 0
    });
    syncProductToMeilisearch(params.id).catch(() => {});
  },

  'remove-image': async ({ request, params }) => {
    const data = await request.formData();
    const imageId = String(data.get('imageId') ?? '');
    await db.delete(productImages).where(
      and(eq(productImages.id, imageId), eq(productImages.productId, params.id))
    );
    syncProductToMeilisearch(params.id).catch(() => {});
  },

  'add-fitment': async ({ request, params }) => {
    const data = await request.formData();
    const make = String(data.get('make') ?? '').trim();
    const model = String(data.get('model') ?? '').trim();
    const yearFrom = parseInt(String(data.get('yearFrom') ?? ''), 10);
    const yearTo = parseInt(String(data.get('yearTo') ?? ''), 10);
    const notes = String(data.get('notes') ?? '').trim() || null;
    if (!make || !model || isNaN(yearFrom) || isNaN(yearTo)) return fail(400, { error: 'Araç bilgileri eksik.' });
    await db.insert(vehicleFitments).values({
      id: randomUUID(), productId: params.id, make, model, yearFrom, yearTo, notes
    });
    syncProductToMeilisearch(params.id).catch(() => {});
  },

  'remove-fitment': async ({ request, params }) => {
    const data = await request.formData();
    const fitmentId = String(data.get('fitmentId') ?? '');
    await db.delete(vehicleFitments).where(
      and(eq(vehicleFitments.id, fitmentId), eq(vehicleFitments.productId, params.id))
    );
    syncProductToMeilisearch(params.id).catch(() => {});
  }
};
