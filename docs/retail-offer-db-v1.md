# Retail Offer DB V1

Sprint 2.0 moves the price comparison data source from fixture-backed offers to database-backed current offers and price snapshots.

Public API response shapes must not change.

## Data Flow

```text
Routes
-> Price Comparison Service
-> PriceComparisonRepository
-> DbPriceComparisonRepository
-> FixturePriceComparisonRepository fallback
```

Routes do not know whether data comes from the database or fixtures. The service still owns response composition, best price selection, offer count, last checked summary, and secondary nutrition / suitability context.

## Tables

### `retail_offers`

Represents the latest/current retailer offer state for a canonical product.

The current-offer unique key is:

```text
product_slug + retailer_slug + market + currency + pack_size_g
```

This prevents duplicate active offers when the same backfill script or ingestion job runs more than once.

### `price_snapshots`

Represents historical observation points for an offer.

Sprint 2.0 snapshot uniqueness is:

```text
retail_offer_id + captured_at
```

The fixture backfill uses each fixture offer's `last_checked_at` as `captured_at`, so rerunning the script does not create duplicate history points.

## Backfill

Run:

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run db:backfill:retail-offers
```

Backfill behavior:

- If the current offer exists, update `retail_offers`.
- If the current offer does not exist, insert it.
- If a matching `retail_offer_id + captured_at` snapshot exists, skip it.
- Different pack sizes remain separate.
- AU and NZ offers remain separate.
- AUD and NZD offers remain separate.

## Fixture Fallback

Fixture fallback remains available for local development, tests, and unseeded databases.

Allowed fallback cases:

- Local development.
- Test environment.
- DB has no seeded offers yet.
- Fallback is explicitly enabled with `PRICE_COMPARISON_FIXTURE_FALLBACK=true`.

DB failures are not silently hidden. In fallback-enabled modes, failures are logged before fixture data is used. In production-like mode with fallback disabled, DB errors are allowed to fail.

## Market Separation

Repository queries filter by both:

```text
market
currency
```

Rules:

- `market=AU` resolves to `AU + AUD`.
- `market=NZ` resolves to `NZ + NZD`.
- AU and NZ offers are never mixed in best-price calculations.
- AUD and NZD are never compared together.

## Effective Price

The conservative rule remains:

```text
effective_price = min(base_price, valid unconditional sale_price)
```

The following remain conditional unless explicitly marked unconditional:

- `member_price`
- `coupon_price`
- minimum-spend discounts
- conditional promotions

Out-of-stock offers may appear in the offer table, but they cannot win:

- `best_price_today`
- `best_retailer`
- `lowest_unit_price_per_kg`

## Stable APIs

These API shapes are preserved:

- `GET /api/search/products?q=&market=AU`
- `GET /api/products/:slug/offers?market=AU`
- `GET /api/price-comparison/:slug/offers?market=AU`
- `GET /api/price-comparison/:slug?market=AU`
- `GET /api/markets`
