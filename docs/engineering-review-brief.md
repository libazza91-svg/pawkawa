# Engineering Review Brief

## Product Goal

Pawkawa is an Australia-first cat food price comparison product.

The current MVP is centered on one user question:

```text
Where can I buy this exact cat food for the best price in my market?
```

Pet intelligence, nutrition context, suitability scoring, and verified product data remain important secondary layers, but the current review should judge whether the price-first path is stable enough for continued data expansion.

## Current MVP Focus

Primary user flow:

```text
Exact cat food search
-> canonical product match
-> market-specific retailer offers
-> best available price / unit price / stock / promotion comparison
```

Current market scope:

```text
AU cat food only
NZ structurally supported, not actively populated
```

Current retailer ingestion strategy:

```text
Petstock: controlled manual product URL ingestion
Petbarn: controlled manual product URL ingestion
Pet Circle: fixture / feed route candidate, not direct page ingestion
```

## Completed Sprint Status

Completed or stabilized through Sprint 2.6B:

```text
Sprint 1.7: Verified Product API V1
Sprint 1.8: Price Comparison Core
Sprint 1.9: Price-first UX Integration
Sprint 2.0: DB-backed Retail Offers
Sprint 2.0B: Live DB Validation
Sprint 2.0C: Database Baseline Consolidation
Sprint 2.1A/B/C: Petstock ingestion and canonical expansion
Sprint 2.2A/B: Petbarn validation and title vocabulary refinement
Sprint 2.3/2.4/2.5: readiness, coverage audit, source map
Sprint 2.6B: Petstock + Petbarn overlap coverage baseline
```

Sprint 2.6B expanded the controlled Petstock + Petbarn overlap set without adding a third retailer, changing parser logic, changing DB schema, or changing public API response shape.

## Current Data Coverage

Latest reported AU coverage after Sprint 2.6B:

```text
canonical_products_total = 17
products_with_2_or_more_retailers = 17
real Petstock + Petbarn exact overlap = 16
real_ingestion_offer_count = 35
petstock_offer_count = 17
petbarn_offer_count = 18
```

Primary overlap brands currently represented:

```text
Royal Canin
Hill's Science Diet
Black Hawk
Ziwi Peak
```

Known strong overlap examples:

```text
Royal Canin Indoor Adult
Royal Canin Fit Adult
Royal Canin Light Weight Care
Hill's Science Diet Indoor Adult
Hill's Science Diet Sensitive Stomach & Skin
Black Hawk Indoor Chicken
Black Hawk Original Chicken
```

## Known Source Hygiene Risks

Known cleanup items before broad retailer expansion:

```text
2 orphan DB rows exist from earlier validation:
- royal-canin-fit-adult-400g
- royal-canin-indoor-adult-400g

3 Pet Circle fixture offers still exist in the DB and can contaminate real price ranking.

Some coverage reports classify mixed real Petstock/Petbarn sources as mixed source types, so fixture contamination and multi-real-retailer mixing should be separated more clearly.
```

Do not reset Supabase to fix these. Handle them with an explicit source hygiene sprint.

## Next Planned Sprint

Sprint 2.7 should be:

```text
Source Hygiene & Fixture Contamination Cleanup
```

Recommended scope:

```text
Separate fixture/demo/seed/real ingestion source reporting.
Prevent fixture offers from winning production price rankings.
Quarantine or remove orphan retail_offers that are no longer represented in canonical catalog.
Keep fixture fallback available for local development and tests.
Preserve current public API response shape.
```

## Review Focus Areas

External engineering review should focus on:

```text
Architecture boundaries between canonical catalog, DB repository, fixture fallback, and public APIs.
Whether controlled ingestion can scale without parser drift or silent overmatching.
Whether source metadata is strong enough to distinguish real retailer offers from fixture/demo data.
Whether canonical matching thresholds and token rules are conservative enough for formula and pack-size safety.
Whether DB migrations can initialize a fresh environment reproducibly.
Whether price-first APIs remain stable for frontend consumption.
Whether frontend can present price coverage clearly without overclaiming.
```

## Constraints For Review

Do not commit secrets.

Do not modify Supabase credentials or local `.env` files.

Do not run DB reset.

Do not change DB schema or public API shape during review preparation.
