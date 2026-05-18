import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '$lib/server/db/index.js';
import { orders, orderItems, paymentAttempts } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import {
	iyzicoRequest,
	newConversationId,
	normalizePhone,
	splitFullName
} from '$lib/server/iyzico.js';
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
		email: z.string().email(),
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
	const conversationId = newConversationId();

	// Create order + items in a single transaction
	await db.transaction(async (tx) => {
		await tx.insert(orders).values({
			id: orderId,
			userId: locals.user?.id ?? null,
			guestEmail: locals.user?.email ?? shippingAddress.email,
			status: 'ODEME_BEKLENIYOR',
			paymentStatus: 'ISLENIYOR',
			totalAmount,
			installmentCount,
			shippingAddress,
			billingAddress: shippingAddress,
			iyzicoConversationId: conversationId,
			expiresAt: new Date(Date.now() + 30 * 60 * 1000)
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
	const { name, surname } = splitFullName(shippingAddress.fullName);
	const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

	const iyzicoBody = {
		locale: 'tr',
		conversationId,
		price: totalAmount,
		paidPrice: totalAmount,
		currency: 'TRY',
		installment: installmentCount,
		paymentChannel: 'WEB',
		basketId: orderId,
		paymentGroup: 'PRODUCT',
		callbackUrl: `${process.env.PUBLIC_BASE_URL}/api/odeme/callback`,
		paymentCard: {
			cardHolderName: card.cardHolder,
			cardNumber: card.cardNumber,
			expireMonth: expMonth,
			expireYear: expYear,
			cvc: card.cvv,
			registerCard: 0
		},
		buyer: {
			id: locals.user?.id ?? orderId,
			name,
			surname,
			identityNumber: process.env.IYZICO_BUYER_IDENTITY_NUMBER ?? '11111111111',
			email: locals.user?.email ?? shippingAddress.email,
			gsmNumber: normalizePhone(shippingAddress.phone),
			registrationAddress: shippingAddress.address,
			city: shippingAddress.city,
			country: 'Turkey',
			zipCode: shippingAddress.zipCode || '00000',
			ip
		},
		shippingAddress: {
			address: shippingAddress.address,
			zipCode: shippingAddress.zipCode || '00000',
			contactName: shippingAddress.fullName,
			city: shippingAddress.city,
			country: 'Turkey'
		},
		billingAddress: {
			address: shippingAddress.address,
			zipCode: shippingAddress.zipCode || '00000',
			contactName: shippingAddress.fullName,
			city: shippingAddress.city,
			country: 'Turkey'
		},
		basketItems: items.map((i) => ({
			id: i.productId,
			price: (i.price * i.quantity).toFixed(2),
			name: i.name,
			category1: 'Oto Parca',
			itemType: 'PHYSICAL'
		}))
	};

	let iyzicoRes: any;
	try {
		iyzicoRes = await iyzicoRequest('/payment/3dsecure/initialize', iyzicoBody);
	} catch (e) {
		await db
			.update(orders)
			.set({ status: 'BEKLEMEDE', paymentStatus: 'BASARISIZ' })
			.where(eq(orders.id, orderId));
		await db
			.update(paymentAttempts)
			.set({ status: 'BASARISIZ', resolvedAt: new Date(), errorMessage: String(e) })
			.where(eq(paymentAttempts.id, attemptId));
		error(502, 'IYZICO_UNREACHABLE');
	}

	const paymentId: string = iyzicoRes?.paymentId ?? '';

	if (iyzicoRes?.status !== 'success' || !iyzicoRes?.threeDSHtmlContent || !paymentId) {
		await db
			.update(orders)
			.set({ status: 'BEKLEMEDE', paymentStatus: 'BASARISIZ' })
			.where(eq(orders.id, orderId));
		await db
			.update(paymentAttempts)
			.set({
				status: 'BASARISIZ',
				resolvedAt: new Date(),
				iyzicoPaymentId: paymentId,
				errorCode: iyzicoRes?.errorCode,
				errorMessage: iyzicoRes?.errorMessage
			})
			.where(eq(paymentAttempts.id, attemptId));
		error(402, 'PAYMENT_REJECTED');
	}

	await db.update(orders).set({ iyzicoPaymentId: paymentId }).where(eq(orders.id, orderId));
	await db.update(paymentAttempts).set({ iyzicoPaymentId: paymentId }).where(eq(paymentAttempts.id, attemptId));

	const html = Buffer.from(iyzicoRes.threeDSHtmlContent, 'base64').toString('utf8');
	return json({ html });
};
