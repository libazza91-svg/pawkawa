# Controlled Demo Script

Status: Sprint 3.2 demo route/page list  
Audience: small external tester or reviewer  
Mode: guided demo, not public launch

## Opening Positioning

Suggested opening:

```text
Pawkawa currently helps Australian cat owners check prices for exact cat food products across tracked retailers. It is focused on Petstock and Petbarn coverage first, with source limits shown honestly.
```

Clarify:

- AU cat food only for current MVP.
- Petstock and Petbarn are the current tracked retailer sources.
- NZ is future scope.
- Product Compare is secondary context.
- Nutrition context is not veterinary advice.

## Public Demo Flow

### 1. Homepage

Route:

```text
/
```

Show:

- price-first hero search
- restrained price-check copy
- tracked price examples
- secondary sections below price workflow

Say:

```text
The main job is to search an exact cat food and see current tracked retailer prices.
```

Do not say:

```text
We cover every retailer.
```

### 2. Search

Route:

```text
/search
```

Show:

- exact product search behavior
- price-first cards
- offer count and coverage labels

Suggested query:

```text
Royal Canin Indoor 4kg
```

### 3. Primary Price Page

Route:

```text
/price/royal-canin-indoor-adult-4000g
```

Show:

- best price found from tracked offers
- Petstock/Petbarn offer table
- conditional price treatment
- last checked / coverage caveats

Check:

- no QA Manual Retailer
- no Pet Circle fixture
- no "guaranteed cheapest" language

### 4. Black Hawk Price Page

Route:

```text
/price/black-hawk-indoor-chicken-rice-2000g
```

Show:

- retailer offer comparison
- conditional pricing caveats
- external retailer links

Mention:

```text
Retailers may show repeat-delivery or member discounts. Pawkawa separates ordinary comparable price from conditional offers.
```

### 5. Limited Coverage Example

Route:

```text
/price/ziwi-peak-air-dried-mackerel-lamb-400g
```

Show:

- limited coverage behavior
- honest disclosure when fewer tracked offers exist

Say:

```text
This is intentionally included to show how the product behaves when coverage is thin.
```

### 6. Product Compare

Route:

```text
/compare
```

Show:

- secondary product context
- comparison is not the main buying-price path

Say:

```text
After checking where to buy, Product Compare can help review nutrition and context side by side.
```

### 7. Learn

Route:

```text
/learn
```

Show:

- source checking explanation
- offer rules
- coverage limits

### 8. About

Route:

```text
/about
```

Show:

- information sources
- comparison method
- confidence and caveat framing

## Admin Demo Flow

Only show admin to stakeholders who need operational context.

### 1. Login

Route:

```text
/admin/login
```

Show:

- admin route requires login
- admin route is not in public nav

### 2. Dashboard

Route:

```text
/admin
```

Show:

- summary counts
- internal operations framing

### 3. Products

Route:

```text
/admin/products
```

Show:

- product master baseline exists
- editing should remain controlled

### 4. Offers

Route:

```text
/admin/offers
```

Show:

- tracked offers
- manual overrides are controlled/audited
- QA overrides are inactive

### 5. Sources

Route:

```text
/admin/sources
```

Show:

- source URL management foundation

### 6. Dictionary

Route:

```text
/admin/dictionary
```

Show:

- matching vocabulary foundation

### 7. Images

Route:

```text
/admin/images
```

Show:

- upload UI exists
- product binding exists
- QA images are disabled
- public image rollout should be reviewed product by product

### 8. Audit

Route:

```text
/admin/audit
```

Show:

- mutation audit trail

## Known Limitations To Say Out Loud

- Current MVP is AU cat food only.
- Only Petstock and Petbarn are current tracked retailers.
- NZ is future scope.
- Pet Circle is not active direct ingestion.
- Manual overrides are controlled and audited.
- Unsafe overrides remain admin-only.
- Uploaded images are supported in admin, but public image rollout needs product-level review.
- Product Compare is secondary.
- Nutrition context is not veterinary advice.

## Demo Close

Suggested close:

```text
The next work should increase product coverage carefully, starting from Petstock/Petbarn overlap and official brand product information, while keeping price claims conservative.
```
