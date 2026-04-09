import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { siteSettings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
  const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, 'singleton'));
  return {
    user: locals.user,
    settings: settings ?? { siteName: 'Otoparca', primaryColor: '#e11d48' }
  };
};
