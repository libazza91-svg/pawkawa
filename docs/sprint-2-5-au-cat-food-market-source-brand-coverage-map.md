# Sprint 2.5 — AU Cat Food Market Source & Brand Coverage Map

Date checked: 2026-06-18  
Checked from: Sydney, Australia  
Scope: retailer and brand source audit only. No parser work, no DB changes, no frontend changes.

## Method

Each retailer source was checked against:

- `robots.txt`
- 1 Royal Canin product URL
- 1 Hill's product URL
- 1 Black Hawk / Advance product URL
- product page HTTP status
- challenge / 403 / maintenance risk
- JSON-LD presence
- app state presence
- visible product data signals:
  - price
  - pack size / specification
  - stock / availability
  - image

This audit intentionally does **not** use fixture fallback or frontend behavior. It is a source-side feasibility map.

## 1. AU Retailer List

Core retailer candidates reviewed:

1. Pet Circle
2. Petbarn
3. Petstock
4. PetO / My Pet Warehouse
5. Budget Pet Products
6. VetSupply

Secondary AU retailer names worth tracking later, but not deep-tested in this sprint:

- Amazon Australia
- Paws for Life
- Lucky Pet
- PetCareShed
- VetShopAustralia

## 2. AU Cat Food Brand List

Priority cat food brands for MVP overlap:

- Royal Canin
- Hill's Science Diet
- Black Hawk
- ADVANCE
- Ivory Coat
- Ziwi Peak
- Feline Natural
- Purina Pro Plan
- Fancy Feast
- Optimum
- Applaws
- Wellness CORE

Secondary / stretch brands:

- Dine
- Trilogy
- Meals for Meows
- Kit Cat
- Catmate

## 3. Retailer Source Map

### Petstock

- Label: `GREEN`
- Route: controlled product URL ingestion
- Robots:
  - `https://www.petstock.com.au/robots.txt`
  - fetched `200`
  - tested product URLs were allowed
- Product URLs tested:
  - Royal Canin: `https://www.petstock.com.au/products/royal-canin-indoor-adult-dry-cat-food`
  - Hill's: `https://www.petstock.com.au/products/hills-science-diet-indoor-adult-dry-cat-food`
  - Black Hawk: `https://www.petstock.com.au/products/black-hawk-original-chicken-cat-food`
- Result:
  - product pages returned `200`
  - no challenge / 403 observed
  - JSON-LD present
  - app state present
  - price present
  - size present
  - stock present
  - image present
- Affiliate / feed route:
  - affiliate route appears to exist in market, likely via affiliate network listings
  - no first-party product feed was confirmed in this sprint
- Recommendation:
  - best current AU retailer source for direct controlled ingestion

### Petbarn

- Label: `YELLOW`
- Route: manual-review / small controlled ingestion
- Robots:
  - `https://www.petbarn.com.au/robots.txt`
  - fetched `200`
  - tested product URLs were allowed
- Product URLs tested:
  - Royal Canin: `https://www.petbarn.com.au/p/royal-canin-feline-indoor-cat-food`
  - Hill's: `https://www.petbarn.com.au/p/science-diet-feline-adult-indoor-cat-food`
  - Black Hawk: `https://www.petbarn.com.au/p/black-hawk-original-chicken-adult-cat-food`
- Result:
  - product pages returned `200`
  - no challenge / 403 observed
  - visible HTML included price and size signals
  - JSON-LD not clearly exposed in the fetched markup
  - app state not clearly exposed in the fetched markup
  - stock / image signals were weaker in raw fetches than Petstock
- Affiliate / feed route:
  - affiliate route exists through Commission Factory / partner ecosystem references
- Recommendation:
  - usable for controlled manual URL ingestion
  - parser confidence will likely be lower than Petstock unless page extraction is hardened

### Pet Circle

- Label: `FEED`
- Route: feed / affiliate / partner route preferred
- Robots:
  - `https://www.petcircle.com.au/robots.txt`
  - direct fetch returned `429`
  - robots accessibility is unstable from an automated audit context
- Product URLs tested:
  - Royal Canin: `https://www.petcircle.com.au/product/royal-canin-indoor-adult-dry-cat-food`
  - Hill's: `https://www.petcircle.com.au/product/hills-science-diet-adult-indoor-dry-cat-food`
  - Black Hawk: `https://www.petcircle.com.au/product/black-hawk-original-dry-cat-food-adult-chicken-and-kangaroo`
- Result:
  - all tested product pages returned `429`
  - title resolved to `Vercel Security Checkpoint`
  - no usable structured product data was accessible in this audit pass
- Affiliate / feed route:
  - affiliate / commercial listing route exists in market references
  - better candidate for partner / feed path than direct page ingestion
- Recommendation:
  - do not use direct automated product-page ingestion now
  - revisit only if approved partner feed or controlled access route becomes available

### PetO / My Pet Warehouse

- Label: `AVOID`
- Route: avoid direct page ingestion
- Robots:
  - `https://www.mypetwarehouse.com.au/robots.txt`
  - robots was reachable in one pass, but tested product paths evaluated as not allowed
- Product URLs tested:
  - Royal Canin: `https://www.mypetwarehouse.com.au/royal-canin-british-shorthair-adult-cat-dry-food-4kg-p-21158`
  - Hill's: `https://www.mypetwarehouse.com.au/hills-science-diet-indoor-dry-cat-food-chicken-recipe-adult-4kg-p-27120`
  - Advance: `https://www.mypetwarehouse.com.au/advance-indoor-adult-chicken-and-rice-dry-cat-food-3kg-p-36704`
- Result:
  - tested product pages returned `403`
  - title resolved to `Just a moment...`
  - challenge protection observed
- Affiliate / feed route:
  - affiliate route exists in market references, but no direct product feed was confirmed here
- Recommendation:
  - not suitable for controlled URL ingestion in current state

### Budget Pet Products

- Label: `FEED`
- Route: feed / affiliate preferred
- Robots:
  - `https://www.budgetpetproducts.com.au/robots.txt`
  - fetched `200`
  - tested product paths evaluated as not allowed in this audit pass
- Product URLs tested:
  - Royal Canin: `https://www.budgetpetproducts.com.au/product/royal-canin-feline-indoor-adult-4kg-dry-food/9655`
  - Hill's: `https://www.budgetpetproducts.com.au/product/hills-science-diet-indoor-chicken-recipe-adult-dry-cat-food-4kg/7582`
  - Black Hawk: `https://www.budgetpetproducts.com.au/product/black-hawk-original-chicken-adult-dry-cat-food-4kg/24506`
- Result:
  - tested product pages returned `403`
  - title resolved to `Just a moment...`
  - challenge protection observed
- Affiliate / feed route:
  - affiliate route appears to exist through Commission Factory ecosystem references
- Recommendation:
  - do not pursue direct product-page ingestion now
  - only revisit through feed / partnership route

### VetSupply

- Label: `FEED`
- Route: feed-first, manual-review second
- Robots:
  - `https://www.vetsupply.com.au/robots.txt`
  - robots accessibility was inconsistent between fetch methods
  - tested product paths evaluated as not allowed in this audit pass
- Product URLs tested:
  - Royal Canin: `https://www.vetsupply.com.au/cat-food/royal-canin-indoor-adult-dry-cat-food/pet-foods-4055.aspx`
  - Hill's: `https://www.vetsupply.com.au/cat-food/hills-science-diet-adult-indoor-chicken-dry-cat-food/pet-foods-2292.aspx`
  - Advance: `https://www.vetsupply.com.au/cat-food/advance-indoor-adult-chicken-dry-cat-food/pet-foods-5407.aspx`
- Result:
  - tested product pages returned `200`
  - structured product signals were strong:
    - JSON-LD present
    - app state present
    - price present
    - size present
    - stock present
    - image present
  - compliance picture is weaker than Petstock because robots behavior is inconsistent and affiliate/datafeed route already exists
- Affiliate / feed route:
  - affiliate route exists publicly via Commission Factory references
  - datafeeds are referenced in affiliate listings
- Recommendation:
  - technically parseable, but operationally safer as feed-first source

## 4. Official Brand / Product Master Source Map

These are better for product identity, ingredients, nutrition, and content verification than for live AU price comparison.

### Royal Canin AU

- Label: `CONTENT`
- URL tested:
  - `https://www.royalcanin.com/au/cats/products/retail-products/indoor-27-2529`
- Result:
  - `robots.txt` reachable
  - product page `200`
  - app state present
  - image and product attributes visible
  - suitable for product master / copy verification
  - not suitable as primary live price source

### Hill's AU

- Label: `CONTENT`
- URL tested:
  - `https://www.hillspet.com.au/cat-food/science-diet-mature-adult-indoor-dry`
- Result:
  - `robots.txt` reachable
  - product page `200`
  - JSON-LD present
  - strong product master signals
  - not suitable as primary live price source

### Black Hawk AU

- Label: `CONTENT`
- URL tested:
  - `https://blackhawkpetcare.com/au/products/cat/original-cat-food-chicken/`
- Result:
  - product page `200`
  - no live retail pricing signal in this pass
  - useful for product identity and content verification

### ADVANCE AU

- Label: `CONTENT`
- URL tested:
  - `https://petfood.advancepet.com.au/products/advance™-indoor-adult-chicken`
- Result:
  - `robots.txt` reachable
  - product page `200`
  - Shopify storefront signals present
  - JSON-LD and app state present
  - better treated as product master / content source than retail price source

### Ivory Coat AU

- Label: `CONTENT`
- URL tested:
  - `https://professional.rpfco.com/products/ivory-coat-raw-health-cat-dry-food-indoor-hairball-4kg`
- Result:
  - `robots.txt` reachable
  - product page `200`
  - Shopify storefront signals present
  - useful for product master / brand validation

## 5. Manual URL Ingestion Feasibility

### Feasible now

- Petstock: yes
- Petbarn: yes, but with more manual review than Petstock

### Technically maybe, but compliance / delivery path says no for now

- VetSupply

### Not recommended for direct page ingestion now

- Pet Circle
- PetO / My Pet Warehouse
- Budget Pet Products

## 6. Source Labels Summary

| Source | Label | Why |
|---|---|---|
| Petstock | GREEN | Best combination of robots access, 200 product pages, JSON-LD, app state, price, stock, images |
| Petbarn | YELLOW | Reachable and likely usable, but raw page extraction signals are weaker than Petstock |
| Pet Circle | FEED | Security checkpoint / 429 blocks direct page ingestion |
| PetO / My Pet Warehouse | AVOID | 403 + challenge on product pages |
| Budget Pet Products | FEED | 403 + challenge on product pages, affiliate route exists |
| VetSupply | FEED | Parseable pages, but robots/compliance route is weaker and feed route exists |
| Royal Canin AU | CONTENT | Strong product master source, not live retail price source |
| Hill's AU | CONTENT | Strong product master source, not live retail price source |
| Black Hawk AU | CONTENT | Good brand/content validation source |
| ADVANCE AU | CONTENT | Shopify-based product master source |
| Ivory Coat AU | CONTENT | Product master / content verification source |

## 7. Recommended MVP Coverage Target

Recommended AU cat food MVP target:

### Price comparison sources

- 1 primary `GREEN` source:
  - Petstock
- 1 secondary `YELLOW` source:
  - Petbarn

### Brand scope

Start with 4-6 high-overlap brands:

- Royal Canin
- Hill's Science Diet
- Black Hawk
- ADVANCE
- Ivory Coat
- Ziwi Peak

### Product coverage target

- 30 canonical AU cat food products total
- 15 products with `2+` retailer offers
- 8-10 homepage-quality products with:
  - known source metadata
  - fresh check timestamps
  - at least one in-stock offer
  - at least two retailer offers where possible

### Content / product master support

Use official brand sites as `CONTENT` sources for:

- ingredients
- nutrition panels
- product naming normalization
- formula verification
- life-stage / positioning verification

### Not recommended for MVP

- adding a third direct product-page ingestion source before Petstock + Petbarn overlap is cleaner
- using Pet Circle direct page scraping while checkpoint risk remains
- using challenge-heavy sources as if they were normal controlled URL ingestion sources

## 8. Recommended Next Step

Best next step after this audit:

1. keep Petstock as primary ingestion source
2. keep Petbarn as controlled secondary source
3. use this map to separate:
   - direct ingestion sources
   - feed / affiliate candidates
   - content verification sources
4. do not spend the next sprint building parsers for blocked retailers
5. instead, improve overlap coverage and source cleanliness on current `GREEN + YELLOW` sources first
