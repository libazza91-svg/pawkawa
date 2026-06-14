# Pawkawa

Trusted Pet Food Intelligence for Australia and New Zealand.

This repository contains the current frontend prototype and backend API for verified pet food search, product intelligence, and product comparison.

## Workspace Map

- Frontend app: `/Users/barryli/Desktop/PetFoodCompare/frontend`
- Backend API: `/Users/barryli/Desktop/PetFoodCompare/backend`
- Frontend architecture notes: `/Users/barryli/Desktop/PetFoodCompare/frontend/FRONTEND_ARCHITECTURE.md`
- Backend API contract: `/Users/barryli/Desktop/PetFoodCompare/backend/API_CONTRACT.md`

## Current Sprint

`Stabilization Sprint` is the active release-readiness sprint.

Focus:

- Backend build stability
- Unified frontend/backend API contract
- Shared rules registry as the single rule source
- Real compare flow through backend APIs
- Documentation and repo hygiene for team review

Explicitly paused:

- New connectors
- Neo4j
- AI recommendations
- SEO generators
- Affiliate features
- More visual decoration work

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

Current runtime note:

- The backend is resilient when PostgreSQL is unavailable.
- `GET /api/products`
- `GET /api/products/search`
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

Checks:

```bash
npm run build
npx tsc --noEmit
npm test
```

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

### Shared Domain Direction

These capabilities are now expected to reuse the same rules source:

- Product insight generation
- Suitability scoring
- Compare recommendation logic
- Future search/recommendation assistant layers

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
- Frontend architecture notes: `/Users/barryli/Desktop/PetFoodCompare/frontend/FRONTEND_ARCHITECTURE.md`

## Remaining Risks

- Product detail pages in the frontend still contain prototype-era coupling and should continue migrating toward real backend product detail payloads.
- Database-backed compare is stable, but the local environment is still running on API fallback mode until PostgreSQL is available.
- The frontend route system is intentionally lightweight for V1, but should move to a formal router before large-scale page growth.
