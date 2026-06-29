# Cat Food Data Coverage Audit

Status: Sprint 3.2A docs-only audit  
Scope: current DB and canonical catalog only  
No DB mutation, no crawler work, no product expansion.

## Executive Summary

Current Pawkawa staging data is enough for a controlled AU cat food price-comparison demo, but not enough for public MVP scale.

The strongest part is Petstock + Petbarn overlap for the current canonical demo catalog. The weakest parts are active product images, product nutrition/ingredient records, and retailer coverage beyond the two current tracked retailers.

## Current Data Summary

Snapshot from staging DB during Sprint 3.2A:

| Metric | Count | Notes |
| --- | ---: | --- |
| Brands | 4 | Created from product master baseline. |
| Product master rows | 17 | Matches current `canonicalProducts` baseline. |
| Canonical products in code | 17 | AU cat food price-comparison catalog. |
| Retail offers | 36 | Includes Petstock, Petbarn, 1 legacy NZ fixture-like row. |
| Distinct offer product slugs | 19 | 17 canonical + 2 known orphan 400g rows. |
| Distinct retailer source URLs | 27 | Some retailer URLs cover multiple pack sizes. |
| Product images | 2 | QA uploaded images only. |
| Active product images | 0 | QA images were disabled before demo. |
| Manual overrides | 2 | QA-only manual overrides. |
| Active manual overrides | 0 | Both QA overrides are inactive. |
| Eligible manual overrides | 0 | No manual override currently affects public best price. |
| Product nutrition rows | 0 | Nutrition table not populated. |
| Product ingredient rows | 0 | Ingredient table not populated. |
| Ingredient dictionary rows | 0 | Dictionary table exists but is not populated. |

## Retailer Coverage

| Retailer | Offer count | Distinct product slugs | Status |
| --- | ---: | ---: | --- |
| Petbarn | 18 | 18 | Active tracked retailer. |
| Petstock | 17 | 17 | Active tracked retailer. |
| NZ Pet Store | 1 | 1 | Legacy/dev fixture-style row; not current AU demo source. |

## Canonical Product Coverage

Current product master has 17 rows. Current retail offer slugs include 19 distinct slugs.

### Strong Overlap

Most canonical products have both Petstock and Petbarn offers:

- Black Hawk Indoor Chicken & Rice: 2kg, 4kg, 8kg
- Black Hawk Original Chicken: 2kg, 4kg, 12kg
- Hill's Science Diet Indoor Adult: 2kg, 4kg
- Hill's Science Diet Sensitive Stomach & Skin Adult Chicken: 3.17kg
- Royal Canin Indoor Adult: 2kg, 4kg, 10kg
- Royal Canin Fit Adult: 2kg, 4kg
- Royal Canin Light Weight Care Adult: 1.5kg, 3kg

### Limited Coverage

- `ziwi-peak-air-dried-mackerel-lamb-400g` currently has Petstock coverage only.

### Orphan / Quarantine Rows

These retail offer slugs exist without product master rows and should remain out of demo paths unless explicitly reviewed:

- `royal-canin-fit-adult-400g`
- `royal-canin-indoor-adult-400g`

## Image Coverage

Current active product image coverage is not ready for public product cards:

- Product master rows: 17
- Active product images: 0
- Products missing active image: 17
- QA uploaded images: 2, both disabled

The public UI still relies on placeholders and/or retailer image metadata in offer records. Public image rollout should be reviewed product by product, because retailer images may have usage, attribution, or stale-product risks.

## Offer Coverage By Product Type

### Products With 2+ Retailer Offers

16 canonical products currently have Petstock + Petbarn overlap.

### Products With 1 Retailer Offer

1 canonical product currently has one tracked retailer:

- `ziwi-peak-air-dried-mackerel-lamb-400g`

### Products With 0 Retailer Offers

0 canonical products currently have zero retailer offers.

### Products With Only Manual Overrides

0 current products depend only on active manual overrides.

## Product Master Vs Retail Offers

Known gap:

- `retail_offers.product_slug` is the public price-comparison grouping key.
- `products` now exists as admin product master baseline.
- The DB still does not have a first-class slug column on `products`.

This is acceptable for the current admin image binding fix, but future product master work should add or formalize a canonical slug mapping before broader admin operations depend on product identity.

## Nutrition / Ingredient Coverage

Current DB tables are empty:

- `product_nutrition`: 0 rows
- `product_ingredients`: 0 rows
- `ingredient_dictionary`: 0 rows

This means Product Compare and nutrition context are still secondary and should not be presented as comprehensive product intelligence.

Recommended source direction:

- Retailers: prices, pack sizes, stock, promotions, source URLs, product images for reference.
- Brand official sites: nutrition, ingredients, product descriptions, feeding guidance, official pack sizes.

## Questionable Offer / Source URL Risks

The most important current risk is not that offers are absent. It is that modern retailer pages include conditional price variants:

- Petbarn member prices
- Petstock repeat delivery prices
- bundle / multipack pages
- per-bag display prices
- pack selector pages that cover many sizes

Current price safety rules must continue to separate:

- ordinary comparable price
- member-only price
- subscription / repeat-delivery price
- coupon price
- minimum-spend discount
- bundle / multipack price

Known risk examples:

- Some Petstock rows have `price_basis = unknown` while still having repeat delivery conditional flags.
- Petbarn rows commonly include `member_price` conditional flags.
- Petbarn bundle pages should not be treated as ordinary single-pack offers unless explicitly mapped and validated.

## Top Missing Data Problems

1. Active product images are missing for all 17 product master rows.
2. Nutrition and ingredient tables are empty.
3. Product master does not yet expose a canonical slug field.
4. Two Royal Canin 400g orphan rows remain in quarantine.
5. Petstock/Petbarn cover the demo set, but broader AU market coverage is still thin.
6. Pet Circle, Budget Pet Products, and PetO/My Pet Warehouse need feed/partner feasibility before direct ingestion.
7. Conditional pricing remains a continuing QA burden.

## Fields To Collect Next

### Retailer Price Sources

- product URL
- retailer SKU / variant ID
- product title
- brand
- exact formula
- pack size
- unit count
- total pack size
- base price
- sale price
- member price
- subscription / repeat delivery price
- coupon price
- minimum spend
- stock status
- image URL
- last checked
- conditional flags
- offer type
- price basis
- source attribution

### Brand Official Sources

- official product name
- formula / flavour
- species
- life stage
- pack sizes
- ingredients
- guaranteed analysis / nutrition
- calories
- feeding guide caveats
- product image reference
- source URL
- last checked

## Recommended Next Sprint

Recommended next sprint:

```text
Sprint 3.2B — Product Image and Official Product Info Coverage Wave 1
```

Goal:

- keep price crawler expansion paused
- collect official brand product info for the existing 17 canonical products
- add reviewed product image metadata / uploads for the controlled demo set
- keep public image rollout gated by product-level review
