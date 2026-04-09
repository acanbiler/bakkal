import { json, error } from '@sveltejs/kit';
import { getMeiliClient } from '$lib/server/search/client.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  try {
    const client = getMeiliClient();
    const result = await client.index('products').search(q, {
      filter: 'is_active = true',
      limit: 10,
      attributesToRetrieve: ['id', 'name', 'slug', 'sku', 'price', 'primary_image_url']
    });
    return json(result.hits);
  } catch {
    error(503, 'MEILI_UNAVAILABLE');
  }
};
