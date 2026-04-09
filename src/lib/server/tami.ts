import { createHash, createHmac, timingSafeEqual } from 'crypto';

const base = () => process.env.TAMI_API_BASE_URL!;
const merchant = () => process.env.TAMI_MERCHANT_NUMBER!;
const terminal = () => process.env.TAMI_TERMINAL_NUMBER!;
const secret = () => process.env.TAMI_SECRET_KEY!;

export function buildAuthToken(): string {
	const hash = createHash('sha256')
		.update(merchant() + terminal() + secret())
		.digest('base64');
	return `${merchant()}:${terminal()}:${hash}`;
}

export function buildSecurityHash(orderId: string, amount: string): string {
	return createHash('sha256')
		.update(orderId + amount + merchant() + terminal() + secret())
		.digest('base64');
}

export function verifyCallbackHash(
	params: Record<string, string>,
	receivedHash: string
): boolean {
	const data = [
		params.cardOrganization,
		params.cardBrand,
		params.cardType,
		params.maskedNumber,
		params.installmentCount,
		params.currencyCode,
		params.originalAmount,
		params.orderId,
		params.systemTime,
		params.success
	].join('');

	const expectedBuf = Buffer.from(
		createHmac('sha256', secret()).update(data).digest('base64')
	);
	const receivedBuf = Buffer.from(receivedHash);

	// Timing-safe comparison to prevent side-channel attacks
	if (expectedBuf.length !== receivedBuf.length) return false;
	return timingSafeEqual(expectedBuf, receivedBuf);
}

export function newCorrelId(): string {
	return `Corr${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

export async function tamiRequest(
	path: string,
	body: unknown,
	correlId: string
): Promise<unknown> {
	// attempt 0 = initial try; attempts 1–3 = retries (max 3 retries per spec §6.5)
	const delays = [500, 1000, 2000];
	let lastErr: unknown;

	for (let attempt = 0; attempt < 4; attempt++) {
		try {
			const res = await fetch(`${base()}${path}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					CorrelationId: correlId,
					'PG-Auth-Token': buildAuthToken()
				},
				body: JSON.stringify(body)
			});

			// Only retry on network/5xx errors; any other response is final
			if (res.ok || res.status < 500) return res.json();
			lastErr = new Error(`HTTP ${res.status}`);
		} catch (e) {
			lastErr = e;
		}

		if (attempt < 3) await new Promise((r) => setTimeout(r, delays[attempt]));
	}

	throw lastErr;
}
