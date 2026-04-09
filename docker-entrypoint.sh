#!/bin/sh
set -e
echo '{"level":"info","msg":"running migrations"}'
npx drizzle-kit migrate
echo '{"level":"info","msg":"seeding site_settings"}'
node -e "
import('postgres').then(({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_URL);
  sql\`INSERT INTO site_settings (id) VALUES ('singleton') ON CONFLICT DO NOTHING\`
    .then(() => sql.end());
});
"
echo '{"level":"info","msg":"running reindex"}'
node scripts/reindex.mjs
echo '{"level":"info","msg":"starting server"}'
exec node build/index.js
