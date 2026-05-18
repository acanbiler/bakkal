import { createHmac } from 'crypto';

const base = () => process.env.IYZICO_API_BASE_URL ?? 'https://sandbox-api.iyzipay.com';
const apiKey = () => process.env.IYZICO_API_KEY!;
const secretKey = () => process.env.IYZICO_SECRET_KEY!;

export function newConversationId(): string {
	return `Conv${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

export function buildAuthorization(path: string, body: unknown, randomKey: string): string {
	const requestBody = JSON.stringify(body ?? {});
	const signature = createHmac('sha256', secretKey())
		.update(`${randomKey}${path}${requestBody}`)
		.digest('hex');
	const authorization = `apiKey:${apiKey()}&randomKey:${randomKey}&signature:${signature}`;
	return `IYZWSv2 ${Buffer.from(authorization, 'utf8').toString('base64')}`;
}

export async function iyzicoRequest<T = unknown>(path: string, body: unknown): Promise<T> {
	const delays = [500, 1000, 2000];
	let lastErr: unknown;

	for (let attempt = 0; attempt < 4; attempt++) {
		const randomKey = `${Date.now()}${Math.random().toString().slice(2, 11)}`;
		const requestBody = JSON.stringify(body ?? {});

		try {
			const res = await fetch(`${base()}${path}`, {
				method: 'POST',
				headers: {
					Authorization: buildAuthorization(path, body, randomKey),
					'x-iyzi-rnd': randomKey,
					'Content-Type': 'application/json'
				},
				body: requestBody
			});

			if (res.ok || res.status < 500) return (await res.json()) as T;
			lastErr = new Error(`HTTP ${res.status}`);
		} catch (e) {
			lastErr = e;
		}

		if (attempt < 3) await new Promise((r) => setTimeout(r, delays[attempt]));
	}

	throw lastErr;
}

export function splitFullName(fullName: string): { name: string; surname: string } {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length <= 1) return { name: parts[0] || 'Musteri', surname: 'Otoparca' };
	return { name: parts.slice(0, -1).join(' '), surname: parts.at(-1) ?? 'Otoparca' };
}

export function normalizePhone(phone: string): string {
	const digits = phone.replace(/\D/g, '');
	if (digits.startsWith('90')) return `+${digits}`;
	if (digits.startsWith('0')) return `+9${digits}`;
	if (digits.length === 10) return `+90${digits}`;
	return phone;
}
