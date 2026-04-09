import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { orders, orderItems, paymentAttempts, products } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { verifyCallbackHash, tamiRequest, newCorrelId } from '$lib/server/tami.js';
import { log } from '$lib/server/logger.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	const params: Record<string, string> = {};
	for (const [k, v] of formData.entries()) params[k] = String(v);

	const tamiOrderId = params.orderId ?? '';
	const receivedHash = params.hash ?? '';

	// Find order
	const [order] = await db.select().from(orders).where(eq(orders.tamiOrderId, tamiOrderId));
	if (!order) redirect(302, '/odeme/sonuc?durum=basarisiz');

	// Duplicate callback guard
	if (order.paymentStatus === 'BASARILI') redirect(302, '/odeme/sonuc?durum=basarili');

	// Hash verification — hard fail on mismatch
	if (!verifyCallbackHash(params, receivedHash)) {
		log('warn', { msg: 'callback hash mismatch', tamiOrderId });
		redirect(302, '/odeme/sonuc?durum=basarisiz');
	}

	if (params.success !== 'true') {
		await db
			.update(orders)
			.set({ status: 'BEKLEMEDE', paymentStatus: 'BASARISIZ' })
			.where(eq(orders.id, order.id));
		await db
			.update(paymentAttempts)
			.set({ status: 'BASARISIZ', resolvedAt: new Date() })
			.where(and(eq(paymentAttempts.orderId, order.id), eq(paymentAttempts.tamiOrderId, tamiOrderId)));
		redirect(302, '/odeme/sonuc?durum=basarisiz');
	}

	// Complete 3DS with Tami
	const correlId = newCorrelId();
	let completeRes: any;
	try {
		completeRes = await tamiRequest('/payment/complete-3ds', { orderId: tamiOrderId }, correlId);
	} catch {
		redirect(302, '/odeme/sonuc?durum=basarisiz');
	}

	if (!completeRes?.success) {
		await db
			.update(orders)
			.set({ status: 'BEKLEMEDE', paymentStatus: 'BASARISIZ' })
			.where(eq(orders.id, order.id));
		redirect(302, '/odeme/sonuc?durum=basarisiz');
	}

	// Load order items for stock decrement
	const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

	// Atomic transaction: update order + attempt + lock/decrement stock
	try {
		await db.transaction(async (tx) => {
			for (const item of items) {
				const [prod] = await tx
					.select({ stockQty: products.stockQty })
					.from(products)
					.where(eq(products.id, item.productId))
					.for('update');

				if (!prod || prod.stockQty < item.quantity) {
					throw new Error('STOCK_INSUFFICIENT');
				}

				await tx
					.update(products)
					.set({ stockQty: sql`${products.stockQty} - ${item.quantity}` })
					.where(eq(products.id, item.productId));
			}

			await tx
				.update(orders)
				.set({
					status: 'ODEME_ALINDI',
					paymentStatus: 'BASARILI',
					bankAuthCode: completeRes.bankAuthCode,
					bankRefNumber: completeRes.bankReferenceNumber
				})
				.where(eq(orders.id, order.id));

			await tx
				.update(paymentAttempts)
				.set({ status: 'BASARILI', resolvedAt: new Date() })
				.where(
					and(
						eq(paymentAttempts.orderId, order.id),
						eq(paymentAttempts.tamiOrderId, tamiOrderId)
					)
				);
		});
	} catch (e) {
		const isStock = e instanceof Error && e.message === 'STOCK_INSUFFICIENT';
		await db
			.update(orders)
			.set({ status: 'BEKLEMEDE', paymentStatus: 'BASARISIZ' })
			.where(eq(orders.id, order.id));

		if (isStock) {
			// Immediate refund
			try {
				await tamiRequest(
					'/payment/refund',
					{ orderId: tamiOrderId, amount: order.totalAmount },
					newCorrelId()
				);
			} catch {
				log('error', { msg: 'callback stock-insufficient refund failed', tamiOrderId });
			}
		}

		redirect(302, '/odeme/sonuc?durum=basarisiz');
	}

	redirect(302, '/odeme/sonuc?durum=basarili');
};
