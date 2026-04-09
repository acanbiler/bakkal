#!/bin/sh
set -e
echo '{"level":"info","msg":"running migrations"}'
npx drizzle-kit migrate
echo '{"level":"info","msg":"running reindex"}'
node scripts/reindex.mjs
echo '{"level":"info","msg":"starting server"}'
exec node build/index.js
