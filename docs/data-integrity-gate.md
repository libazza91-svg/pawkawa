# Data Integrity Gate

Sprint 2.8 adds a read-only staging gate for the AU cat food price-comparison MVP.

The gate answers:

```text
Can Pawkawa be safely demonstrated as an AU cat food price comparison MVP without fixture contamination, misleading price ranking, or unsafe environment configuration?
```

## Command

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run gate:staging-readiness
```

The script is read-only. It does not delete rows, update rows, run ingestion, run cleanup execution, reset Supabase, change schema, or write public API data.

## Required Critical Checks

The gate fails if any of these are true:

- `PRICE_COMPARISON_FIXTURE_FALLBACK=true`
- AU `fixture_offer_count` is not `0`
- Pet Circle fixture rows appear in public AU price results
- Fixture, seed, or demo rows can win best price
- Mixed-source multi-retailer overlap exists
- Real-only multi-retailer product count is below `15`
- A demo whitelist product is missing, orphaned, fixture-only, or lacks real ingestion offers
- Cleanup dry-run selects real Petstock/Petbarn rows for deletion
- Public price API response shape is missing expected fields

## Warning-Only Known Issues

These are accepted warnings for controlled staging and must remain visible:

- `orphan_offer_count = 2`
- `royal-canin-fit-adult-400g`
- `royal-canin-indoor-adult-400g`
- Ziwi has limited coverage
- NZ fixture exists as protected development fixture

## Orphan Row Policy

Known orphan rows are warning-only:

```text
royal-canin-fit-adult-400g
royal-canin-indoor-adult-400g
```

Policy:

- Do not delete.
- Do not canonicalize in Sprint 2.8.
- Do not include in the demo whitelist.
- Do not allow into the controlled demo path.
- Keep visible in audit and gate output.

## Source Hygiene Expectations

For staging/public demo:

- Petstock and Petbarn ingestion rows are treated as real ingestion when `metadata.source` is `petstock_ingestion_pilot_v1` or `petbarn_ingestion_pilot_v1`.
- Pet Circle is currently a feed candidate, not an active real ingestion source.
- Fixture fallback must be off.
- Public price ranking should use real ingestion offers only.
- AU and NZ must not be mixed in the same result or best-price calculation.

## Related Commands

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run report:offer-coverage
npm run cleanup:price-source-hygiene
npm run gate:staging-readiness
```

`cleanup:price-source-hygiene` must be dry-run only during staging readiness checks. Do not run with `-- --execute` unless a later approved cleanup sprint explicitly authorizes it.
