# MVP Demo Product Whitelist

Sprint 2.8 defines a controlled demo whitelist for the AU cat food price-comparison MVP. The whitelist is not a new product source and must not be used to hide coverage limitations elsewhere.

## Rules

- Demo products must exist in the canonical cat-food catalog.
- Demo products must have real ingestion offers from Petstock, Petbarn, or another approved real source.
- Fixture-only, orphan, uncertain, or manually quarantined products must not be included.
- Pet Circle fixture rows must not appear in public demo pricing.
- Limited-coverage products may be shown only when clearly labelled as limited coverage.

## Approved Demo Products

| Product slug | Brand | Product name | Pack size | Expected retailers | Expected offer count | Expected coverage | Demo role | Caveats |
| --- | --- | --- | ---: | --- | ---: | --- | --- | --- |
| `royal-canin-indoor-adult-4000g` | Royal Canin | Indoor Adult Dry Cat Food | 4000g | Petstock, Petbarn | 2 | BASIC | primary | None |
| `royal-canin-fit-adult-4000g` | Royal Canin | Fit Adult Dry Cat Food | 4000g | Petstock, Petbarn | 2 | BASIC | primary | None |
| `royal-canin-light-weight-care-adult-3000g` | Royal Canin | Light Weight Care Adult Dry Cat Food | 3000g | Petstock, Petbarn | 2 | BASIC | primary | None |
| `hills-science-diet-indoor-adult-4000g` | Hill's Science Diet | Indoor Adult Dry Cat Food | 4000g | Petstock, Petbarn | 2 | BASIC | primary | None |
| `hills-science-diet-sensitive-stomach-skin-adult-chicken-3170g` | Hill's Science Diet | Sensitive Stomach & Skin Adult Chicken Dry Cat Food | 3170g | Petstock, Petbarn | 2 | BASIC | primary | None |
| `black-hawk-indoor-chicken-rice-2000g` | Black Hawk | Indoor Chicken & Rice | 2000g | Petstock, Petbarn | 2 | BASIC | primary | None |
| `black-hawk-original-chicken-2000g` | Black Hawk | Original Chicken Dry Cat Food | 2000g | Petstock, Petbarn | 2 | BASIC | primary | None |
| `ziwi-peak-air-dried-mackerel-lamb-400g` | Ziwi Peak | Air-Dried Mackerel & Lamb | 400g | Petstock | 1 | LIMITED | limited-coverage | Use only to demonstrate honest limited coverage messaging. |

## Explicitly Excluded

| Product slug | Reason |
| --- | --- |
| `royal-canin-fit-adult-400g` | Known orphan row; keep in quarantine/manual review. |
| `royal-canin-indoor-adult-400g` | Known orphan row; keep in quarantine/manual review. |
| Any fixture-only product | Fixture data must not power the staging/public price experience. |
| Any uncertain canonical match | Do not force matches to improve demo numbers. |

## Validation

Run:

```bash
cd /Users/barryli/Desktop/PetFoodCompare/backend
npm run gate:staging-readiness
```

The gate fails if a whitelist product is missing, orphaned, fixture-only, missing expected real ingestion offers, or below its expected coverage level.
