import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Product images: JPEG, PNG, WebP only (no SVG — SVG can contain executable scripts)
export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Logo: PNG or SVG only (per spec §9.5)
export const LOGO_TYPES = ['image/png', 'image/svg+xml'];

function detectMime(buf: Buffer): string | null {
	// JPEG: FF D8 FF
	if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
	// PNG: 89 50 4E 47
	if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
	// WebP: RIFF....WEBP
	if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP')
		return 'image/webp';
	// SVG: check for XML/SVG opening tag and reject if contains executable content
	const str = buf.slice(0, 512).toString('utf8').trimStart();
	if (str.startsWith('<svg') || str.startsWith('<?xml')) {
		// Reject SVGs with embedded scripts or event handlers
		if (/<script/i.test(str) || /\son\w+\s*=/i.test(str)) return null;
		return 'image/svg+xml';
	}
	return null;
}

export async function saveUpload(
	file: File,
	subdir: string,
	allowedTypes: string[],
	maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 5242880)
): Promise<string> {
	if (file.size > maxBytes) throw new Error('FILE_TOO_LARGE');

	const buf = Buffer.from(await file.arrayBuffer());
	const detectedMime = detectMime(buf);

	if (!detectedMime || !allowedTypes.includes(detectedMime)) throw new Error('INVALID_MIME');

	const ext =
		detectedMime === 'image/jpeg'
			? '.jpg'
			: detectedMime === 'image/png'
				? '.png'
				: detectedMime === 'image/webp'
					? '.webp'
					: '.svg';

	const filename = randomUUID() + ext;
	const uploadDir = process.env.UPLOAD_DIR ?? '/app/uploads';
	const dir = join(uploadDir, subdir);

	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, filename), buf);

	return `/uploads/${subdir}/${filename}`;
}

export async function deleteUpload(url: string) {
	try {
		const uploadDir = process.env.UPLOAD_DIR ?? '/app/uploads';
		const rel = url.replace(/^\/uploads\//, '');
		await unlink(join(uploadDir, rel));
	} catch {
		// File already gone — not an error
	}
}
