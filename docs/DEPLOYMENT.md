# Deployment Guide — Otoparca

Production deployment uses Docker Compose with Nginx, Let's Encrypt SSL, PostgreSQL 16, and Meilisearch v1.8. The app runs as a single Node.js process behind Nginx.

---

## Prerequisites

- Ubuntu 22.04 LTS (or Debian 12) VPS — minimum 2 vCPU, 2 GB RAM, 20 GB disk
- A domain name with an A record pointing to the server IP
- Root or sudo access
- Docker 24+ and Docker Compose v2

---

## 1. Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Create a non-root deploy user (optional but recommended)
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
su - deploy
```

### Swap (required on 2 GB RAM servers)

Meilisearch is memory-hungry and will OOM-kill without swap:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Docker log rotation

Prevent Docker logs from filling the disk:

```bash
cat > /etc/docker/daemon.json <<'EOF'
{"log-driver":"json-file","log-opts":{"max-size":"50m","max-file":"3"}}
EOF
systemctl restart docker
```

---

## 2. Clone the Repository

```bash
git clone <your-repo-url> /srv/otoparca
cd /srv/otoparca
```

---

## 3. Environment Variables

Copy the example file and fill in every value:

```bash
cp .env.example .env
nano .env
```

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Full Postgres connection string | `postgresql://postgres:STRONGPASSWORD@db:5432/otoparca` |
| `DB_PASSWORD` | Postgres `POSTGRES_PASSWORD` (must match `DATABASE_URL`) | `STRONGPASSWORD` |
| `PUBLIC_BASE_URL` | Public HTTPS URL of the site | `https://otoparca.example.com` |
| `AUTH_SECRET` | Random string ≥ 32 chars for session signing | `openssl rand -base64 32` |
| `TAMI_MERCHANT_NUMBER` | Assigned by Tami on merchant registration | — |
| `TAMI_TERMINAL_NUMBER` | Assigned by Tami on merchant registration | — |
| `TAMI_SECRET_KEY` | HMAC secret key from Tami | — |
| `TAMI_API_BASE_URL` | **Production:** `https://paymentapi.tami.com.tr` — ensure this is NOT the sandbox URL | — |
| `MEILI_URL` | Meilisearch URL (internal) | `http://meilisearch:7700` |
| `MEILI_MASTER_KEY` | Random string ≥ 16 chars | `openssl rand -base64 24` |
| `UPLOAD_DIR` | Path inside container for uploaded files | `/app/uploads` |
| `MAX_UPLOAD_BYTES` | Max upload size in bytes | `5242880` (5 MB) |

> **Security:** `AUTH_SECRET` and `MEILI_MASTER_KEY` must be strong random values. Never commit `.env`.

---

## 4. Configure nginx.conf

Open `nginx.conf` and replace both occurrences of `YOUR_DOMAIN` with your actual domain:

```bash
sed -i 's/YOUR_DOMAIN/otoparca.example.com/g' nginx.conf
```

Verify:

```bash
grep 'server_name' nginx.conf
```

---

## 5. Obtain SSL Certificate

SSL must be issued **before** Nginx starts in full mode. Use Certbot's standalone mode via Docker:

```bash
# Start only the certbot service briefly for the initial certificate
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d otoparca.example.com \
  --email admin@example.com \
  --agree-tos --no-eff-email
```

> If this fails with "no webroot challenge", start Nginx first (it will serve the HTTP challenge path), then re-run.
>
> ```bash
> docker compose up -d nginx
> docker compose run --rm certbot certonly \
>   --webroot -w /var/www/certbot \
>   -d otoparca.example.com \
>   --email admin@example.com \
>   --agree-tos --no-eff-email
> ```

---

## 6. First Deployment

```bash
# Build the app image and start all services
docker compose up -d --build
```

On first start the `docker-entrypoint.sh` automatically:
1. Runs `drizzle-kit migrate` (applies all pending DB migrations)
2. Seeds the `site_settings` singleton row if it doesn't exist yet
3. Runs `node scripts/reindex.mjs` (populates Meilisearch — skips if no products yet)
4. Starts `node build/index.js`

Check that everything started cleanly:

```bash
docker compose ps
docker compose logs app --tail=50
```

Expected app log output:
```json
{"level":"info","msg":"running migrations"}
{"level":"info","msg":"running reindex"}
{"level":"info","msg":"starting server"}
```

---

## 7. Create the First Admin User

```bash
docker compose exec app node scripts/create-admin.mjs admin@example.com 'YourStrongPassword'
```

If you omit the password, a random one is printed to stdout. Keep it — you can always reset it by re-running the command.

Log in at `https://otoparca.example.com/giris` with these credentials. The admin panel is at `/admin`.

---

## 8. Verify the Deployment

| Check | URL |
|---|---|
| Homepage | `https://otoparca.example.com/` |
| Admin panel | `https://otoparca.example.com/admin` |
| Sitemap | `https://otoparca.example.com/sitemap.xml` |
| Robots | `https://otoparca.example.com/robots.txt` |
| Static upload | `https://otoparca.example.com/uploads/` (returns 403 if no file — that's fine) |

Check HTTPS grade: [SSL Labs](https://www.ssllabs.com/ssltest/)

---

## 9. DNS & Firewall

Open only the ports Nginx needs:

```bash
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (redirects to HTTPS)
ufw allow 443/tcp  # HTTPS
ufw enable
```

PostgreSQL (5432) and Meilisearch (7700) are **not** exposed to the public — they are internal Docker network services only.

---

## 10. Ongoing Deployments

```bash
cd /srv/otoparca
git pull
docker compose up -d --build app
```

The `app` service restarts with the new image. Migrations run automatically on startup. Downtime is typically under 10 seconds.

To deploy without brief downtime, use a rolling-restart approach with a load balancer — outside the scope of this guide.

---

## 11. Backups

Back up Postgres daily with a cron job. Meilisearch is rebuildable; `uploads` contains user images.

```bash
# Create backup directory
mkdir -p /srv/backups

# Add to crontab (runs at 2 AM daily, keeps 7 days)
crontab -e
```

```
0 2 * * * docker compose -f /srv/otoparca/docker-compose.yml exec -T db \
  pg_dump -U postgres otoparca | gzip > /srv/backups/otoparca_$(date +\%Y\%m\%d).sql.gz && \
  find /srv/backups -name '*.sql.gz' -mtime +7 -delete
```

To restore from a backup:

```bash
gunzip -c /srv/backups/otoparca_20240101.sql.gz | \
  docker compose exec -T db psql -U postgres otoparca
```

> Uploads volume backup: `tar czf /srv/backups/uploads_$(date +%Y%m%d).tar.gz /var/lib/docker/volumes/otoparca_uploads`

---

## Architecture Overview

```
Internet
  │
  ▼
Nginx (80/443)
  ├── /uploads/*  ──▶  serve from volume (no Node.js hit)
  └── /*          ──▶  proxy to app:3000
                           │
                    SvelteKit Node.js
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
           PostgreSQL 16     Meilisearch 1.8
           (pgdata volume)   (meilidata volume)

uploads volume ─── shared between app (write) and nginx (read)
certbot volume ─── shared between nginx (serve) and certbot (write)
```

---

## Volume Backup Locations

Docker named volumes are stored under `/var/lib/docker/volumes/` by default:

| Volume | Contents |
|---|---|
| `otoparca_pgdata` | PostgreSQL data files |
| `otoparca_uploads` | User-uploaded images |
| `otoparca_meilidata` | Meilisearch index (rebuildable) |
| `otoparca_certbot_conf` | TLS certificates |

> Meilisearch data is rebuildable with `npm run reindex`. Prioritise backing up `pgdata` and `uploads`.
