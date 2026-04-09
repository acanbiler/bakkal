import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { siteSettings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { saveUpload, LOGO_TYPES, PRODUCT_IMAGE_TYPES } from '$lib/server/upload.js';

export const load: PageServerLoad = async () => {
  let [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, 'singleton'));
  if (!settings) {
    [settings] = await db
      .insert(siteSettings)
      .values({ id: 'singleton' })
      .returning();
  }
  return { settings };
};

export const actions: Actions = {
  save: async ({ request }) => {
    const data = await request.formData();
    const siteName = String(data.get('siteName') ?? '').trim();
    const primaryColor = String(data.get('primaryColor') ?? '').trim();
    const heroTitle = String(data.get('heroTitle') ?? '').trim() || null;
    const heroSubtitle = String(data.get('heroSubtitle') ?? '').trim() || null;
    const contactEmail = String(data.get('contactEmail') ?? '').trim() || null;
    const contactPhone = String(data.get('contactPhone') ?? '').trim() || null;
    const address = String(data.get('address') ?? '').trim() || null;
    const facebook = String(data.get('facebook') ?? '').trim() || null;
    const instagram = String(data.get('instagram') ?? '').trim() || null;
    const twitter = String(data.get('twitter') ?? '').trim() || null;

    if (!siteName || siteName.length > 100)
      return fail(400, { error: 'Site adı 1–100 karakter olmalıdır.' });
    if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor))
      return fail(400, { error: 'Ana renk #rrggbb formatında olmalıdır (örn. #e11d48).' });

    const logoFile = data.get('logo');
    const heroImageFile = data.get('heroImage');

    let logoUrl: string | undefined;
    let heroImageUrl: string | undefined;

    if (logoFile instanceof File && logoFile.size > 0) {
      try {
        logoUrl = await saveUpload(logoFile, 'logos', LOGO_TYPES, 2 * 1024 * 1024);
      } catch (e: any) {
        if (e.message === 'FILE_TOO_LARGE') return fail(400, { error: "Logo 2MB'ı aşamaz." });
        return fail(400, { error: 'Logo yalnızca PNG veya SVG olabilir.' });
      }
    }

    if (heroImageFile instanceof File && heroImageFile.size > 0) {
      try {
        heroImageUrl = await saveUpload(heroImageFile, 'hero', PRODUCT_IMAGE_TYPES);
      } catch (e: any) {
        if (e.message === 'FILE_TOO_LARGE') return fail(400, { error: 'Hero görseli çok büyük.' });
        return fail(400, { error: 'Hero görseli yalnızca JPEG, PNG veya WebP olabilir.' });
      }
    }

    const socialLinks = { facebook, instagram, twitter };
    const updateSet: Record<string, any> = {
      siteName,
      primaryColor,
      heroTitle,
      heroSubtitle,
      contactEmail,
      contactPhone,
      address,
      socialLinks,
      updatedAt: new Date()
    };
    if (logoUrl) updateSet.logoUrl = logoUrl;
    if (heroImageUrl) updateSet.heroImageUrl = heroImageUrl;

    await db
      .insert(siteSettings)
      .values({ id: 'singleton', ...updateSet })
      .onConflictDoUpdate({ target: siteSettings.id, set: updateSet });

    return { success: true };
  }
};
