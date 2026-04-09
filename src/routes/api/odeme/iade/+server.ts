import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { orders, orderItems, products } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { tamiRequest, newCorrelId } from '$lib/server/tami.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (locals.user?.role !== 'ADMIN') error(403, 'FORBIDDEN');

	const { orderId, amount } = await request.json();
	if (!orderId) error(400, 'MISSING_ORDER_ID');

	const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
	if (!order) error(404, 'ORDER_NOT_FOUND');
	if (order.paymentStatus !== 'BASARILI') error(409, 'NOT_REFUNDABLE');

	const refundAmount = amount ? String(amount) : order.totalAmount;
	const isFullRefund = refundAmount === order.totalAmount;

	const correlId = newCorrelId();
	const res: any = await tamiRequest(
		'/payment/refund',
		{ orderId: order.tamiOrderId, amount: refundAmount },
		correlId
	);

	if (!res?.success) error(502, res?.errorMessage ?? 'TAMI_REFUND_FAILED');

	await db.transaction(async (tx) => {
		if (isFullRefund) {
			// Restore all stock
			const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
			for (const item of items) {
				await tx
					.update(products)
					.set({ stockQty: sql`${products.stockQty} + ${item.quantity}` })
					.where(eq(products.id, item.productId));
			}
		}
		await tx
			.update(orders)
			.set({
				status: 'IADE',
				paymentStatus: 'IADE'
			})
			.where(eq(orders.id, orderId));
	});

	return json({ ok: true, refundAmount });
};
