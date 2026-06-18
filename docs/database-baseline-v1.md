# Database Baseline V1

Sprint 2.0C consolidates the official Pawkawa database baseline.

## Source Of Truth

The official schema source of truth is the Drizzle integer schema:

```text
backend/src/db/schema/*
```

The active migration source is:

```text
backend/src/db/migrations/*.sql
```

Migration files are executed in filename order by:

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run db:migrate
```

## Deprecated Legacy Schema

The old UUID-style schema has been preserved as:

```text
backend/schema.legacy-uuid.sql
```

It is historical reference only.

Do not use it for current migrations. It defines UUID primary keys such as `brands.brand_id UUID` and `products.product_id UUID`, while the current backend code uses integer / serial IDs.

## Migration Order

Current order:

```text
000_baseline.sql
002_add_price_layer.sql
003_add_verification_layer.sql
004_add_product_discovery_layer.sql
005_add_price_comparison_core.sql
```

`000_baseline.sql` creates the integer baseline required by active routes and tests:

```text
brands
products
product_nutrition
product_ingredients
product_prices
sources
health_rules
recommendation_logs
ingredient_dictionary
crawler_jobs
import_batches
```

`004_add_product_discovery_layer.sql` adds:

```text
retailer_product_mappings
product_images
```

`005_add_price_comparison_core.sql` adds:

```text
retail_offers
price_snapshots
```

## Fresh DB Setup

For a fresh staging or local PostgreSQL database:

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run db:migrate
npm run db:backfill:retail-offers
```

`backend/.env` should contain `DATABASE_URL`, but `.env` must never be committed.

Recommended DB-only validation:

```env
PRICE_COMPARISON_FIXTURE_FALLBACK=false
```

## Supabase Staging Notes

Supabase staging must not be reset without explicit approval.

Sprint 2.0B initialized the staging database with the minimum price-path tables. Sprint 2.0C migrations are additive and idempotent where possible, so `npm run db:migrate` can align staging with the official integer baseline without using the deprecated UUID schema.

For Supabase pooler connections, use SSL parameters in the local ignored `.env` as needed. Do not paste or commit secrets into documentation.

## Retail Offer Backfill

Run:

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run db:backfill:retail-offers
```

Backfill is idempotent:

```text
retail_offers unique key:
product_slug + retailer_slug + market + currency + pack_size_g

price_snapshots unique key:
retail_offer_id + captured_at
```

## Safety Check SQL

Table existence:

```sql
SELECT to_regclass('public.brands');
SELECT to_regclass('public.products');
SELECT to_regclass('public.retail_offers');
SELECT to_regclass('public.price_snapshots');
```

Index existence:

```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
  'idx_retail_offers_unique_current_offer',
  'idx_price_snapshots_unique_offer_time'
);
```

Duplicate current offers:

```sql
SELECT product_slug, retailer_slug, market, currency, pack_size_g, COUNT(*)
FROM retail_offers
GROUP BY product_slug, retailer_slug, market, currency, pack_size_g
HAVING COUNT(*) > 1;
```

Duplicate snapshots:

```sql
SELECT retail_offer_id, captured_at, COUNT(*)
FROM price_snapshots
GROUP BY retail_offer_id, captured_at
HAVING COUNT(*) > 1;
```

## product_prices Legacy Compatibility

`product_prices` remains for legacy price and verification flows.

Sprint 2.0 does not destructively migrate or remove it. The price-first MVP path uses:

```text
retail_offers
price_snapshots
```

Existing product price consumers should continue to work while newer price comparison APIs use the retail offer repository path.

## Secrets Policy

Never commit:

```text
backend/.env
DATABASE_URL
Supabase passwords
```

The repository `.gitignore` excludes `.env` and `.env.*`.
