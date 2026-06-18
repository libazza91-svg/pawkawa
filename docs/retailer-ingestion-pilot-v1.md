# Retailer Ingestion Pilot V1

Sprint 2.1A introduced a controlled known-URL ingestion pilot for Petstock.

Sprint 2.1B expands that pilot into a manifest-driven SKU coverage batch while keeping the scope tightly controlled.

Sprint 2.1C adds a small manually reviewed canonical catalog expansion so the Petstock pilot can safely write more real AU cat food SKUs without weakening matcher thresholds.

Sprint 2.2A validates the same canonical SKU set against one approved second AU retailer, Petbarn, using only manually confirmed product URLs.

Sprint 2.2B refines canonical title vocabulary only. It does not lower confidence thresholds, add new canonicals, or widen retailer scope.

This is not a crawler rollout.

## Scope

Allowed:

- Manually supplied Petstock product URLs.
- Manually supplied Petbarn product URLs.
- One request at a time.
- Robots check before product fetch.
- Product-page parsing only.
- Conservative canonical matching.
- Writes to `retail_offers` and `price_snapshots`.

Not allowed:

- Category crawling.
- Search crawling.
- Filter/pagination crawling.
- Related products or recommendations crawling.
- Image downloads or rehosting.
- Frontend changes.

## Command

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run ingest:petstock-pilot -- https://www.petstock.com.au/products/royal-canin-indoor-adult-dry-cat-food
```

Manifest mode is now the default:

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run ingest:petstock-pilot
```

To point at a custom manifest:

```bash
npm run ingest:petstock-pilot -- --manifest src/ingestion/retail/manifests/petstock-pilot-urls.json
```

Multiple known URLs can still be supplied as additional arguments. The script also accepts:

```env
PETSTOCK_PILOT_URLS=https://www.petstock.com.au/products/example-one,https://www.petstock.com.au/products/example-two
```

For deterministic validation, you can pin snapshot time:

```env
PETSTOCK_PILOT_CAPTURED_AT=2026-06-15T00:00:00.000Z
```

Approved Petbarn pilot command:

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run ingest:petbarn-pilot
```

To point at a custom Petbarn manifest:

```bash
npm run ingest:petbarn-pilot -- --manifest src/ingestion/retail/manifests/petbarn-pilot-urls.json
```

For deterministic Petbarn validation:

```env
PETBARN_PILOT_CAPTURED_AT=2026-06-16T00:00:00.000Z
```

## Manifest

Approved manifest path:

```text
backend/src/ingestion/retail/manifests/petstock-pilot-urls.json
```

Each entry is explicit and reviewable:

```json
{
  "retailer": "petstock",
  "market": "AU",
  "currency": "AUD",
  "product_url": "https://www.petstock.com.au/products/...",
  "expected_brand": "Royal Canin",
  "expected_pack_size_g": 4000,
  "expected_canonical_slug": "royal-canin-indoor-adult-4000g"
}
```

The batch remains:

- AU / AUD only
- manual known URLs only
- no category crawling
- no search crawling
- no automatic URL discovery

Approved Petbarn manifest path:

```text
backend/src/ingestion/retail/manifests/petbarn-pilot-urls.json
```

The Petbarn pilot is limited to these four approved URLs:

- `https://www.petbarn.com.au/p/royal-canin-feline-indoor-cat-food`
- `https://www.petbarn.com.au/p/royal-canin-feline-in-out-fit-cat-food`
- `https://www.petbarn.com.au/p/science-diet-feline-adult-indoor-cat-food`
- `https://www.petbarn.com.au/p/hill-s-science-diet-sensitive-stomach-skin-adult-cat-food`

## Compliance

Before fetching a product page, the pilot:

1. Fetches `/robots.txt`.
2. Parses `User-agent` groups.
3. Confirms the supplied product URL is allowed.
4. Skips disallowed URLs.

The pilot uses an honest user-agent:

```text
PawkawaBot/0.1 (+contact placeholder; price comparison pilot)
```

## Parser Strategy

Petstock product pages are parsed in this order:

1. `__NEXT_DATA__` product app state.
2. JSON-LD product data.

Petbarn product pages are parsed in this order:

1. JSON-LD `ProductGroup` variant data.
2. JSON-LD single-product fallback.
3. HTML fallback for title / regular price / current brand attributes.

Extracted fields:

- retailer name / slug
- product URL
- product title
- brand
- pack size
- base price
- stock status
- promotion text when visible
- image URL
- captured time
- market / currency as `AU` / `AUD`

When `expected_pack_size_g` is present in the manifest, only that variant is considered for ingestion. Other parsed variants on the same page are ignored for that manifest row.

## Matching

The existing canonical matcher is used.

Write threshold:

```text
match_confidence >= 0.80
```

Low-confidence matches are skipped. Pack-size conflicts are skipped. Products that parse correctly but do not exist in the approved canonical catalog are reported as `CANONICAL_MISSING`.

Sprint 2.1C expands the approved formula vocabulary for conservative matching:

- `fit`
- `original`
- `light`
- `weight`
- `stomach`
- `skin`

These tokens are used to improve catalog precision, not to lower write thresholds.

Sprint 2.2B adds controlled title normalization:

- phrase mapping:
  - `in out fit -> fit`
  - `in and out fit -> fit`
  - `in/out fit -> fit`
- additional low-value token:
  - `adult`
- flavour handling distinction:
  - missing flavour evidence is not treated as explicit flavour conflict
  - explicit flavour conflict still lowers confidence

The matcher also strips brand tokens from product-title token overlap scoring so retailer titles like `Royal Canin Feline In & Out Fit Cat Food` are evaluated on their meaningful product vocabulary instead of repeating brand words.

## DB Writes

Successful matches write to:

```text
retail_offers
price_snapshots
```

Idempotency:

```text
retail_offers:
product_slug + retailer_slug + market + currency + pack_size_g

price_snapshots:
retail_offer_id + captured_at
```

Image URL and source attribution are stored in JSON metadata. Images are not downloaded or rehosted.

## Failure Statuses

The script returns structured reports:

- `INGESTED`
- `ROBOTS_DISALLOWED`
- `FETCH_TIMEOUT`
- `FETCH_BLOCKED`
- `PARSE_FAILED`
- `CANONICAL_MISSING`
- `LOW_CONFIDENCE_MATCH`
- `PACK_SIZE_CONFLICT`
- `PRICE_MISSING`
- `STOCK_UNKNOWN`
- `SKIPPED`

The 2.1B report also distinguishes:

- parsed successfully
- canonical matched successfully
- offer written
- snapshot written

This keeps parse quality separate from write success.

## Summary Metrics

Manifest runs return aggregate metrics:

- `urls_processed`
- `ingested_count`
- `skipped_count`
- `parse_success_count`
- `parse_success_rate`
- `canonical_match_success_count`
- `canonical_match_success_rate`
- `offers_written`
- `snapshots_written`
- `pack_size_conflicts`
- `canonical_missing_count`
- `low_confidence_count`

DB coverage metrics are also returned:

- `retail_offers_count`
- `price_snapshots_count`
- `petstock_active_offers_count`
- `canonical_products_with_petstock_offer_count`
- `petbarn_active_offers_count`
- `canonical_products_with_petbarn_offer_count`

## Validation

Run DB-only validation with:

```env
PRICE_COMPARISON_FIXTURE_FALLBACK=false
```

Smoke test:

```text
GET /api/search/products?q=royal canin&market=AU
GET /api/price-comparison/royal-canin-indoor-adult-4000g?market=AU
GET /api/price-comparison/royal-canin-indoor-adult-4000g/offers?market=AU
GET /api/products/royal-canin-indoor-adult-4000g/offers?market=AU
```

After Sprint 2.2A, at least one approved canonical SKU should expose both:

- `petstock`
- `petbarn`

under the same AU canonical `product_slug`.

After Sprint 2.2B, the approved Petbarn pilot improved from:

- `INGESTED: 2`
- `LOW_CONFIDENCE_MATCH: 2`

to:

- `INGESTED: 4`
- `LOW_CONFIDENCE_MATCH: 0`

while keeping thresholds unchanged at `>= 0.80` for writes.
