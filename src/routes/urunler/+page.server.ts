import type { PageServerLoad } from './$types';
import { getMeiliClient } from '$lib/server/search/client.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const kategori = url.searchParams.get('kategori');
  const marka = url.searchParams.get('marka');
  const arac_marka = url.searchParams.get('arac_marka');
  const arac_model = url.searchParams.get('arac_model');
  const arac_yil = url.searchParams.get('arac_yil');
  const min_fiyat = url.searchParams.get('min_fiyat');
  const max_fiyat = url.searchParams.get('max_fiyat');
  const stokta = url.searchParams.get('stokta');
  const siralama = url.searchParams.get('siralama') ?? '';
  const sayfa = Number(url.searchParams.get('sayfa') ?? '1');

  const filters: string[] = ['is_active = true'];
  if (kategori) filters.push(`category_id = "${kategori}"`);
  if (marka) filters.push(`brand = "${marka}"`);
  if (stokta === '1') filters.push('stock_qty >= 1');
  if (min_fiyat) filters.push(`price >= ${min_fiyat}`);
  if (max_fiyat) filters.push(`price <= ${max_fiyat}`);
  if (arac_marka && arac_model && arac_yil) {
    const y = Number(arac_yil);
    filters.push(`fitments.make = "${arac_marka}" AND fitments.model = "${arac_model}" AND fitments.year_from <= ${y} AND fitments.year_to >= ${y}`);
  }

  const sortMap: Record<string, string[]> = {
    fiyat_artan: ['price:asc'],
    fiyat_azalan: ['price:desc'],
    en_yeni: ['updated_at:desc']
  };

  try {
    const client = getMeiliClient();
    const result = await client.index('products').search(q, {
      filter: filters.join(' AND '),
      sort: sortMap[siralama] ?? [],
      limit: 20,
      offset: (sayfa - 1) * 20,
      facets: ['brand', 'category_id']
    });
    return {
      hits: result.hits,
      total: result.estimatedTotalHits ?? 0,
      page: sayfa,
      q,
      siralama,
      facets: result.facetDistribution,
      params: { kategori, marka, stokta, min_fiyat, max_fiyat, arac_marka, arac_model, arac_yil }
    };
  } catch {
    error(503, 'MEILI_UNAVAILABLE');
  }
};
