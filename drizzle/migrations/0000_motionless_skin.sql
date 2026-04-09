CREATE TYPE "public"."order_status" AS ENUM('BEKLEMEDE', 'ODEME_BEKLENIYOR', 'ODEME_ALINDI', 'HAZIRLANIYOR', 'KARGOLANDI', 'TESLIM_EDILDI', 'IPTAL', 'IADE');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('BEKLEMEDE', 'ISLENIYOR', 'BASARILI', 'BASARISIZ', 'ZAMAN_ASIMI', 'IPTAL', 'IADE', 'EYLEM_GEREKLI');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('CUSTOMER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"district" text NOT NULL,
	"city" text NOT NULL,
	"zip_code" text,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" text,
	"image_url" text,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"product_snapshot" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"guest_email" text,
	"status" "order_status" DEFAULT 'BEKLEMEDE' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'BEKLEMEDE' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"installment_count" integer DEFAULT 1 NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"billing_address" jsonb NOT NULL,
	"tami_order_id" text,
	"tami_correl_id" text,
	"bank_auth_code" text,
	"bank_ref_number" text,
	"notes" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_tami_order_id_unique" UNIQUE("tami_order_id")
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"attempt_no" integer NOT NULL,
	"tami_order_id" text,
	"status" text NOT NULL,
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"error_code" text,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"sku" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"compare_price" numeric(10, 2),
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"category_id" text NOT NULL,
	"brand" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"logo_url" text,
	"site_name" text DEFAULT 'Otoparca' NOT NULL,
	"primary_color" text DEFAULT '#e11d48' NOT NULL,
	"hero_title" text,
	"hero_subtitle" text,
	"hero_image_url" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"social_links" jsonb DEFAULT '{}',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"role" "role" DEFAULT 'CUSTOMER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_fitments" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"make" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"year_from" smallint NOT NULL,
	"year_to" smallint NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ADD CONSTRAINT "vehicle_fitments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payment_attempts_order_attempt" ON "payment_attempts" USING btree ("order_id","attempt_no");--> statement-breakpoint
CREATE INDEX "idx_fitments_make_model" ON "vehicle_fitments" USING btree ("make","model");--> statement-breakpoint
CREATE INDEX "idx_fitments_year" ON "vehicle_fitments" USING btree ("year_from","year_to");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "stock_non_negative" CHECK (stock_qty >= 0);--> statement-breakpoint
ALTER TABLE "vehicle_fitments" ADD COLUMN "token" text GENERATED ALWAYS AS (lower(make || ' ' || model || ' ' || year_from || ' ' || year_to)) STORED;--> statement-breakpoint
CREATE INDEX "idx_fitments_token" ON "vehicle_fitments" USING GIN (to_tsvector('simple', token));