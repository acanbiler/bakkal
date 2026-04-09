import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index.js';
import { categories } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const all = await db.select().from(categories);
  return { categories: all };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const name = String(data.get('name') ?? '').trim();
    const parentId = String(data.get('parentId') ?? '').trim() || null;
    const imageUrl = String(data.get('imageUrl') ?? '').trim() || null;

    if (!name) return fail(400, { error: 'Ad zorunludur.' });

    const slug = name
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    await db.insert(categories).values({ id: randomUUID(), name, slug, parentId, imageUrl });
    redirect(303, '/admin/kategoriler');
  },

  update: async ({ request }) => {
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    const name = String(data.get('name') ?? '').trim();
    const parentId = String(data.get('parentId') ?? '').trim() || null;
    const imageUrl = String(data.get('imageUrl') ?? '').trim() || null;

    if (!id || !name) return fail(400, { error: 'Eksik alan.' });

    const slug = name
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    await db.update(categories).set({ name, slug, parentId, imageUrl }).where(eq(categories.id, id));
    redirect(303, '/admin/kategoriler');
  },

  delete: async ({ request }) => {
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    if (!id) return fail(400, { error: 'ID zorunludur.' });
    await db.delete(categories).where(eq(categories.id, id));
    redirect(303, '/admin/kategoriler');
  }
};
