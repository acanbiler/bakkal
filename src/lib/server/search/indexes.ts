import { getMeiliClient } from './client.js';

export async function ensureProductIndex() {
	const client = getMeiliClient();
	const index = client.index('products');

	await index.updateSettings({
		searchableAttributes: ['name', 'sku', 'brand', 'category_name', 'fitment_tokens'],
		filterableAttributes: [
			'is_active',
			'is_featured',
			'category_id',
			'brand',
			'stock_qty',
			'price',
			'fitments.make',
			'fitments.model',
			'fitments.year_from',
			'fitments.year_to'
		],
		sortableAttributes: ['price', 'updated_at'],
		rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
		typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 5 } }
	});

	return index;
}
