import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { lucia } from '$lib/server/auth.js';
import { nanoid } from 'nanoid';
import { tr } from '$lib/i18n/tr.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(302, '/hesabim');
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const fd = await request.formData();
    const email = String(fd.get('email') ?? '').toLowerCase().trim();
    const password = String(fd.get('password') ?? '');
    const name = String(fd.get('name') ?? '').trim();
    if (!email || !password || !name) return fail(400, { error: 'Tüm alanlar zorunludur.' });
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) return fail(400, { error: tr.auth.emailTaken });
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({
      id: nanoid(), email, passwordHash, name, role: 'CUSTOMER'
    }).returning();
    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    cookies.set(cookie.name, cookie.value, { path: '/', ...cookie.attributes });
    redirect(302, '/hesabim');
  }
};
