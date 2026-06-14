# Backend API Contract

This file documents the stabilized API surface currently used by the frontend.

## Product Intelligence

### `GET /api/intelligence/product/:id`

Returns backend-owned product insight data.

Response shape:

```json
{
  "success": true,
  "data": {
    "product_id": "ziwi-peak-mackerel-lamb",
    "quick_verdict": "High-protein food suitable for healthy indoor adult cats.",
    "strengths": ["High Protein", "Strong Source Verification"],
    "considerations": ["Above Average Price"],
    "best_for": ["Indoor Cats", "Active Adult Cats"],
    "avoid_if": ["Fat Restriction Recommended"],
    "confidence": 94,
    "trust_grade": "GOLD"
  }
}
```

### `POST /api/intelligence/context`

Input:

```json
{
  "species": "CAT",
  "age_years": 3,
  "breed": "RAGDOLL",
  "health_conditions": ["GI_SENSITIVE"],
  "vet_prescription_required": false
}
```

Output:

```json
{
  "success": true,
  "data": {
    "constraints": [],
    "recommendations": [],
    "warnings": []
  }
}
```

Design rule:

- This endpoint returns suitability scoring context.
- It does not make medical treatment recommendations.

### `GET /api/intelligence/recovery`

Returns recovery nutrition knowledge topics kept separate from retail product recommendations.

## Compare

### `POST /api/compare`

Accepts either numeric ids or slugs.

Input:

```json
{
  "product_ids": [1, 2]
}
```

or

```json
{
  "product_slugs": ["royal-canin-kitten", "royal-canin-adult-cat"]
}
```

Output:

```json
{
  "success": true,
  "data": {
    "products": [],
    "comparison": {
      "nutritionTable": [],
      "ingredientSets": [],
      "priceComparison": []
    }
  }
}
```

Rules:

- Minimum 2 products
- Maximum 4 products
- Frontend should prefer slugs when selecting products from API-backed lists

### `POST /api/compare/recommend`

Accepts compare product selection plus pet profile context.

Input:

```json
{
  "product_slugs": ["royal-canin-kitten", "royal-canin-adult-cat"],
  "species": "CAT",
  "age_years": 3,
  "breed": "RAGDOLL",
  "health_conditions": ["GI_SENSITIVE"]
}
```

Output:

```json
{
  "success": true,
  "data": {
    "constraints": [],
    "recommendations": [],
    "warnings": [],
    "disclaimer": "..."
  }
}
```

Design rule:

- This endpoint uses the shared rules registry for suitability scoring.
- It does not recommend treatment plans.

## Product List

### `GET /api/products`

List payload now includes frontend comparison metadata:

- `slug`
- `confidence`
- `trust_grade`

### `GET /api/products/search`

Search payload mirrors the list item shape so compare selection can use the same identifiers.

## Error Contract

All stabilized endpoints should return:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "..."
  }
}
```

## Ownership Boundary

Frontend:

- Renders data
- Manages user interaction
- Does not own nutrition interpretation rules

Backend:

- Generates product insights
- Generates suitability scoring
- Owns recovery knowledge payloads
- Owns shared rules logic
