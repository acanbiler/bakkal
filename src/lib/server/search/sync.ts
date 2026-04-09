import { getMeiliClient } from './client.js';
import { db } from '../db/index.js';
import { products, productImages, categories, vehicleFitments } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function syncProductToMeilisearch(productId: string) {
	try {
		const [product] = await db.select().from(products).where(eq(products.id, productId));
		if (!product) return;

		const [category] = await db
			.select()
			.from(categories)
			.where(eq(categories.id, product.categoryId));
		const images = await db
			.select()
			.from(productImages)
			.where(eq(productImages.productId, productId));
		const fitments = await db
			.select()
			.from(vehicleFitments)
			.where(eq(vehicleFitments.productId, productId));

		const primaryImage = images.find((i) => i.isPrimary) ?? images[0];
		const fitmentDocs = fitments.map((f) => ({
			make: f.make,
			model: f.model,
			year_from: f.yearFrom,
			year_to: f.yearTo
		}));
		const fitmentTokens = fitments.map(
			(f) => `${f.make.toLowerCase()} ${f.model.toLowerCase()} ${f.yearFrom} ${f.yearTo}`
		);

		const doc = {
			id: product.id,
			name: product.name,
			slug: product.slug,
			sku: product.sku,
			brand: product.brand ?? '',
			price: Number(product.price),
			compare_price: product.comparePrice ? Number(product.comparePrice) : null,
			stock_qty: product.stockQty,
			is_active: product.isActive,
			is_featured: product.isFeatured,
			category_id: product.categoryId,
			category_name: category?.name ?? '',
			primary_image_url: primaryImage?.url ?? '',
			fitments: fitmentDocs,
			fitment_tokens: fitmentTokens,
			updated_at: Math.floor(new Date(product.updatedAt).getTime() / 1000)
		};

		const client = getMeiliClient();
		await client.index('products').addDocuments([doc]);
	} catch (err) {
		console.error(
			JSON.stringify({
				level: 'error',
				msg: 'meili sync failed',
				productId,
				err: String(err)
			})
		);
	}
}

export async function deleteProductFromMeilisearch(productId: string) {
	try {
		const client = getMeiliClient();
		await client.index('products').deleteDocument(productId);
	} catch (err) {
		console.error(
			JSON.stringify({
				level: 'error',
				msg: 'meili delete failed',
				productId,
				err: String(err)
			})
		);
	}
}
