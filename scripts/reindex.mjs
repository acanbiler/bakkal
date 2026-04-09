// scripts/reindex.mjs
// Full reindex of all active products into Meilisearch.
// Usage: node scripts/reindex.mjs
import postgres from 'postgres';
import { MeiliSearch } from 'meilisearch';

const sql = postgres(process.env.DATABASE_URL);
const client = new MeiliSearch({
  host: process.env.MEILI_URL,
  apiKey: process.env.MEILI_MASTER_KEY
});
const index = client.index('products');

// Apply index settings first
await index.updateSettings({
  searchableAttributes: ['name', 'sku', 'brand', 'category_name', 'fitment_tokens'],
  filterableAttributes: [
    'is_active', 'is_featured', 'category_id', 'brand', 'stock_qty', 'price',
    'fitments.make', 'fitments.model', 'fitments.year_from', 'fitments.year_to'
  ],
  sortableAttributes: ['price', 'updated_at'],
  rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 5 } }
});

const BATCH = 500;
let offset = 0;
let total = 0;

while (true) {
  const rows = await sql`
    SELECT p.*, c.name as category_name,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image_url,
      (SELECT json_agg(json_build_object('make',make,'model',model,'year_from',year_from,'year_to',year_to))
       FROM vehicle_fitments WHERE product_id = p.id) as fitments_raw
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true
    ORDER BY p.created_at
    LIMIT ${BATCH} OFFSET ${offset}
  `;
  if (rows.length === 0) break;

  const docs = rows.map(p => {
    const fitments = p.fitments_raw ?? [];
    return {
      id: p.id, name: p.name, slug: p.slug, sku: p.sku,
      brand: p.brand ?? '', price: Number(p.price),
      compare_price: p.compare_price ? Number(p.compare_price) : null,
      stock_qty: p.stock_qty, is_active: p.is_active, is_featured: p.is_featured,
      category_id: p.category_id, category_name: p.category_name ?? '',
      primary_image_url: p.primary_image_url ?? '',
      fitments,
      fitment_tokens: fitments.map(f => `${f.make.toLowerCase()} ${f.model.toLowerCase()} ${f.year_from} ${f.year_to}`),
      updated_at: Math.floor(new Date(p.updated_at).getTime() / 1000)
    };
  });

  await index.addDocuments(docs);
  total += docs.length;
  console.log(JSON.stringify({ level: 'info', msg: 'reindex batch', count: docs.length, total, offset }));
  offset += BATCH;
}

console.log(JSON.stringify({ level: 'info', msg: 'reindex complete', total }));
await sql.end();
