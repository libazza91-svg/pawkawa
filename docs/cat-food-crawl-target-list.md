# Cat Food Crawl Target List

Status: Sprint 3.2A docs-only planning  
Scope: target list only. No crawler, no parser, no DB mutation.

## Planning Principle

Pawkawa should continue to separate:

- retailer price sources
- brand official product-information sources

Retailer pages are for live offer data. Brand official sites are for product master, ingredients, nutrition, and pack-size verification.

## Retailer Priority

### P0: Current Tracked Retailers

| Source | Role | Current status | Next action |
| --- | --- | --- | --- |
| Petstock | Retail price source | Active, strongest current source. | Continue controlled URL ingestion and variant QA. |
| Petbarn | Retail price source | Active, useful but conditional/member pricing needs care. | Continue controlled URL ingestion with bundle guard and member-price separation. |

### P1: Candidate Expansion Sources

| Source | Role | Source strategy | Reason |
| --- | --- | --- | --- |
| Pet Circle | Retail price source | Feed / affiliate / partner route preferred. | Direct pages previously showed security/rate-limit issues. |
| PetO / My Pet Warehouse | Retail price source | Manual-review or feed-only until access is stable. | Direct pages previously showed challenge / 403 risk. |
| Budget Pet Products | Retail price source | Feed-only unless direct access becomes stable. | Direct pages previously showed challenge / robots risk. |

### P2: Later / Optional Sources

| Source | Role | Source strategy | Reason |
| --- | --- | --- | --- |
| VetShopAustralia | Retail price source | Feasibility check first. | Useful AU retailer, not yet proven in current ingestion path. |
| MegaPet | Retail price source | Feasibility check first. | Potential coverage expansion after P0/P1 are stable. |
| VetSupply | Retail price source | Feed-first / manual-review. | Parseable signals observed earlier, but robots/compliance picture needs care. |
| Amazon AU | Retail price source | Avoid until needed. | Marketplace identity, sellers, pack bundles, and dynamic prices increase complexity. |

## Brand Official Priority

Brand official sources should be used for product master and product information, not price ranking.

P0 / P1 official product info targets:

1. Royal Canin
2. Hill's Science Diet
3. Black Hawk
4. Ziwi Peak
5. Advance
6. Purina One
7. Fancy Feast
8. Whiskas
9. Felix
10. Wellness
11. Feline Natural

## Recommended First 40-60 SKU Crawl List

This list is intentionally biased toward high-demand AU cat food, products with likely retailer overlap, and brands already relevant to the current catalog.

### Royal Canin

1. Royal Canin Indoor Adult 2kg
2. Royal Canin Indoor Adult 4kg
3. Royal Canin Indoor Adult 10kg
4. Royal Canin Fit Adult 2kg
5. Royal Canin Fit Adult 4kg
6. Royal Canin Light Weight Care Adult 1.5kg
7. Royal Canin Light Weight Care Adult 3kg
8. Royal Canin Hairball Care Adult 2kg
9. Royal Canin Hairball Care Adult 4kg
10. Royal Canin Urinary Care Adult 2kg
11. Royal Canin Sensible Adult 2kg
12. Royal Canin Kitten 2kg

### Hill's Science Diet

13. Hill's Science Diet Indoor Adult Chicken 2kg
14. Hill's Science Diet Indoor Adult Chicken 4kg
15. Hill's Science Diet Sensitive Stomach & Skin Adult Chicken 3.17kg
16. Hill's Science Diet Adult Chicken 2kg
17. Hill's Science Diet Adult Chicken 4kg
18. Hill's Science Diet Perfect Weight Adult 1.36kg
19. Hill's Science Diet Hairball Control Adult 1.59kg
20. Hill's Science Diet Kitten Chicken 1.58kg

### Black Hawk

21. Black Hawk Healthy Benefits Indoor Chicken & Rice 2kg
22. Black Hawk Healthy Benefits Indoor Chicken & Rice 4kg
23. Black Hawk Healthy Benefits Indoor Chicken & Rice 8kg
24. Black Hawk Original Chicken Adult 2kg
25. Black Hawk Original Chicken Adult 4kg
26. Black Hawk Original Chicken Adult 12kg
27. Black Hawk Original Fish Adult 2kg
28. Black Hawk Healthy Benefits Hairball Chicken 2kg
29. Black Hawk Healthy Benefits Mature Chicken 2kg

### Ziwi Peak / Feline Natural

30. Ziwi Peak Air-Dried Mackerel & Lamb 400g
31. Ziwi Peak Air-Dried Chicken 400g
32. Ziwi Peak Air-Dried Beef 400g
33. Ziwi Peak Air-Dried Venison 400g
34. Feline Natural Chicken & Lamb Feast 320g
35. Feline Natural Beef & Hoki Feast 320g
36. Feline Natural Lamb & King Salmon Feast 320g

### Advance / Purina / Supermarket Brands

37. Advance Adult Chicken Dry Cat Food 3kg
38. Advance Indoor Adult Chicken Dry Cat Food 3kg
39. Advance Kitten Chicken Dry Cat Food 3kg
40. Purina One Indoor Advantage 1.4kg
41. Purina One Sensitive Systems 1.4kg
42. Purina One Healthy Kitten 1.4kg
43. Fancy Feast Adult Dry Cat Food Chicken 1.9kg
44. Fancy Feast Adult Dry Cat Food Salmon 1.9kg
45. Whiskas Adult Chicken Dry Cat Food 2kg
46. Whiskas Adult Tuna Dry Cat Food 2kg
47. Felix As Good As It Looks wet multipack

### Wellness / Premium Expansion

48. Wellness CORE Original Adult Cat 2kg
49. Wellness CORE Indoor Adult Cat 2kg
50. Wellness Complete Health Chicken Adult Cat 2kg
51. Applaws Chicken Dry Cat Food 2kg
52. Applaws Ocean Fish Dry Cat Food 2kg
53. Ivory Coat Grain Free Chicken & Kangaroo Cat 3kg
54. Ivory Coat Grain Free Ocean Fish & Salmon Cat 3kg
55. Meals for Meows Kangaroo & Turkey 2.5kg
56. Meals for Meows Salmon & Turkey 2.5kg

## P0 Retailer Crawl Targets

### Petstock

Goal:

- validate exact URL and variant mapping for the first 40-60 SKU list
- collect ordinary price, sale price, repeat delivery/subscription flag, stock, image URL
- confirm offer type and price basis

Must guard:

- repeat delivery discounts
- shared product pages with size selectors
- sale badges that apply only to selected variants
- pack-size mismatch

### Petbarn

Goal:

- validate exact URL and variant mapping for the same SKU list where available
- collect ordinary price, member price, repeat delivery price, stock, image URL
- avoid bundles unless explicitly classified as bundle/multipack

Must guard:

- member-only prices
- bundle URLs such as `/p/bundle-*`
- weight selector pages where selected variant changes price
- per-bag display on multipacks
- postcode-dependent availability

## P1 Retailer Feasibility Targets

Do not build parsers until each source has 2-4 exact product URLs that pass robots/accessibility/manual review.

### Pet Circle

Preferred path:

- feed / affiliate / partner data

Only revisit direct product pages if:

- robots access is clear
- no security checkpoint / rate limit
- exact product URL gives stable product data

### PetO / My Pet Warehouse

Preferred path:

- manual-review or feed-only

Avoid direct scraping while challenge/403 risk remains.

### Budget Pet Products

Preferred path:

- affiliate/product feed

Avoid direct page ingestion unless robots and access are clearly acceptable.

## Official Brand Info Targets

For each official product, collect:

- official product name
- canonical formula
- species
- life stage
- pack sizes
- ingredients
- guaranteed analysis
- calories
- feeding-guide caveats
- official image reference
- official source URL
- last checked date

Use brand official pages to validate:

- product identity
- product formula
- ingredients and nutrition
- pack size list

Do not use official brand pages for live retailer price ranking.

## Missing Data Problems To Prioritize

1. Add reviewed images for the 8 controlled demo products first.
2. Fill official product info for the existing 17 canonical products.
3. Resolve or keep quarantined the two Royal Canin 400g orphan rows.
4. Add slug mapping to product master before broader admin product operations.
5. Expand P0 retailer URL coverage for the first 40-60 SKU list.
6. Keep P1 sources feasibility-gated; do not build parsers prematurely.

## Recommended Next Sprint

Recommended next sprint:

```text
Sprint 3.2B — Official Product Info + Image Coverage Wave 1
```

Suggested scope:

- no new retailer parser
- no crawler yet
- collect official brand info for current 17 canonical products
- add reviewed product image metadata for the demo whitelist
- define product master slug mapping proposal
