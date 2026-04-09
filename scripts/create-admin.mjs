// scripts/create-admin.mjs
// Usage: node scripts/create-admin.mjs [email] [password]
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const sql = postgres(process.env.DATABASE_URL);
const email = process.argv[2] ?? 'admin@example.com';
const password = process.argv[3] ?? randomBytes(12).toString('hex');
const hash = await bcrypt.hash(password, 12);
const id = randomBytes(8).toString('hex');

await sql`
  INSERT INTO users (id, email, password_hash, name, role)
  VALUES (${id}, ${email}, ${hash}, 'Admin', 'ADMIN')
  ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        role = 'ADMIN'
`;

console.log(`Admin created: ${email} / ${password}`);
await sql.end();
