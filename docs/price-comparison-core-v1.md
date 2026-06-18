# Price Comparison Core V1

Sprint 1.8 moves Pawkawa's MVP foundation back to price-first product comparison.

Primary path:

```text
Exact cat food search -> Canonical product match -> Market-specific retailer offers -> Best price / unit price / stock / promotion comparison
```

Decision Assistant modules remain available for secondary nutrition guidance, suitability explanation, SEO support, and alternatives. They do not drive the primary buying journey.

## APIs

### `GET /api/search/products?q=&market=AU`

Searches canonical products, not raw retailer listings.

Each result includes:

- `product_id`
- `slug`
- `product_name`
- `brand_name`
- `primary_image_url`
- `pack_sizes`
- `lowest_effective_price`
- `lowest_unit_price_per_kg`
- `best_retailer`
- `offer_count`
- `market`
- `currency`

### `GET /api/products/:slug/offers?market=AU`

Returns retailer offers for a canonical product. This route is additive and is tested not to break legacy `/api/products/search` or `/api/products/:id`.

### `GET /api/price-comparison/:slug/offers?market=AU`

Alias-style price-comparison namespace for product offers. This is safer if `/api/products` grows more legacy routes later.

### `GET /api/price-comparison/:slug?market=AU`

Returns the product price-comparison payload:

- product identity
- `best_price_today`
- `best_retailer`
- `lowest_unit_price_per_kg`
- `offer_count`
- `last_checked_summary`
- offer table
- secondary nutrition / ingredients / suitability context

### `GET /api/markets`

Returns supported market metadata. AU is enabled. NZ is structurally supported and currently pending.

## Retail Offer

Every offer includes:

- `market`
- `currency`
- `retailer_name`
- `retailer_slug`
- `product_url`
- `pack_size_g`
- `base_price`
- `sale_price`
- `member_price`
- `coupon_price`
- `conditional_best_price`
- `conditional_price_reason`
- `effective_price`
- `unit_price_per_kg`
- `stock_status`
- `promotion_text`
- `promotion_type`
- `coupon_code`
- `minimum_spend`
- `shipping_threshold`
- `last_checked_at`

## Effective Price

Default rule:

```text
effective_price = min(base_price, valid unconditional sale_price)
```

Conditional prices are not silently used as best price:

- member price
- coupon price
- minimum-spend promotion
- conditional discount

They are exposed through:

- `conditional_best_price`
- `conditional_price_reason`
- `promotion_text`
- `coupon_code`
- `minimum_spend`

Out-of-stock offers may appear in offer tables, but they cannot win:

- `best_price_today`
- `best_retailer`
- `lowest_unit_price_per_kg`

Low-stock offers may win, but remain flagged as `LOW_STOCK`.

## Data Source Strategy

Sprint 2.0 introduces a repository boundary so public API shapes stay stable while the backing store moves from fixtures to database tables.

```text
Routes
-> Price Comparison Service
-> PriceComparisonRepository
-> DbPriceComparisonRepository
-> FixturePriceComparisonRepository fallback
```

The service owns response composition and best-price selection. Repositories own data access.

Existing `product_prices` remains untouched for compatibility. Sprint 1.8 adds:

- `retail_offers`
- `price_snapshots`

Sprint 2.0 uses `retail_offers` as current offer state and `price_snapshots` as historical observation points. Fixture fallback remains available for local development, tests, and unseeded databases, but DB failures are logged and are not silently hidden in production-like mode.
