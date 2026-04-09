# Car Parts E-Commerce Platform — Technical Specification

**Version:** 4.0
**UI Language:** Turkish
**Payment Provider:** Tami Sanal POS (Virtual POS)

---

## 1. Goals & Constraints

Build a lightweight, self-hosted Turkish-language e-commerce platform for selling car
parts. The system must be easy to deploy with Docker, easy for a non-technical admin to
manage, and built to remain performant as the catalogue grows.

**Hard constraints:**
- No Next.js (Vercel product). No Vercel infrastructure of any kind.
- Deployment target: ethical VPS providers — Hetzner Cloud or OVHcloud.
- All secrets supplied via environment variables. No credential values in source code.
- Card details are never written to the database.
- Stock quantity must never go below zero.

---

## 2. Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| Full-stack framework | **SvelteKit** with `@sveltejs/adapter-node` | SSR, file-based routing, no Vercel affiliation |
| Styling | **Tailwind CSS** | No runtime CDN dependency |
| ORM | **Drizzle ORM** | Lightweight, TypeScript-native |
| Primary database | **PostgreSQL 16** | Source of truth for all data |
| Search engine | **Meilisearch** | Self-hosted, fast faceted search; replaces all product/filter queries |
| Auth | **Lucia Auth v3** | Session-based, Drizzle/PostgreSQL adapter |
| File storage | **Local filesystem** via Docker named volume | Swap to self-hosted MinIO for multi-node |
| Reverse proxy | **Nginx** | SSL termination, static file serving, rate limiting |
| SSL | **Let's Encrypt / Certbot** | Automated renewal |
| Container runtime | **Docker + Docker Compose** | Single-command deployment |

---

## 3. Project Structure

```
/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Drizzle client (singleton)
│   │   │   │   └── schema.ts         # All table + enum definitions
│   │   │   ├── search/
│   │   │   │   ├── client.ts         # Meilisearch client (singleton)
│   │   │   │   ├── indexes.ts        # Index definitions and settings
│   │   │   │   └── sync.ts           # Product → Meilisearch sync helpers
│   │   │   ├── tami.ts               # Tami API: hash helpers + fetch wrapper
│   │   │   ├── auth.ts               # Lucia instance
│   │   │   └── upload.ts             # File save / validate / delete
│   │   ├── stores/
│   │   │   ├── cart.ts               # Svelte store, persisted to localStorage
│   │   │   └── toast.ts
│   │   └── components/
│   │       ├── ui/
│   │       ├── shop/
│   │       ├── admin/
│   │       └── layout/
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte              # Landing page
│   │   ├── urunler/
│   │   │   ├── +page.svelte
│   │   │   ├── +page.server.ts       # Delegates all filtering to Meilisearch
│   │   │   └── [slug]/
│   │   │       ├── +page.svelte
│   │   │       └── +page.server.ts
│   │   ├── sepet/+page.svelte
│   │   ├── odeme/
│   │   │   ├── +page.svelte
│   │   │   ├── +page.server.ts
│   │   │   ├── 3d/+page.svelte
│   │   │   └── sonuc/+page.svelte
│   │   ├── hesabim/
│   │   ├── giris/
│   │   ├── kayit/
│   │   └── admin/
│   │       ├── +layout.server.ts     # ADMIN guard
│   │       ├── +page.svelte          # Dashboard
│   │       ├── urunler/
│   │       ├── siparisler/
│   │       ├── kategoriler/
│   │       └── ayarlar/
│   └── api/
│       ├── odeme/
│       │   ├── baslat/+server.ts
│       │   ├── callback/+server.ts
│       │   ├── iptal/+server.ts
│       │   └── iade/+server.ts
│       ├── urunler/+server.ts        # Live search endpoint (proxies Meilisearch)
│       ├── bin/+server.ts
│       └── upload/+server.ts
├── scripts/
│   ├── create-admin.mjs
│   ├── reindex.mjs                   # Full Meilisearch reindex from Postgres
│   └── check-stale-orders.mjs        # Cron: mark timed-out pending orders
├── uploads/                          # Docker named volume mount point
├── drizzle/migrations/
├── drizzle.config.ts
├── svelte.config.ts                  # Must set adapter-node
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
└── .env
```

---

## 4. Data Model

All Drizzle schema columns use **snake_case**. Any raw SQL (triggers, migrations) must
reference columns by their exact snake_case names.

### 4.1 Enums

```
role:
  CUSTOMER | ADMIN

order_status:
  BEKLEMEDE           # Created, not yet submitted to payment
  ODEME_BEKLENIYOR    # Submitted to Tami, awaiting 3D completion
  ODEME_ALINDI        # Payment confirmed
  HAZIRLANIYOR
  KARGOLANDI
  TESLIM_EDILDI
  IPTAL
  IADE

payment_status:
  BEKLEMEDE           # Not yet attempted
  ISLENIYOR           # 3D initiated, callback not yet received
  BASARILI
  BASARISIZ
  ZAMAN_ASIMI         # Callback never arrived within window
  IPTAL
  IADE
  EYLEM_GEREKLI       # Authorized but not captured (requires complete-3ds)
```

### 4.2 Core Tables

**users**
`id, email (unique), password_hash, name, phone, role, created_at`

**sessions**
`id, user_id → users (cascade), expires_at`
Managed by Lucia. Never touch directly.

**categories**
`id, name, slug (unique), parent_id → categories (nullable), image_url`

**products**
```
id, name, slug (unique),
description,
sku (unique),           -- part number / OEM code
price,
compare_price,          -- original price for discount display; nullable
stock_qty,              -- integer, never goes below 0 (enforced by CHECK constraint)
category_id → categories,
brand,                  -- part manufacturer (Bosch, NGK …)
is_active,
is_featured,
meta_title,             -- SEO: overrides <title> if set
meta_description,       -- SEO: overrides <meta name="description"> if set
created_at,
updated_at
```

Add the following CHECK constraint in the migration:
```sql
ALTER TABLE products ADD CONSTRAINT stock_non_negative CHECK (stock_qty >= 0);
```

Vehicle compatibility is NOT stored on the `products` table. See `vehicle_fitments` below.

**product_images**
`id, product_id → products (cascade delete), url, alt_text, is_primary, sort_order`

### 4.3 Vehicle Compatibility

Store compatibility in a dedicated `vehicle_fitments` table, not as JSON on the product.
This is required for efficient exact-match and range-match queries.

```
vehicle_fitments
─────────────────────────────────────────────────
id          text        PK
product_id  text        FK → products (cascade delete)
make        varchar     indexed   -- e.g. "BMW"
model       varchar     indexed   -- e.g. "3 Series"
year_from   smallint    indexed   -- e.g. 2010
year_to     smallint    indexed   -- e.g. 2018
notes       text        nullable  -- e.g. "Diesel only"
token       text        generated -- see below
```

**Searchable token (required):**
The `token` column is a generated/computed column:
```sql
ALTER TABLE vehicle_fitments
  ADD COLUMN token text GENERATED ALWAYS AS
    (lower(make || ' ' || model || ' ' || year_from || ' ' || year_to)) STORED;
CREATE INDEX idx_fitments_token ON vehicle_fitments USING GIN (to_tsvector('simple', token));
CREATE INDEX idx_fitments_make_model ON vehicle_fitments (make, model);
CREATE INDEX idx_fitments_year ON vehicle_fitments (year_from, year_to);
```

**Query patterns that must be supported:**
- Exact: `WHERE make = 'BMW' AND model = '3 Series' AND year_from <= 2015 AND year_to >= 2015`
- Range: `WHERE make = 'Toyota' AND year_from <= :y AND year_to >= :y`
- Full-text on token: `WHERE to_tsvector('simple', token) @@ plainto_tsquery('simple', 'bmw 3 series 2015')`

When a product is indexed into Meilisearch, its fitments are denormalized into the
document as a `fitments` array field (see §5.2).

### 4.4 Orders & Payments

**orders**
```
id,
user_id → users (nullable),
guest_email,
status (order_status),
payment_status (payment_status),
total_amount,
installment_count,
shipping_address (jsonb),
billing_address (jsonb),
tami_order_id (unique),       -- generated once, reused on retry
tami_correl_id,
bank_auth_code,
bank_ref_number,
notes,
expires_at,                   -- set to now() + 30 minutes on creation; used for timeout detection
created_at,
updated_at
```

**payment_attempts**
Track each attempt to prevent duplicate charges and to support retry auditing.

```
id,
order_id → orders,
attempt_no   integer,            -- 1-based, incremented per attempt
tami_order_id text,              -- may differ on retry if regenerated
status text,                     -- mirrors payment_status at time of attempt
initiated_at timestamp,
resolved_at  timestamp nullable,
error_code   text nullable,
error_message text nullable,

UNIQUE (order_id, attempt_no)
```

**order_items**
`id, order_id → orders, product_id → products, quantity, unit_price, product_snapshot (jsonb)`

**addresses**
`id, user_id → users (cascade), label, full_name, phone, address, district, city, zip_code, is_default`

### 4.5 Site Settings

Single row, `id = 'singleton'`.
```
logo_url, site_name, primary_color,
hero_title, hero_subtitle, hero_image_url,
contact_email, contact_phone, address,
social_links (jsonb: { instagram, facebook, twitter, whatsapp }),
updated_at
```

---

## 5. Search Architecture (Meilisearch)

**Rule:** All product search and filter queries go through Meilisearch. PostgreSQL is
never queried directly for product listing or search. PostgreSQL is the source of truth;
Meilisearch is the read layer.

### 5.1 Sync Strategy

Products are synced to Meilisearch:
- **On write:** After every product create/update/delete in the admin panel, call
  `syncProductToMeilisearch(product)` or `deleteProductFromMeilisearch(id)`.
- **On startup:** The app checks whether the Meilisearch index exists and is non-empty.
  If not, it runs a full reindex from PostgreSQL before accepting traffic.
- **Manual reindex:** `scripts/reindex.mjs` fetches all active products from PostgreSQL
  and upserts them into Meilisearch in batches of 500.

Sync is asynchronous (fire-and-forget after confirming Postgres write). Meilisearch
temporary unavailability must not block product saves.

### 5.2 Meilisearch Document Shape

Each product document indexed into Meilisearch must include the following fields:

```json
{
  "id": "prod_abc123",
  "name": "Fren Balatası Ön",
  "slug": "fren-balatasi-on-bosch-bmw-e46",
  "sku": "BP-0986461051",
  "brand": "Bosch",
  "price": 349.90,
  "compare_price": 420.00,
  "stock_qty": 12,
  "is_active": true,
  "is_featured": false,
  "category_id": "cat_frens",
  "category_name": "Fren Sistemleri",
  "primary_image_url": "/uploads/products/bp-0986461051.jpg",
  "fitments": [
    { "make": "BMW", "model": "3 Series", "year_from": 1998, "year_to": 2005 },
    { "make": "BMW", "model": "5 Series", "year_from": 2000, "year_to": 2003 }
  ],
  "fitment_tokens": ["bmw 3 series 1998 2005", "bmw 5 series 2000 2003"],
  "updated_at": 1718000000
}
```

### 5.3 Meilisearch Index Settings

Apply these settings when creating or resetting the `products` index:

```json
{
  "searchableAttributes": [
    "name", "sku", "brand", "category_name", "fitment_tokens"
  ],
  "filterableAttributes": [
    "is_active", "is_featured", "category_id",
    "brand", "stock_qty", "price",
    "fitments.make", "fitments.model", "fitments.year_from", "fitments.year_to"
  ],
  "sortableAttributes": ["price", "updated_at"],
  "rankingRules": [
    "words", "typo", "proximity", "attribute", "sort", "exactness"
  ],
  "typoTolerance": { "enabled": true, "minWordSizeForTypos": { "oneTypo": 5 } }
}
```

### 5.4 Filter Query Examples

The product listing page must build a Meilisearch filter string from URL params.
Examples:

```
Vehicle filter:
  fitments.make = "BMW" AND fitments.model = "3 Series"
  AND fitments.year_from <= 2003 AND fitments.year_to >= 2003

Category filter:
  category_id = "cat_frens" AND is_active = true

Price range:
  price >= 100 AND price <= 500

In stock:
  stock_qty >= 1
```

Multiple fitment conditions must use disjunction (OR) when the user selects a vehicle —
a product matches if any of its fitments matches the selected vehicle.

### 5.5 Fallback

If Meilisearch is unreachable, the product listing page returns a 503 with a user-facing
Turkish error message. It does not silently fall back to raw SQL queries, as that would
produce inconsistent results and degrade performance unpredictably.

---

## 6. Tami Sanal POS Integration

### 6.1 Configuration

All Tami credentials are supplied exclusively via environment variables:

```
TAMI_MERCHANT_NUMBER   # Issued by Tami on merchant registration
TAMI_TERMINAL_NUMBER   # Issued by Tami on merchant registration
TAMI_SECRET_KEY        # Issued by Tami on merchant registration
TAMI_API_BASE_URL      # Sandbox or production base URL, no trailing slash
```

No credential values appear in source code.

### 6.2 Required Cryptographic Operations

Implement these three functions in `src/lib/server/tami.ts` using Node.js built-in
`crypto` only.

**`buildAuthToken()`**
Produces the `PG-Auth-Token` header value.
Format: `{merchantNumber}:{terminalNumber}:{hash}`
Hash: `Base64( SHA-256( merchantNumber + terminalNumber + secretKey ) )`

**`buildSecurityHash(orderId, amount)`**
Produces the `securityHash` field in request bodies.
Hash: `Base64( SHA-256( orderId + amount + merchantNumber + terminalNumber + secretKey ) )`

**`verifyCallbackHash(params, receivedHash)`**
Verifies `hashedData` in the 3D callback. Must return false on any mismatch.
Algorithm: `Base64( HMAC-SHA256( key=secretKey, data=... ) )`
Data string (concatenated in this order, no separator):
`cardOrganization + cardBrand + cardType + maskedNumber + installmentCount +
 currencyCode + originalAmount + orderId + systemTime + success`

### 6.3 HTTP Request Requirements

Every request to the Tami API must include:

```
Content-Type: application/json
CorrelationId: <unique string per request, e.g. "Corr" + timestamp + random suffix>
PG-Auth-Token: <buildAuthToken()>
```

### 6.4 Idempotency

- `tami_order_id` is generated once when the order row is first created and never
  regenerated. It is reused on any retry of the same order. This prevents duplicate
  charges if the customer retries a failed payment.
- Before initiating a new payment attempt, check `payment_attempts` for an existing row
  with the same `order_id`. If `payment_status` is already `BASARILI`, reject the
  request with a 409 and redirect to the result page.
- Each call to the initiation endpoint (`/api/odeme/baslat`) inserts a new row in
  `payment_attempts` with `attempt_no = previous_max + 1`. The unique constraint on
  `(order_id, attempt_no)` prevents race conditions.

### 6.5 Payment Flow

**Step 1 — Initiate (`POST /api/odeme/baslat`)**

1. Validate cart is non-empty and address/card fields pass schema validation.
2. Check idempotency: if the order is already `BASARILI`, return 409.
3. Insert `payment_attempts` row with `status = ISLENIYOR`.
4. Update order `payment_status = ISLENIYOR`, `status = ODEME_BEKLENIYOR`,
   set `expires_at = now() + 30 minutes`.
5. POST to `{TAMI_API_BASE_URL}/payment/auth` with full payload including `callbackUrl`.
6. On Tami success: decode `threeDSHtmlContent` from Base64 and return raw HTML to browser.
7. On Tami error: update `payment_attempts.status = BASARISIZ`, update order
   `payment_status = BASARISIZ`, return error to browser.

**Step 2 — 3D Verification (browser)**

The browser injects the decoded HTML into the DOM and calls `.submit()` on the embedded
`<form>`. The bank's OTP page is shown. On completion Tami POSTs the result to
`callbackUrl`.

**Step 3 — Callback (`POST /api/odeme/callback`)**

This endpoint receives `application/x-www-form-urlencoded` data from Tami.

1. Retrieve order by `tami_order_id`.
2. If order `payment_status` is already `BASARILI`, return 200 immediately (duplicate
   callback — do not re-process).
3. **Verify `hashedData`** using `verifyCallbackHash()`. On failure: update order
   `payment_status = BASARISIZ`, update `payment_attempts`, redirect to failure page.
4. If posted `success != "true"`: same failure handling as above.
5. POST to `{TAMI_API_BASE_URL}/payment/complete-3ds`.
6. On success: set order `payment_status = BASARILI`, `status = ODEME_ALINDI`, store Tami
   reference fields. Decrement `stock_qty` for each order item within a single
   PostgreSQL transaction. Update `payment_attempts.status = BASARILI`. Redirect to
   success page.
7. On failure: set `payment_status = BASARISIZ`, update `payment_attempts`. Redirect to
   failure page.

External API retry policy:
- Max 3 retries
- Exponential backoff: 500ms, 1s, 2s
- Only retry on network/5xx errors
- Never retry after a successful response

### 6.6 Failure States & Timeout Handling

| Failure scenario | Resulting payment_status | Recovery |
|---|---|---|
| User closes 3D screen before submitting | `ISLENIYOR` → `ZAMAN_ASIMI` (by cron) | Customer may retry from order page |
| Callback never arrives | `ISLENIYOR` → `ZAMAN_ASIMI` (by cron) | Customer may retry |
| Tami API timeout on initiation | `BASARISIZ` | Customer may retry |
| complete-3ds succeeds but app crashes before writing | Reconcile via Tami `/payment/query` | Admin can manually mark or requery |
| Duplicate callback received | No-op (idempotency check) | — |

**Stale order cron (`scripts/check-stale-orders.mjs`):**
Run every 5 minutes (via Docker `healthcheck` or a sidecar cron container).
Query: `WHERE payment_status = 'ISLENIYOR' AND expires_at < now()`.
For each match: call `{TAMI_API_BASE_URL}/payment/query` to confirm actual Tami status.
If Tami confirms not paid: set `payment_status = ZAMAN_ASIMI`.
If Tami confirms paid (edge case): complete the order normally.

### 6.7 Cancel & Refund

- **Cancel** (`POST /api/odeme/iptal`): Admin only. Posts to
  `{TAMI_API_BASE_URL}/payment/cancel`. Valid same-day only (before end-of-day batch).
  On success: `status = IPTAL`, `payment_status = IPTAL`. Restore stock.
- **Refund** (`POST /api/odeme/iade`): Admin only. Supports partial amounts. Posts to
  `{TAMI_API_BASE_URL}/payment/refund`. On success: `status = IADE`,
  `payment_status = IADE`. Restore stock proportionally if full refund.

### 6.8 Supporting Lookups

- **BIN lookup** (`POST /api/bin`): Takes the first 6–8 card digits. Proxies to
  `{TAMI_API_BASE_URL}/bin/query`. Returns card brand and available installment options.
  Response is used to populate the installment selector in the checkout UI.
- **Transaction query**: Admin order detail page may call `{TAMI_API_BASE_URL}/payment/query`
  to fetch the live Tami-side status for reconciliation.

---

## 7. Validation & Business Rules

All rules below are server-enforced. Client-side validation is a UX aid only.

### Product

| Field | Rule |
|---|---|
| `name` | Required, 2–255 characters |
| `slug` | Required, unique, auto-generated from name if not provided, URL-safe characters only |
| `sku` | Required, unique, max 100 characters |
| `price` | Required, > 0 |
| `compare_price` | Optional, must be > `price` if set |
| `stock_qty` | Required, integer ≥ 0; database CHECK constraint enforces non-negative |
| `category_id` | Required, must exist |
| Images | At least 1 required to activate a product. Max 10 images per product. Each image max 5 MB, MIME type must be `image/jpeg`, `image/png`, or `image/webp`. |

Upload constraints:
- Generate UUID-based filenames (ignore original filename)
- Strip all path components from user input
- Validate MIME using file signature (magic bytes), not only headers
- Reject files with executable content

### Orders & Stock

- Stock is decremented within a single PostgreSQL transaction at payment completion.
Atomic payment completion transaction MUST include:
- Order status update
- Payment status update
- Stock decrement (all items)
- Payment_attempts update

All must succeed or rollback together.

- Use `FOR UPDATE` row locking on the product rows to prevent overselling under concurrent
  orders:
  ```sql
  SELECT stock_qty FROM products WHERE id = $1 FOR UPDATE;
  -- then check stock_qty >= requested quantity before decrementing
  ```
- If stock is insufficient at the moment of decrement (race condition), the order must be
  marked `BASARISIZ` and a refund issued immediately via Tami.

### Admin Settings

- Logo: PNG or SVG only, max 2 MB, recommended 200 × 60 px.
- `primary_color`: must be a valid 6-digit hex colour (`#rrggbb`).
- `site_name`: required, 1–100 characters.

---

## 8. SEO Requirements

All customer-facing pages must be server-rendered (SSR via SvelteKit `+page.server.ts`).
No product or category content may be deferred to client-side rendering.

### Per-page requirements

**Product detail page:**
```html
<title>{product.meta_title ?? product.name} | {site_settings.site_name}</title>
<meta name="description" content="{product.meta_description ?? first 160 chars of description}">
<link rel="canonical" href="{PUBLIC_BASE_URL}/urunler/{product.slug}">
<meta property="og:title" content="...">
<meta property="og:image" content="{primary image URL}">
```

JSON-LD structured data block (Product schema):
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "...",
  "sku": "...",
  "brand": { "@type": "Brand", "name": "..." },
  "offers": {
    "@type": "Offer",
    "price": "...",
    "priceCurrency": "TRY",
    "availability": "https://schema.org/InStock | OutOfStock"
  }
}
```

**Category / listing page:**
```html
<title>{category.name} | {site_settings.site_name}</title>
<link rel="canonical" href="{PUBLIC_BASE_URL}/urunler?kategori={slug}">
```

**Sitemap:** A SvelteKit endpoint at `/sitemap.xml` dynamically generates entries for all
active products and categories. Regenerated on each request with a 1-hour `Cache-Control`.

**robots.txt:** Static file at `/static/robots.txt`. Disallow `/admin`, `/api`, `/odeme`.

**`lang` attribute:** `<html lang="tr">` on every page.

---

## 9. UI Requirements

### 9.1 Landing Page

| Section | Behaviour |
|---|---|
| Header | Logo, search bar, cart icon with count, login/account link |
| Hero | Full-width. Title, subtitle, background image from `site_settings`. Central search bar. |
| Category grid | Top-level categories. Each links to `/urunler?kategori={slug}`. |
| Featured products | Horizontal scroll of `is_featured = true` products. |
| Trust badges | Secure Payment, Fast Shipping, Original Parts, Easy Returns. |
| Brand strip | Part brand logos. |
| Footer | Logo, nav, contact info, social links from `site_settings`. |

### 9.2 Product Listing Page (`/urunler`)

All active filters are reflected in URL query parameters (shareable, server-rendered).

**Filter panel (executed in Meilisearch, not Postgres):**
- Vehicle Make → Model → Year (cascading; each level populates from Meilisearch facets)
- Part Category
- Part Brand
- Price range (dual-handle slider, ₺)
- In-stock only

**Results:**
- Sort: Newest, Price ↑, Price ↓, Best Selling
- Pagination: 20 per page
- Product card: primary image, name, brand, SKU, price (with strikethrough compare price),
  stock badge, "Sepete Ekle" button

### 9.3 Product Detail Page

- Image gallery: thumbnails + main view + click-to-zoom
- Name, SKU badge, brand, price
- Stock status: In Stock / Low Stock (qty ≤ 5) / Out of Stock
- Quantity selector + "Sepete Ekle" (disabled when out of stock)
- Installment preview populated from BIN lookup
- Compatible vehicles table (from `vehicle_fitments`)
- Description (server-rendered HTML)
- Related products from same category (Meilisearch query)

### 9.4 Checkout

Three steps in a single-page form:
1. Delivery address
2. Card details + installment selector (populated from BIN lookup on card digit entry)
3. Order summary + submit

On submit, form action calls Tami initiation. On success, decoded 3D HTML is injected
and auto-submitted.

### 9.5 Admin Panel

Access: `role = ADMIN` only, redirect otherwise.

**Dashboard:** Revenue today/this month, order counts by status, low-stock alert
(`stock_qty < 5`), recent orders.

**Products:** Searchable/paginated table, full create/edit form with all fields, multi-image
upload (drag-to-reorder, set primary), active/featured toggles, bulk CSV import
(columns: name, sku, price, stock, category\_slug, brand).

**Orders:** Filter by status and date. Detail view with items, totals, Tami reference
fields. Actions: Mark as Shipped, Cancel, Refund.

**Vehicle Fitments:** Accessible from the product edit page. Table of fitment rows per
product. Add/edit/delete fitment rows (make, model, year\_from, year\_to, notes).

**Categories:** Nested tree, create/edit/delete, optional image.

**Settings:**
- Logo upload (PNG/SVG, max 2 MB, 200 × 60 px recommended)
- Site name, primary colour picker (validated hex)
- Hero title, subtitle, background image
- Contact email, phone, address
- Social media URLs

---

## 10. Rate Limiting

Enforced at the Nginx layer. No application-level rate limiting is required.

| Location | Limit | Zone |
|---|---|---|
| `/api/odeme/` | 10 req/min per IP | `zone=payment` |
| `/api/bin` | 30 req/min per IP | `zone=bin` |
| `/api/upload` | 20 req/min per IP | `zone=upload` |
| All other `/api/` | 60 req/min per IP | `zone=api` |

```nginx
limit_req_zone $binary_remote_addr zone=payment:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=bin:10m    rate=30r/m;
limit_req_zone $binary_remote_addr zone=upload:10m rate=20r/m;
limit_req_zone $binary_remote_addr zone=api:10m    rate=60r/m;
```

---

## 11. Logging & Observability

- **Application logs:** SvelteKit server writes structured JSON logs to stdout.
  Docker captures these via its default logging driver.
- **Log fields:** `timestamp`, `level` (info/warn/error), `route`, `duration_ms`,
  `status_code`, `user_id` (if authenticated), `order_id` (for payment routes),
  `tami_correl_id` (when available).
- **Payment events:** Every Tami request and response must be logged at `info` level,
  including `tami_order_id` and response `success` field. Never log card numbers, CVV,
  or full card holder name.
- **Error tracking:** Unhandled errors are logged with full stack trace. No external
  error tracking service is required, but the log format must be parseable (JSON) so
  one can be added later.
- **Nginx access logs:** Default combined format. Retention managed by Docker log rotation
  (`max-size: 50m, max-file: 5`).

---

## 12. Deployment

### 12.1 Volume & Static File Strategy

The `uploads` named volume is mounted in **both** `app` and `nginx` containers at
`/app/uploads`. Nginx serves upload files directly from this path. The Node.js process
never serves files from `/uploads/`.

### 12.2 Migration & Startup Order

Migrations must complete before the application begins accepting HTTP traffic.

The `app` container's entrypoint must follow this sequence:
```
1. npx drizzle-kit migrate   # Apply pending migrations
2. node scripts/reindex.mjs  # Ensure Meilisearch index is populated
3. node build/index.js       # Start HTTP server
```

Wrap this in a shell entrypoint script (`docker-entrypoint.sh`). The compose `depends_on`
with `service_healthy` on `db` ensures PostgreSQL is ready before this runs.

### 12.3 Zero-Downtime Updates

The application is stateless (sessions are in PostgreSQL, uploads are on a volume). This
means:

- Rolling restarts are safe: `docker compose up -d --build` starts the new container
  before stopping the old one when `restart: unless-stopped` is set.
- Migrations must be backwards-compatible (additive only: add columns/tables, never drop
  or rename in the same deploy as code that depends on the new schema).
- If a migration is destructive, it must be split into two deploys: one to migrate (with
  old code still reading both old and new columns) and one to remove the old code path.

### 12.4 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/build             ./build
COPY --from=builder /app/package.json      ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/scripts           ./scripts
COPY docker-entrypoint.sh ./
RUN npm ci --omit=dev && chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
```

`build/index.js` is the fixed output path for `@sveltejs/adapter-node`. Do not change
the adapter output directory in `svelte.config.ts` without updating this path.

### 12.5 `docker-compose.yml`

```yaml
version: '3.9'
services:

  app:
    build: .
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/otoparca
      MEILI_URL: http://meilisearch:7700
    volumes:
      - uploads:/app/uploads
    depends_on:
      db:
        condition: service_healthy
      meilisearch:
        condition: service_started

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB:       otoparca
      POSTGRES_USER:     postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  meilisearch:
    image: getmeili/meilisearch:v1.8
    restart: unless-stopped
    environment:
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
      MEILI_ENV: production
    volumes:
      - meilidata:/meili_data

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - uploads:/app/uploads:ro
      - certbot_conf:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    depends_on:
      - app

  certbot:
    image: certbot/certbot
    volumes:
      - certbot_conf:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    entrypoint: >
      sh -c "trap exit TERM;
             while :; do certbot renew --webroot -w /var/www/certbot;
             sleep 12h; done"

volumes:
  pgdata:
  uploads:
  meilidata:
  certbot_conf:
  certbot_www:
```

### 12.6 `nginx.conf` (outline)

```nginx
events {}
http {
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;

  limit_req_zone $binary_remote_addr zone=payment:10m rate=10r/m;
  limit_req_zone $binary_remote_addr zone=bin:10m    rate=30r/m;
  limit_req_zone $binary_remote_addr zone=upload:10m rate=20r/m;
  limit_req_zone $binary_remote_addr zone=api:10m    rate=60r/m;

  log_format main '$remote_addr - $status "$request" $body_bytes_sent "$http_referer"';
  access_log /var/log/nginx/access.log main;

  server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
  }

  server {
    listen 443 ssl;
    server_name YOUR_DOMAIN;
    ssl_certificate     /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;

    location /uploads/ {
      root /app;
      expires 30d;
      add_header Cache-Control "public, immutable";
    }

    location /api/odeme/ { limit_req zone=payment burst=5 nodelay; proxy_pass http://app:3000; }
    location /api/bin    { limit_req zone=bin    burst=10 nodelay; proxy_pass http://app:3000; }
    location /api/upload { limit_req zone=upload burst=5 nodelay;  proxy_pass http://app:3000; }
    location /api/       { limit_req zone=api    burst=20 nodelay; proxy_pass http://app:3000; }

    location / {
      proxy_pass         http://app:3000;
      proxy_set_header   Host              $host;
      proxy_set_header   X-Real-IP         $remote_addr;
      proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
    }
  }
}
```

### 12.7 First Deploy

```bash
ssh root@YOUR_SERVER_IP
curl -fsSL https://get.docker.com | sh && systemctl enable docker

git clone <your-repo> otoparca && cd otoparca
cp .env.example .env && nano .env

# Obtain SSL certificate before starting Nginx
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d YOUR_DOMAIN --email YOUR_EMAIL \
  --agree-tos --no-eff-email

docker compose up -d
# Migrations and Meilisearch reindex run automatically via docker-entrypoint.sh

docker compose exec app node scripts/create-admin.mjs

# Future updates (zero-downtime)
git pull && docker compose up -d --build
```

---

## 13. Backup Policy

- **PostgreSQL:** Daily `pg_dump` via a cron job on the host or a sidecar container.
  Retain 7 daily, 4 weekly, 3 monthly backups. Store on a separate volume or remote
  location (e.g. rsync to a second server).
- **Uploads volume:** Daily rsync of the `uploads` volume to off-site storage.
- **Meilisearch:** Not backed up independently — it is fully rebuildable from PostgreSQL
  via `scripts/reindex.mjs`. Note this in operational runbooks.
- **`.env` file:** Backed up separately and encrypted. Never committed to version control.

---

## 14. Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:PLACEHOLDER@db:5432/otoparca
DB_PASSWORD=PLACEHOLDER

# App
PUBLIC_BASE_URL=https://YOUR_DOMAIN
AUTH_SECRET=PLACEHOLDER_MIN_32_CHARS

# Tami Sanal POS
# Obtain all three from Tami on merchant registration.
# Sandbox:    https://sandbox-paymentapi.tami.com.tr
# Production: https://paymentapi.tami.com.tr
TAMI_MERCHANT_NUMBER=PLACEHOLDER
TAMI_TERMINAL_NUMBER=PLACEHOLDER
TAMI_SECRET_KEY=PLACEHOLDER
TAMI_API_BASE_URL=https://sandbox-paymentapi.tami.com.tr

# Meilisearch
MEILI_URL=http://meilisearch:7700
MEILI_MASTER_KEY=PLACEHOLDER_MIN_16_CHARS

# Uploads
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_BYTES=5242880
```

---

## 15. Security Requirements

- Card details are never written to the database at any point.
- `verifyCallbackHash()` is called on every Tami callback. Payment must not proceed if
  verification fails.
- All secrets are read from environment variables only.
- Passwords hashed with bcrypt (≥ 12 rounds).
- Uploaded files: MIME type must be validated server-side (not just file extension).
  Files are stored on the Docker volume, outside the source tree.
- CSRF: SvelteKit default origin-header check is sufficient.
- Admin routes return 302 for any session without `role = ADMIN`.
- Meilisearch is bound only to the internal Docker network. It must not be exposed on
  public ports.
- Nginx applies the rate limits defined in §10.

---

## 16. Localization

The application is Turkish-only at launch. To allow future language additions without
rewriting:

- All user-facing strings must be defined in a single locale file
  (`src/lib/i18n/tr.ts`) as a typed key-value object.
- No Turkish string literals may appear inline in Svelte component markup.
- Admin-editable content (hero title, site name, etc.) is stored in `site_settings` and
  is out of scope for the locale file.

---

## 17. Acceptance Criteria

The implementation is complete when all of the following pass:

| # | Criterion |
|---|---|
| 1 | A customer can browse products, filter by vehicle make/model/year and part category, and add items to cart without an account. All filter queries execute in Meilisearch. |
| 2 | A guest customer can complete a 3D-authenticated purchase using a Tami sandbox test card. The order is saved with `payment_status = BASARILI` and stock is decremented within a single PostgreSQL transaction. |
| 3 | A registered customer can view their past orders under `/hesabim`. |
| 4 | A failed 3D verification (hash mismatch or `success != true`) marks the order `BASARISIZ` and shows a Turkish error page. The callback is idempotent: a duplicate POST does not re-process. |
| 5 | An order with `payment_status = ISLENIYOR` and `expires_at` in the past is transitioned to `ZAMAN_ASIMI` by the stale-order cron after calling Tami's query endpoint. |
| 6 | Attempting to pay an already-`BASARILI` order returns 409 without contacting Tami. |
| 7 | Concurrent checkout of the last unit of a product results in exactly one successful order; the other receives a stock error. |
| 8 | Admin can create, edit, and deactivate a product. The change is reflected in Meilisearch within the same request cycle. |
| 9 | Admin can upload a new logo. The new logo appears in the header on the next page load. |
| 10 | Admin can update the hero section and primary colour from the settings page. |
| 11 | Admin can cancel a same-day order and issue a full or partial refund from the order detail page. |
| 12 | A product detail page passes Core Web Vitals and contains correct JSON-LD Product structured data. |
| 13 | `/sitemap.xml` lists all active products and categories with correct URLs. |
| 14 | The entire stack starts on a fresh VPS with `docker compose up -d` after supplying `.env`. Migrations and Meilisearch reindex run automatically before the app serves traffic. |
| 15 | Uploaded product images and the logo are served by Nginx, not the Node.js process. |
| 16 | No secrets or credential-like values exist anywhere in source code or committed configuration files. |
| 17 | All user-facing strings are sourced from `src/lib/i18n/tr.ts`. |
