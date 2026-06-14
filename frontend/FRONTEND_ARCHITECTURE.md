# Pawkawa Frontend Architecture

This frontend is the current Vite + React review surface for Pawkawa, a trusted pet food intelligence platform for Australia and New Zealand.

## Main Locations

- Frontend root: `/Users/barryli/Desktop/PetFoodCompare/frontend`
- HTML shell and page metadata: `/Users/barryli/Desktop/PetFoodCompare/frontend/index.html`
- React entry: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/main.tsx`
- Route handling, pages, reusable components, and compare integration surface: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/App.tsx`
- Product, brand, verification, nutrition, ingredient, and price prototype fixtures: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/data.ts`
- Frontend intelligence and compare API consumer: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/App.tsx`
- Vite API proxy to backend: `/Users/barryli/Desktop/PetFoodCompare/frontend/vite.config.ts`
- Global visual system and responsive layout: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/styles.css`
- Pixel pet image assets and experiments: `/Users/barryli/Desktop/PetFoodCompare/frontend/public/pet/`

## Implemented Routes

- `/`: Landing page with hero, trust highlights, search entry, featured verified products, and how-it-works.
- `/search`: Product search with keyword, brand, species, life stage, verification grade, and price range filters.
- `/product/[slug]`: Product detail profile with nutrition cards, verification panel, ingredients, prices, nutrition table, suitability tags, and disclaimer.
- `/compare`: Comparison page for 2-4 products with selector, comparison table, difference highlights, ingredient comparison, and rule-based explanation copy.
- `/brand/[slug]`: Brand profile with brand header, product list, and data quality summary.

## Components In App.tsx

- `ProductCard`: Used by landing, search, and brand pages.
- `TrustBadge`: Renders GOLD, SILVER, BRONZE, and UNVERIFIED states.
- `ConfidenceMeter`: Renders confidence score and high / medium / low state.
- `NutritionCard`: Renders single nutrition metrics.
- `PriceCard`: Renders retailer, pack size, price, unit price/kg, and verification status.
- `IngredientTag`: Renders normalized ingredient and warning tags.
- `CompareTable`: Renders horizontal comparison fields.
- `LivingCat`: Prototype pet component kept inside a bounded content zone. This is currently experimental UI, not stable product architecture.

## Routing Note

The prototype uses a small History API router inside `App.tsx` instead of adding `react-router`. This keeps V1 light, but it is now one of the main architectural upgrade candidates as the page count and backend integrations continue to grow.

## UX Principle

The UI uses progressive disclosure: everyday users see simple actions, plain-language verdicts, and the most important nutrition, price, and trust signals first. Technical evidence stays available, but should never dominate the initial reading path.

## Backend Intelligence Layer

Sprint 1.4B moved business logic out of React. The frontend should render backend-owned intelligence outputs and should not recreate nutrition interpretation rules locally.

- Backend product insight engine: `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence/product-insight-engine.ts`
- Backend recovery knowledge base: `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence/recovery-knowledge-base.ts`
- Backend recommendation context engine: `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence/recommendation-context-engine.ts`
- Backend suitability scoring engine: `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence/suitability-engine.ts`
- Backend shared intelligence types: `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence/types.ts`
- Backend route: `/Users/barryli/Desktop/PetFoodCompare/backend/src/routes/intelligence.ts`
- Backend compare route: `/Users/barryli/Desktop/PetFoodCompare/backend/src/routes/compare.ts`

Implemented APIs:

- `GET /api/intelligence/product/:id`
- `POST /api/intelligence/context`
- `GET /api/intelligence/recovery`
- `GET /api/products`
- `GET /api/products/search`
- `POST /api/compare`
- `POST /api/compare/recommend`

The backend returns suitability scoring, constraints, recommendations, and warnings. It does not output medical treatment recommendations.

## Compare Integration

The compare page has been partially stabilized around real backend APIs.

- Product selection should come from backend product lists, not hardcoded mock ids.
- Frontend compare state now prefers `product_slugs`.
- Compare tables and recommendation panels should be rendered from API responses, not recomputed in React.
- Mock fixtures may still exist for UI scaffolding, but they should be treated as fallback display data only.

## Known Architecture Risks

- `App.tsx` is still too large and currently combines routing, page composition, state orchestration, and API consumption.
- Product detail rendering still carries prototype-era assumptions and is a good candidate for extraction into route modules plus dedicated data hooks.
- The pet animation area is still experimental and should remain isolated from core product workflows until the interaction model is genuinely production-ready.
- The current router is acceptable for the prototype, but should be upgraded before the next significant page expansion.

## Local Commands

```bash
cd /Users/barryli/Desktop/PetFoodCompare/frontend
npm install
npm run dev
npm run build
```

The current in-app browser target is `http://127.0.0.1:4173/`.
