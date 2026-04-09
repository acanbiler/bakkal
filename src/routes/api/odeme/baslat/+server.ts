import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '$lib/server/db/index.js';
import { orders, orderItems, paymentAttempts, products } from '$lib/server/db/schema.js';
import { eq, max } from 'drizzle-orm';
import { tamiRequest, newCorrelId, buildSecurityHash } from '$lib/server/tami.js';
import type { RequestHandler } from './$types';

const CartItemSchema = z.object({
	productId: z.string(),
	name: z.string(),
	slug: z.string(),
	sku: z.string(),
	price: z.number().positive(),
	quantity: z.number().int().positive(),
	stockQty: z.number().int().min(0)
});

const BodySchema = z.object({
	items: z.array(CartItemSchema).min(1),
	shippingAddress: z.object({
		fullName: z.string().min(1),
		phone: z.string().min(1),
		address: z.string().min(1),
		district: z.string().min(1),
		city: z.string().min(1),
		zipCode: z.string().optional()
	}),
	card: z.object({
		cardNumber: z.string().regex(/^\d{16}$/),
		cardHolder: z.string().min(1),
		expiry: z.string().regex(/^\d{2}\/\d{2}$/),
		cvv: z.string().regex(/^\d{3,4}$/)
	}),
	installmentCount: z.number().int().min(1).max(12).default(1)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	const parsed = BodySchema.safeParse(body);
	if (!parsed.success) error(400, 'INVALID_BODY');

	const { items, shippingAddress, card, installmentCount } = parsed.data;

	const totalAmount = items
		.reduce((s, i) => s + i.price * i.quantity, 0)
		.toFixed(2);

	const orderId = randomUUID();
	const correlId = newCorrelId();

	// Create order + items in a single transaction
	await db.transaction(async (tx) => {
		await tx.insert(orders).values({
			id: orderId,
			userId: locals.user?.id ?? null,
			status: 'ODEME_BEKLENIYOR',
			paymentStatus: 'ISLENIYOR',
			totalAmount,
			installmentCount,
			shippingAddress,
			billingAddress: shippingAddress,
			tamiCorrelId: correlId
		});

		await tx.insert(orderItems).values(
			items.map((i) => ({
				id: randomUUID(),
				orderId,
				productId: i.productId,
				quantity: i.quantity,
				unitPrice: String(i.price),
				productSnapshot: { name: i.name, sku: i.sku, price: i.price }
			}))
		);
	});

	// Insert first payment attempt
	const attemptId = randomUUID();
	await db.insert(paymentAttempts).values({
		id: attemptId,
		orderId,
		attemptNo: 1,
		status: 'ISLENIYOR'
	});

	const [expMonth, expYear] = card.expiry.split('/');
	const securityHash = buildSecurityHash(orderId, totalAmount);

	const tamiBody = {
		merchantOrderId: orderId,
		amount: totalAmount,
		currencyCode: 'TRY',
		installmentCount,
		cardNumber: card.cardNumber,
		cardHolderName: card.cardHolder,
		expireMonth: expMonth,
		expireYear: `20${expYear}`,
		cvv: card.cvv,
		securityHash,
		callbackUrl: `${process.env.PUBLIC_BASE_URL}/api/odeme/callback`
	};

	let tamiRes: any;
	try {
		tamiRes = await tamiRequest('/payment/auth', tamiBody, correlId);
	} catch (e) {
		await db
			.update(orders)
			.set({ status: 'BEKLEMEDE', paymentStatus: 'BASARISIZ' })
			.where(eq(orders.id, orderId));
		await db
			.update(paymentAttempts)
			.set({ status: 'BASARISIZ', resolvedAt: new Date(), errorMessage: String(e) })
			.where(eq(paymentAttempts.id, attemptId));
		error(502, 'TAMI_UNREACHABLE');
	}

	const tamiOrderId: string = tamiRes?.orderId ?? tamiRes?.tami_order_id ?? '';

	if (!tamiRes?.success || !tamiRes?.threeDSHtmlContent) {
		await db
			.update(orders)
			.set({ status: 'BEKLEMEDE', paymentStatus: 'BASARISIZ' })
			.where(eq(orders.id, orderId));
		await db
			.update(paymentAttempts)
			.set({
				status: 'BASARISIZ',
				resolvedAt: new Date(),
				tamiOrderId,
				errorCode: tamiRes?.errorCode,
				errorMessage: tamiRes?.errorMessage
			})
			.where(eq(paymentAttempts.id, attemptId));
		error(402, 'PAYMENT_REJECTED');
	}

	// Store Tami order ID on order and attempt
	await db.update(orders).set({ tamiOrderId }).where(eq(orders.id, orderId));
	await db.update(paymentAttempts).set({ tamiOrderId }).where(eq(paymentAttempts.id, attemptId));

	const html = Buffer.from(tamiRes.threeDSHtmlContent, 'base64').toString('utf8');
	return json({ html });
};
