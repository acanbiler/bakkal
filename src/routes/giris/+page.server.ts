import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { lucia } from '$lib/server/auth.js';
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
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return fail(400, { error: tr.auth.invalidCredentials });
    }
    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    cookies.set(cookie.name, cookie.value, { path: '/', ...cookie.attributes });
    redirect(302, '/hesabim');
  }
};
