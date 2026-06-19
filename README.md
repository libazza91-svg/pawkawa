# Pawkawa

Trusted Pet Food Intelligence for Australia and New Zealand.

This repository contains the current frontend prototype and backend API for verified pet food search, product intelligence, and product comparison.

## Workspace Map

- Frontend app: `/Users/barryli/Desktop/PetFoodCompare/frontend`
- Backend API: `/Users/barryli/Desktop/PetFoodCompare/backend`
- Frontend architecture notes: `/Users/barryli/Desktop/PetFoodCompare/frontend/FRONTEND_ARCHITECTURE.md`
- Backend API contract: `/Users/barryli/Desktop/PetFoodCompare/backend/API_CONTRACT.md`

## Current Sprint

`Sprint 2.8 — MVP Staging Readiness & Data Integrity Gate` is the active implementation sprint.

Focus:

- Controlled staging demo readiness
- Source hygiene and fixture contamination checks
- Demo product whitelist
- Read-only data integrity gate
- Orphan row warning policy
- Public price API response shape stability

Explicitly paused:

- New connectors
- Neo4j
- AI recommendations
- SEO generators
- Affiliate features
- More visual decoration work
- Product discovery expansion
- Frontend redesign
- New connectors and scraping logic
- DB schema changes
- Cleanup execution

## Current Status

Completed in the current branch:

- `backend npm run build` passes
- `backend npx tsc --noEmit` passes
- `backend npm test` passes
- `frontend npm run build` passes
- Product Intelligence Layer is backend-owned
- Frontend consumes backend intelligence APIs through the Vite proxy
- `/api/compare` supports real product selection via `product_ids` or `product_slugs`
- `/api/compare/recommend` uses the shared rules layer
- Local git repository has been initialized for reliable review and diffing
- Sprint 1.6 domain layer is under `/Users/barryli/Desktop/PetFoodCompare/backend/src/domain`
- Sprint 1.7 verified product API is under `/Users/barryli/Desktop/PetFoodCompare/backend/src/verified-products`
- Sprint 1.8/2.0 price comparison core is under `/Users/barryli/Desktop/PetFoodCompare/backend/src/price-comparison`
- `GET /api/verified-products`
- `GET /api/verified-products/:slug`
- `GET /api/verified-products/:slug/compare-ready`
- `GET /api/markets`
- `GET /api/search/products`
- `GET /api/products/:slug/offers`
- `GET /api/price-comparison/:slug/offers`
- `GET /api/price-comparison/:slug`
- Retail offer backfill command: `cd /Users/barryli/Desktop/PetFoodCompare/backend && npm run db:backfill:retail-offers`
- Source hygiene report command: `cd /Users/barryli/Desktop/PetFoodCompare/backend && npm run report:offer-coverage`
- Source hygiene dry-run command: `cd /Users/barryli/Desktop/PetFoodCompare/backend && npm run cleanup:price-source-hygiene`
- Staging readiness gate command: `cd /Users/barryli/Desktop/PetFoodCompare/backend && npm run gate:staging-readiness`

Current runtime note:

- The backend is resilient when PostgreSQL is unavailable.
- `GET /api/products`
- `GET /api/products/search`
- `GET /api/verified-products`
- `GET /api/verified-products/:slug`
- `GET /api/verified-products/:slug/compare-ready`
- `GET /api/markets`
- `GET /api/search/products`
- `GET /api/products/:slug/offers`
- `GET /api/price-comparison/:slug/offers`
- `GET /api/price-comparison/:slug`
- `POST /api/compare`
- `POST /api/compare/recommend`

These routes fall back to the verified fixture catalog so the frontend can keep validating real API flows while database setup is incomplete.

## Local Development

### Backend

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm install
npm run dev
```

Database setup:

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run db:migrate
npm run db:backfill:retail-offers
```

The active schema source of truth is the Drizzle integer schema under `/Users/barryli/Desktop/PetFoodCompare/backend/src/db/schema`. Ordered SQL migrations live under `/Users/barryli/Desktop/PetFoodCompare/backend/src/db/migrations`.

The old UUID-style schema is preserved only as `/Users/barryli/Desktop/PetFoodCompare/backend/schema.legacy-uuid.sql` and must not be used for current migrations.

Do not commit `backend/.env`, `DATABASE_URL`, or Supabase credentials.

Checks:

```bash
npm run build
npx tsc --noEmit
npm test
npm run report:offer-coverage
npm run cleanup:price-source-hygiene
npm run gate:staging-readiness
```

For staging/public demo, `PRICE_COMPARISON_FIXTURE_FALLBACK` must not be `true`. The cleanup command above is a dry-run only; do not run `npm run cleanup:price-source-hygiene -- --execute` unless a later approved cleanup sprint explicitly authorizes it.

### Frontend

```bash
cd /Users/barryli/Desktop/PetFoodCompare/frontend
npm install
npm run dev -- --host 127.0.0.1
```

Check:

```bash
npm run build
```

Default local URLs:

- Frontend: `http://127.0.0.1:4173/`
- Backend: `http://127.0.0.1:3001/`
- Swagger: `http://127.0.0.1:3001/api/docs`

## Architecture Summary

### Frontend

- Vite + React
- Single-app prototype with explicit page boundaries
- UI renders backend-owned intelligence data instead of generating nutrition logic in React

### Backend

- Express + TypeScript
- Drizzle ORM
- PostgreSQL-first data layer
- Shared rules registry under `/Users/barryli/Desktop/PetFoodCompare/backend/src/rules`
- Intelligence services under `/Users/barryli/Desktop/PetFoodCompare/backend/src/intelligence`
- Verified product service facade under `/Users/barryli/Desktop/PetFoodCompare/backend/src/verified-products`
- Price comparison services under `/Users/barryli/Desktop/PetFoodCompare/backend/src/price-comparison`
- Retail offer DB documentation under `/Users/barryli/Desktop/PetFoodCompare/docs/retail-offer-db-v1.md`

### Shared Domain Direction

These capabilities are now expected to reuse the same decision model:

- Product insight generation
- Suitability scoring
- Compare recommendation logic
- Future search/recommendation assistant layers

Decision path:

```text
NeedProfile -> Decision Model -> SuitabilityResult -> API response
```

The MVP need profiles are CAT-only:

- `INDOOR_CAT`
- `SENSITIVE_STOMACH`
- `WEIGHT_CONTROL`
- `SENIOR_SUPPORT`
- `RECOVERY_SUPPORT`
- `KITTEN_GROWTH`
- `EVERYDAY_ADULT`

Medical safety boundary:

- Pawkawa scores food suitability for comparison.
- Pawkawa does not diagnose, treat, cure, prevent disease, or replace veterinary advice.
- Recovery support always requires veterinary guidance.

### Price Comparison Core

The primary MVP journey is now:

```text
Exact product search -> Canonical product match -> Market-specific retailer offers -> Best price / unit price / stock / promotion comparison
```

Market separation is enforced at offer level:

- AU offers use `market=AU` and `currency=AUD`
- NZ offers use `market=NZ` and `currency=NZD`
- AU and NZ offers are never mixed in the same lowest-price calculation
- User-selected market should override any future IP-based default

Effective price is conservative:

```text
effective_price = min(base_price, valid unconditional sale_price)
```

Member, coupon, minimum-spend, and other conditional discounts are exposed separately and are not silently used as the best price.

## Git Workflow

Local branches currently prepared:

- `main`
- `develop`
- `feature/stabilization-sprint`

Recommended branch naming:

- `feature/<scope>`
- `fix/<scope>`
- `docs/<scope>`

GitHub publishing should use a dedicated standalone repository under the user's account and must not be mixed with unrelated projects.

## What Reviewers Should Inspect First

- Backend rules registry: `/Users/barryli/Desktop/PetFoodCompare/backend/src/rules`
- Backend compare routes: `/Users/barryli/Desktop/PetFoodCompare/backend/src/routes/compare.ts`
- Backend intelligence routes: `/Users/barryli/Desktop/PetFoodCompare/backend/src/routes/intelligence.ts`
- Frontend integration surface: `/Users/barryli/Desktop/PetFoodCompare/frontend/src/App.tsx`
- Verified product API V1 docs: `/Users/barryli/Desktop/PetFoodCompare/docs/verified-product-api-v1.md`
- Price comparison core docs: `/Users/barryli/Desktop/PetFoodCompare/docs/price-comparison-core-v1.md`
- Database baseline docs: `/Users/barryli/Desktop/PetFoodCompare/docs/database-baseline-v1.md`
- Market region model docs: `/Users/barryli/Desktop/PetFoodCompare/docs/market-region-model.md`
- Canonical matching docs: `/Users/barryli/Desktop/PetFoodCompare/docs/canonical-product-matching-v1.md`
- Frontend architecture notes: `/Users/barryli/Desktop/PetFoodCompare/frontend/FRONTEND_ARCHITECTURE.md`

## Remaining Risks

- Product detail pages in the frontend still contain prototype-era coupling and should continue migrating toward real backend product detail payloads.
- Database-backed compare is stable, but the local environment is still running on API fallback mode until PostgreSQL is available.
- The frontend route system is intentionally lightweight for V1, but should move to a formal router before large-scale page growth.
