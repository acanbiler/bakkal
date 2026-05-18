import { json, error } from '@sveltejs/kit';
import { iyzicoRequest, newConversationId } from '$lib/server/iyzico.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { bin, price = 1 } = await request.json();
	if (!bin || !/^\d{6,8}$/.test(bin)) error(400, 'INVALID_BIN');

	const res: any = await iyzicoRequest('/payment/iyzipos/installment', {
		locale: 'tr',
		conversationId: newConversationId(),
		price,
		binNumber: bin.slice(0, 8)
	});

	const prices = res?.installmentDetails?.[0]?.installmentPrices ?? [];
	return json({
		...res,
		installments: prices.map((i: any) => ({
			count: i.installmentNumber,
			monthlyAmount: i.installmentPrice,
			totalAmount: i.totalPrice
		}))
	});
};
