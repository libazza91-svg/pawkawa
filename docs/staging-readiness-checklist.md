# Staging Readiness Checklist

Sprint 2.8 prepares Pawkawa for a controlled staging demo as an AU cat food price-comparison MVP.

## Required Environment

Backend staging must set:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
PRICE_COMPARISON_FIXTURE_FALLBACK=false
NODE_ENV=production
```

Use placeholder examples in documentation only. Never commit real `DATABASE_URL`, database passwords, API keys, affiliate credentials, or `.env` files.

## Forbidden Staging Settings

Do not use:

```env
PRICE_COMPARISON_FIXTURE_FALLBACK=true
```

Do not point staging at another project database. Confirm the Supabase project belongs to Pawkawa before running validation commands.

## Fixture Fallback Policy

- Fixture fallback may be useful for local development only.
- Fixture fallback must be disabled for staging and public demo.
- Fixture, seed, and demo rows must not participate in public best-price ranking.
- Pet Circle fixture rows must not appear as normal tracked retailer offers.

## Supabase Safety

Allowed staging validation commands:

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run report:offer-coverage
npm run cleanup:price-source-hygiene
npm run gate:staging-readiness
```

Forbidden without explicit approval:

```bash
npm run cleanup:price-source-hygiene -- --execute
npm run db:migrate
npm run ingest:petstock-pilot
npm run ingest:petbarn-pilot
```

## Full Validation

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run build
npm test
npx tsc --noEmit
npm run report:offer-coverage
npm run cleanup:price-source-hygiene
npm run gate:staging-readiness

cd ../frontend
npm run build
```

## Smoke Test Checklist

Manually verify these routes:

```text
/
/search
/learn
/about
/compare
/price/royal-canin-indoor-adult-4000g
/price/royal-canin-fit-adult-4000g
/price/black-hawk-indoor-chicken-rice-2000g
/price/hills-science-diet-indoor-adult-4000g
/price/ziwi-peak-air-dried-mackerel-lamb-400g
/product/royal-canin-indoor-adult-4000g
```

Confirm:

- Homepage does not show no-offer cards.
- Price-first copy is clear.
- Pet Circle does not appear as a normal tracked retailer.
- Petstock and Petbarn real offers appear where expected.
- Ziwi shows limited coverage honestly.
- Fixture data does not affect best price.
- Conditional price is not treated as guaranteed best price.
- Orphan 400g rows do not enter the demo path.
- No frontend runtime errors appear.
- External retailer links open the corresponding retailer product page.

## Known Demo Limitations

- MVP scope is AU cat food only.
- NZ remains structurally supported but not part of the controlled demo.
- Pet Circle is not an active real ingestion source.
- Two 400g Royal Canin orphan rows remain in quarantine/manual review.
- Ziwi currently has limited coverage.
- The demo is not a full public launch and should not claim complete market coverage.

## Rollback Notes

If the staging gate fails:

1. Do not add more retailer data to mask the failure.
2. Do not delete orphan rows unless a cleanup sprint explicitly approves it.
3. Review `npm run report:offer-coverage` and `npm run cleanup:price-source-hygiene`.
4. Confirm `PRICE_COMPARISON_FIXTURE_FALLBACK=false`.
5. Fix the source hygiene or API-shape issue before scheduling a demo.
