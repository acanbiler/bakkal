import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from './db/index.js';
import { sessions, users } from './db/schema.js';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: { secure: process.env.NODE_ENV === 'production' }
	},
	getUserAttributes(attrs) {
		return {
			email: (attrs as any).email,
			name: (attrs as any).name,
			role: (attrs as any).role
		};
	}
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: { email: string; name: string; role: 'CUSTOMER' | 'ADMIN' };
	}
}
