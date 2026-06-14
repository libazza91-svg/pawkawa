# Pawkawa Frontend Architecture

This frontend is a Vite + React prototype for Pawkawa, a trusted pet food intelligence platform for Australia and New Zealand.

## Main Locations

- Frontend root: `/Users/barryli/Desktop/PetFoodCompare/frontend`
- HTML shell and page metadata: `/Users/barryli/Desktop/PetFoodCompare/frontend/index.html`
- React entry: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/main.tsx`
- Route handling, pages, reusable components, and fixed pet zone: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/App.tsx`
- Product, brand, verification, nutrition, ingredient, and price mock data: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/data.ts`
- Frontend intelligence API consumer: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/App.tsx`
- Vite API proxy to backend: `/Users/barryli/Desktop/PetFoodCompare/frontend/vite.config.ts`
- Global visual system and responsive layout: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/styles.css`
- Pixel pet image assets: `/Users/barryli/Desktop/PetFoodCompare/frontend/public/pet/`

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
- `LivingCat`: Embedded, low-priority pixel pet detail inside a fixed content box, not a global floating layer.

## Routing Note

The prototype uses a small History API router inside `App.tsx` instead of adding `react-router`. This keeps the V1 simple, but the route boundaries are already explicit enough to migrate to a formal router later.

## UX Principle

The UI uses progressive disclosure: everyday users see simple actions, plain-language verdicts, and the most important nutrition/price/trust signals first. Professional verification details, full tables, source checks, and advanced filters remain available inside expandable `Advanced filters` and `Evidence` sections.

## Backend Intelligence Layer

Sprint 1.4B moved business logic out of React. The frontend now calls backend intelligence APIs and renders only.

- Backend product insight engine: `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence/product-insight-engine.ts`
- Backend recovery knowledge base: `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence/recovery-knowledge-base.ts`
- Backend recommendation context engine: `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence/recommendation-context-engine.ts`
- Backend suitability scoring engine: `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence/suitability-engine.ts`
- Backend shared intelligence types: `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence/types.ts`
- Backend route: `/Users/barryli/Desktop/PetFoodCompare/backend/src/routes/intelligence.ts`

Implemented APIs:

- `GET /api/intelligence/product/:id`
- `POST /api/intelligence/context`
- `GET /api/intelligence/recovery`

The backend returns suitability scoring, constraints, recommendations, and warnings. It does not output medical treatment recommendations.

## Local Commands

```bash
cd /Users/barryli/Desktop/PetFoodCompare/frontend
npm install
npm run dev
npm run build
```

The current in-app browser target is `http://127.0.0.1:4173/`.
