# Pawkawa Frontend Architecture

This frontend is the current Vite + React review surface for Pawkawa, a trusted pet food intelligence platform for Australia and New Zealand.

## Main Locations

- Frontend root: `/Users/barryli/Desktop/PetFoodCompare/frontend`
- HTML shell and page metadata: `/Users/barryli/Desktop/PetFoodCompare/frontend/index.html`
- React entry: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/main.tsx`
- Route handling, pages, reusable components, and compare integration surface: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/App.tsx`
- Product, brand, verification, nutrition, ingredient, and price prototype fixtures: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/data.ts`
- Frontend verified product, intelligence, and compare API consumer: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/App.tsx`
- Vite API proxy to backend: `/Users/barryli/Desktop/PetFoodCompare/frontend/vite.config.ts`
- Global visual system and responsive layout: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/styles.css`
- Pixel pet image assets and experiments: `/Users/barryli/Desktop/PetFoodCompare/frontend/public/pet/`

## Implemented Routes

- `/`: Landing page with hero, trust highlights, search entry, featured verified products, and how-it-works.
- `/search`: Product search with keyword, brand, species, life stage, verification grade, and price range filters.
- `/price/[slug]`: Price-first product comparison page with best price, retailer offers, conditional price notes, stock status, and secondary nutrition/suitability context.
- `/product/[slug]`: Product detail profile with nutrition cards, verification panel, ingredients, prices, nutrition table, suitability tags, and disclaimer.
- `/compare`: Comparison page for 2-4 products with selector, comparison table, difference highlights, ingredient comparison, and rule-based explanation copy.
- `/brand/[slug]`: Brand profile with brand header, product list, and data quality summary.
- `/learn`: Editorial knowledge surface for explaining price-check behavior, content standards, and future education principles.
- `/about`: Trust and methodology page for information sources, comparison rules, and confidence testing principles.

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

- `GET /api/verified-products`
- `GET /api/verified-products/:slug`
- `GET /api/verified-products/:slug/compare-ready`
- `GET /api/intelligence/product/:id`
- `POST /api/intelligence/context`
- `GET /api/intelligence/recovery`
- `GET /api/products`
- `GET /api/products/search`
- `POST /api/compare`
- `POST /api/compare/recommend`

The backend returns suitability scoring, constraints, recommendations, and warnings. It does not output medical treatment recommendations.

## Verified Product API V1

Sprint 1.7 adds a stable product data outlet for frontend cards, search results, product detail pages, compare selectors, and need-first browsing.

- Product list and detail rendering should prefer `/api/verified-products`.
- The frontend keeps `data.ts` fixtures only as fallback display data and compatibility scaffolding.
- Product cards should render `quick_verdict`, `strengths`, `best_for`, `considerations`, `confidence`, `trust_grade`, pricing, and image metadata from backend responses.
- Product detail pages should use backend sections for verdict, suitability, nutrition, ingredients, retail offers, evidence refs, image metadata, and disclaimer flags.
- The frontend must not duplicate product insight or suitability scoring rules.

Contract docs:

`/Users/barryli/Desktop/PetFoodCompare/docs/verified-product-api-v1.md`

## Price-First UX

Sprint 1.9 makes price comparison visible in the frontend without a full redesign.

- Homepage search now prioritizes exact cat food price search.
- Search results prefer `/api/search/products?q=&market=AU`.
- Price result cards navigate to `/price/[slug]`.
- `/price/[slug]` consumes `/api/price-comparison/:slug?market=AU`.
- Market selection uses `/api/markets`; AU is enabled and NZ is shown as coming soon when disabled.
- Conditional member/coupon prices are shown separately from `effective_price`.
- Nutrition, ingredients, suitability, and evidence remain available below the retailer offer table.

Sprint 1.9B clarifies the first impression:

- Homepage headline should communicate cat food price comparison, not general pet intelligence.
- Navigation labels use `Find Prices` and `Compare Foods` to separate retailer price comparison from food-to-food comparison.
- Price result cards prioritize product image/fallback, best available price, unit price, best retailer, offer count, and market/currency.
- Retail offer rows show a simpler first layer: retailer, best available price, unit price, stock, deal notes, and buy action.
- Member and coupon prices remain conditional and are not styled as guaranteed best prices.

Sprint 2.3 improves price comparison MVP readiness without changing the API contract:

- Search result cards now prioritize from-price, best retailer, tracked retailer count, market, and coverage label.
- `/price/[slug]` now explains `Best price found from tracked retailers` instead of using absolute lowest-price language.
- Coverage status is derived in the frontend from tracked retailer count:
  - `0`: `No tracked offers yet`
  - `1`: `Limited coverage`
  - `2`: `Basic coverage`
  - `3+`: `Good coverage`
- Human-readable last checked text is derived from `offers[].last_checked_at` when possible.
- Low-data states are shown explicitly for no-offer and single-retailer products.
- Trust wording stays restrained: price pages should explain that prices are based on currently tracked retailers and conditional deals are shown separately.
- Homepage no longer mixes retailer result cards directly into the hero search block; price matches are shown in a separate section below the hero.
- Homepage no longer uses nutrition/product-context cards as the main continuation path; instead it points users toward Compare Foods, Learn, and About.

## Future I18n Plan

Do not hardcode bilingual UI in the current sprint. Future localization should add a small locale layer before translating screens.

Suggested locale state:

```ts
type Locale = 'en-AU' | 'zh-CN';
```

Suggested dictionary shape:

```ts
const translations = {
  'en-AU': {
    priceSearchHeadline: 'Compare Cat Food Prices in Australia'
  },
  'zh-CN': {
    priceSearchHeadline: '比较澳洲猫粮价格'
  }
};
```

Priority translation areas:

- Homepage search
- Price result cards
- Retail offer table
- Stock status labels
- Conditional price labels
- Market selector
- Disclaimer text

Formatting should use `Intl.NumberFormat` for currency and `Intl.DateTimeFormat` for dates so AU English and Chinese UI can share the same data safely.

## Compare Integration

The compare page has been partially stabilized around real backend APIs.

- Product selection should come from backend product lists, not hardcoded mock ids.
- The compare selector now prefers `/api/verified-products` list data.
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
