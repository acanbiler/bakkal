# Operations Guide — Otoparca

Day-to-day operations: updates, backups, admin tasks, cron jobs, monitoring, troubleshooting.

---

## Useful Commands

```bash
# View live app logs
docker compose logs -f app

# View all service logs
docker compose logs -f

# Restart the app (e.g. after an env change)
docker compose restart app

# Open a shell inside the app container
docker compose exec app sh

# Check service health
docker compose ps
```

---

## Scheduled Jobs (Cron)

### Stale Order Cleanup

Orders in `ISLENIYOR` status past their `expires_at` should be checked against Tami and expired or completed. Run this every 5 minutes on the host:

```bash
crontab -e
```

Add:

```cron
*/5 * * * * cd /srv/otoparca && docker compose exec -T app node scripts/check-stale-orders.mjs >> /var/log/otoparca-stale-orders.log 2>&1
```

This script:
- Queries Tami for each stale order
- Marks unpaid orders as `ZAMAN_ASIMI`
- Completes and decrements stock for edge-case paid orders
- Logs all actions as structured JSON

### SSL Certificate Renewal

The `certbot` container renews certificates automatically every 12 hours. Verify it's running:

```bash
docker compose ps certbot
docker compose logs certbot --tail=20
```

If the certbot container exited, restart it:

```bash
docker compose up -d certbot
```

---

## Updating the Application

```bash
cd /srv/otoparca
git pull
docker compose up -d --build app
```

Database migrations run automatically on app startup. If a migration fails, the container exits — check logs:

```bash
docker compose logs app --tail=50
```

---

## Database

### Run Migrations Manually

If you need to run migrations outside of a deployment (e.g. from a local machine pointing at the production DB):

```bash
DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/otoparca" npm run migrate
```

Or inside the container:

```bash
docker compose exec app npx drizzle-kit migrate
```

### Backup PostgreSQL

**Full dump:**

```bash
docker compose exec db pg_dump -U postgres otoparca | gzip > /backups/otoparca-$(date +%Y%m%d-%H%M%S).sql.gz
```

**Automated daily backup (add to crontab):**

```cron
0 3 * * * docker compose -f /srv/otoparca/docker-compose.yml exec -T db pg_dump -U postgres otoparca | gzip > /backups/otoparca-$(date +\%Y\%m\%d).sql.gz
```

**Restore from backup:**

```bash
gunzip -c /backups/otoparca-20260101-030000.sql.gz | docker compose exec -T db psql -U postgres otoparca
```

### Backup Uploads

```bash
tar -czf /backups/uploads-$(date +%Y%m%d).tar.gz -C /var/lib/docker/volumes/otoparca_uploads/_data .
```

---

## Meilisearch

### Re-index All Products

Run this after a bulk import, data migration, or if search results look wrong:

```bash
docker compose exec app node scripts/reindex.mjs
```

Or from outside the container (requires env vars):

```bash
npm run reindex
```

The script applies index settings and then pushes all active products in batches of 500. It logs progress as JSON:

```json
{"level":"info","msg":"reindex batch","count":500,"total":500,"offset":0}
{"level":"info","msg":"reindex complete","total":1250}
```

### Backup Meilisearch

Meilisearch data is fully rebuildable from PostgreSQL. If you want to back it up anyway:

```bash
docker compose exec meilisearch curl -X POST http://localhost:7700/dumps \
  -H "Authorization: Bearer ${MEILI_MASTER_KEY}"
```

---

## Admin User Management

### Create a New Admin

```bash
docker compose exec app node scripts/create-admin.mjs admin@example.com 'NewPassword123!'
```

If the email already exists, it updates the password and promotes the account to `ADMIN`. If no password is given, a random one is generated and printed.

### Demote an Admin (SQL)

```bash
docker compose exec db psql -U postgres otoparca -c \
  "UPDATE users SET role = 'CUSTOMER' WHERE email = 'admin@example.com';"
```

---

## Monitoring

### Check Payment Errors

```bash
docker compose logs app | grep '"level":"error"'
```

### Check for Stale Orders

```bash
docker compose exec db psql -U postgres otoparca -c \
  "SELECT id, status, payment_status, expires_at FROM orders WHERE payment_status = 'ISLENIYOR' AND expires_at < now();"
```

If this returns rows, the stale-order cron may not be running. Check crontab and run the script manually.

### Disk Usage

```bash
# Docker volumes
docker system df -v

# Uploads volume
du -sh /var/lib/docker/volumes/otoparca_uploads/_data
```

### Log Rotation

App logs go to stdout, captured by Docker. Configure log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

Restart Docker after changing: `systemctl restart docker`

---

## Troubleshooting

### App Won't Start

```bash
docker compose logs app --tail=100
```

Common causes:
- **Migration failed** — DB unreachable or schema conflict. Check DB logs: `docker compose logs db`
- **Missing env var** — Look for `undefined` in error output. Verify `.env`
- **Port conflict** — Another process on port 80/443. Run `ss -tlnp | grep '80\|443'`

### 502 Bad Gateway from Nginx

The app container is not responding. Check:

```bash
docker compose ps app          # Is it running?
docker compose logs app        # Did it crash?
docker compose restart app     # Quick recovery
```

### Search Not Working

```bash
# Check Meilisearch health
docker compose exec meilisearch curl http://localhost:7700/health

# Re-index if needed
docker compose exec app node scripts/reindex.mjs
```

### Database Connection Errors

```bash
# Check PostgreSQL is healthy
docker compose exec db pg_isready -U postgres

# Check connection from app
docker compose exec app sh -c 'echo "SELECT 1" | psql $DATABASE_URL'
```

### SSL Certificate Expired

```bash
# Check expiry
docker compose exec nginx openssl s_client -connect localhost:443 -servername YOUR_DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -dates

# Force renewal
docker compose run --rm certbot renew --force-renewal
docker compose restart nginx
```

### High Memory / CPU

Meilisearch can be memory-intensive on large catalogs. Limit it in `docker-compose.yml` if needed:

```yaml
meilisearch:
  deploy:
    resources:
      limits:
        memory: 512M
```

---

## Security Checklist

Run through this after each deployment:

- [ ] `.env` is not world-readable: `chmod 600 .env`
- [ ] PostgreSQL port 5432 is **not** exposed in `docker-compose.yml` (no `ports:` under `db`)
- [ ] Meilisearch port 7700 is **not** exposed in `docker-compose.yml`
- [ ] `TAMI_API_BASE_URL` points to **production** URL (not sandbox)
- [ ] `AUTH_SECRET` is ≥ 32 random chars
- [ ] Admin panel login at `/giris` tested with correct credentials
- [ ] Upload directory is not web-browseable (Nginx returns 403 on `/uploads/` with no file)
