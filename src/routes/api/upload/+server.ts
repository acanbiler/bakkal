import { json, error } from '@sveltejs/kit';
import { saveUpload, PRODUCT_IMAGE_TYPES, LOGO_TYPES } from '$lib/server/upload.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'ADMIN') error(403, 'FORBIDDEN');

	const formData = await request.formData();
	const file = formData.get('file');
	const type = formData.get('type') ?? 'product';

	if (!(file instanceof File)) error(400, 'MISSING_FILE');

	const subdir = type === 'logo' ? 'logos' : 'products';
	const allowed = type === 'logo' ? LOGO_TYPES : PRODUCT_IMAGE_TYPES;

	try {
		const url = await saveUpload(file, subdir, allowed);
		return json({ url });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'UPLOAD_FAILED';
		error(422, msg);
	}
};
