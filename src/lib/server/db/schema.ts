import {
	pgTable,
	pgEnum,
	text,
	varchar,
	integer,
	smallint,
	boolean,
	numeric,
	timestamp,
	jsonb,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['CUSTOMER', 'ADMIN']);

export const orderStatusEnum = pgEnum('order_status', [
	'BEKLEMEDE',
	'ODEME_BEKLENIYOR',
	'ODEME_ALINDI',
	'HAZIRLANIYOR',
	'KARGOLANDI',
	'TESLIM_EDILDI',
	'IPTAL',
	'IADE'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
	'BEKLEMEDE',
	'ISLENIYOR',
	'BASARILI',
	'BASARISIZ',
	'ZAMAN_ASIMI',
	'IPTAL',
	'IADE',
	'EYLEM_GEREKLI'
]);

// ─── Users & Sessions ────────────────────────────────────────────────────────

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name').notNull(),
	phone: text('phone'),
	role: roleEnum('role').notNull().default('CUSTOMER'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// ─── Categories ──────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	parentId: text('parent_id').references((): any => categories.id),
	imageUrl: text('image_url')
});

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = pgTable('products', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	sku: text('sku').notNull().unique(),
	price: numeric('price', { precision: 10, scale: 2 }).notNull(),
	comparePrice: numeric('compare_price', { precision: 10, scale: 2 }),
	stockQty: integer('stock_qty').notNull().default(0),
	categoryId: text('category_id')
		.notNull()
		.references(() => categories.id),
	brand: text('brand'),
	isActive: boolean('is_active').notNull().default(false),
	isFeatured: boolean('is_featured').notNull().default(false),
	metaTitle: text('meta_title'),
	metaDescription: text('meta_description'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const productImages = pgTable('product_images', {
	id: text('id').primaryKey(),
	productId: text('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	url: text('url').notNull(),
	altText: text('alt_text'),
	isPrimary: boolean('is_primary').notNull().default(false),
	sortOrder: integer('sort_order').notNull().default(0)
});

// ─── Vehicle Fitments ────────────────────────────────────────────────────────

export const vehicleFitments = pgTable(
	'vehicle_fitments',
	{
		id: text('id').primaryKey(),
		productId: text('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		make: varchar('make', { length: 100 }).notNull(),
		model: varchar('model', { length: 100 }).notNull(),
		yearFrom: smallint('year_from').notNull(),
		yearTo: smallint('year_to').notNull(),
		notes: text('notes')
		// token column is GENERATED ALWAYS AS ... STORED — added via raw SQL in migration
	},
	(t) => [
		index('idx_fitments_make_model').on(t.make, t.model),
		index('idx_fitments_year').on(t.yearFrom, t.yearTo)
	]
);

// ─── Orders ──────────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
	id: text('id').primaryKey(),
	userId: text('user_id').references(() => users.id),
	guestEmail: text('guest_email'),
	status: orderStatusEnum('status').notNull().default('BEKLEMEDE'),
	paymentStatus: paymentStatusEnum('payment_status').notNull().default('BEKLEMEDE'),
	totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
	installmentCount: integer('installment_count').notNull().default(1),
	shippingAddress: jsonb('shipping_address').notNull(),
	billingAddress: jsonb('billing_address').notNull(),
	tamiOrderId: text('tami_order_id').unique(),
	tamiCorrelId: text('tami_correl_id'),
	bankAuthCode: text('bank_auth_code'),
	bankRefNumber: text('bank_ref_number'),
	notes: text('notes'),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const paymentAttempts = pgTable(
	'payment_attempts',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id),
		attemptNo: integer('attempt_no').notNull(),
		tamiOrderId: text('tami_order_id'),
		status: text('status').notNull(),
		initiatedAt: timestamp('initiated_at').notNull().defaultNow(),
		resolvedAt: timestamp('resolved_at'),
		errorCode: text('error_code'),
		errorMessage: text('error_message')
	},
	(t) => [uniqueIndex('uq_payment_attempts_order_attempt').on(t.orderId, t.attemptNo)]
);

export const orderItems = pgTable('order_items', {
	id: text('id').primaryKey(),
	orderId: text('order_id')
		.notNull()
		.references(() => orders.id),
	productId: text('product_id')
		.notNull()
		.references(() => products.id),
	quantity: integer('quantity').notNull(),
	unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
	productSnapshot: jsonb('product_snapshot').notNull()
});

// ─── Addresses ───────────────────────────────────────────────────────────────

export const addresses = pgTable('addresses', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	label: text('label'),
	fullName: text('full_name').notNull(),
	phone: text('phone').notNull(),
	address: text('address').notNull(),
	district: text('district').notNull(),
	city: text('city').notNull(),
	zipCode: text('zip_code'),
	isDefault: boolean('is_default').notNull().default(false)
});

// ─── Site Settings ───────────────────────────────────────────────────────────

export const siteSettings = pgTable('site_settings', {
	id: text('id').primaryKey().default('singleton'),
	logoUrl: text('logo_url'),
	siteName: text('site_name').notNull().default('Otoparca'),
	primaryColor: text('primary_color').notNull().default('#e11d48'),
	heroTitle: text('hero_title'),
	heroSubtitle: text('hero_subtitle'),
	heroImageUrl: text('hero_image_url'),
	contactEmail: text('contact_email'),
	contactPhone: text('contact_phone'),
	address: text('address'),
	socialLinks: jsonb('social_links').default('{}'),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});
