# Verified Product API V1

Sprint 1.7 stabilizes the backend product contract used by product cards, search results, product detail pages, compare selectors, and need-first browsing.

The goal is a conclusion-first payload. Frontend clients should render the response and should not recreate nutrition interpretation rules.

## Endpoints

### `GET /api/verified-products`

Returns frontend-ready product card/search data.

Supported query params:

- `page`
- `pageSize`
- `species`
- `life_stage`
- `need_code`
- `trust_grade`
- `market_availability`
- `sort=confidence|price_per_kg|suitability_score`

When `need_code` is provided, the service scores each product through the backend Decision Model and includes:

- `suitability_score`
- `suitability_grade`

Example response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "product_id": "black-hawk-indoor-chicken-rice",
        "slug": "black-hawk-indoor-chicken-rice",
        "product_name": "Indoor Chicken & Rice",
        "brand_name": "Black Hawk",
        "species": "CAT",
        "life_stage": "ADULT",
        "market_availability": "ACTIVE",
        "trust_grade": "SILVER",
        "confidence": 84,
        "quick_verdict": "Plain-language backend-generated verdict.",
        "strengths": ["Suitable for indoor cat comparison"],
        "best_for": ["Indoor Cat"],
        "considerations": ["Check individual feeding needs"],
        "price_from": 15.5,
        "unit_price_per_kg": 15.5,
        "primary_image_url": "https://placehold.co/640x800/efe8de/6a604f?text=Black+Hawk",
        "source_count": 3,
        "suitability_score": 82,
        "suitability_grade": "GOOD"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 6
    }
  }
}
```

### `GET /api/verified-products/:slug`

Returns the product detail payload. This response is structured so the frontend can render the conclusion first, then evidence and raw tables second.

Required sections:

- `identity`
- `quick_verdict`
- `strengths`
- `considerations`
- `best_for`
- `avoid_if`
- `suitability_results`
- `nutrition_profile`
- `ingredient_profile`
- `retail_offers`
- `evidence_refs`
- `confidence`
- `trust_grade`
- `market_availability`
- `image_metadata`
- `disclaimer_flags`

Missing products return `404 PRODUCT_NOT_FOUND`.

### `GET /api/verified-products/:slug/compare-ready`

Returns a lightweight compare selector payload.

Fields:

- `product_id`
- `slug`
- `product_name`
- `brand_name`
- `trust_grade`
- `confidence`
- `protein`
- `fat`
- `fiber`
- `calories`
- `price_per_kg`
- `suitability_summary`

## Ownership

Catalog data owner:

`/Users/barryli/Desktop/PetFoodCompare/backend/src/verified-products/catalog.ts`

Service facade:

`/Users/barryli/Desktop/PetFoodCompare/backend/src/verified-products/service.ts`

Route:

`/Users/barryli/Desktop/PetFoodCompare/backend/src/routes/verified-products.ts`

The intelligence layer imports catalog data from `verified-products`; it does not own catalog fixtures.

## Medical Safety

The API may describe suitability for comparison, but it must not imply treatment, cure, diagnosis, disease prevention, or replacement of veterinary advice.

Allowed framing:

- `may be more suitable for sensitive digestion`
- `consider veterinary guidance`
- `not a substitute for veterinary advice`
- `requires vet confirmation`
