# Orphan Public MVP Policy

Status: Sprint 3.0 baseline

## Current Quarantined Rows

- `royal-canin-fit-adult-400g`
- `royal-canin-indoor-adult-400g`

## Current Decision

Keep both rows quarantined before public MVP.

Do not:

- delete them
- canonicalize them
- include them in demo whitelist
- allow them to influence public ranking

## Reasoning

These rows may represent real 400g AU retail SKUs, but they are not yet confirmed as useful public MVP products. They also risk creating low-value single-retailer noise if exposed before a product decision is made.

## Evidence Required Before Canonicalizing

- Confirm the product is a real AU retail SKU.
- Confirm pack size is truly 400g, not a parser or title-normalization issue.
- Confirm whether Petstock has the same exact product and pack size.
- Confirm whether the product is useful for search traffic or demo scenarios.
- Confirm the product can meet source hygiene and coverage expectations.

## Possible Future Outcomes

- Canonicalize later if exact product identity and MVP value are confirmed.
- Delete later if the rows are confirmed parser artifacts or low-value contamination.
- Keep quarantined if evidence remains insufficient.

## Public MVP Recommendation

For public MVP readiness, keep these rows excluded from demo and public ranking until a dedicated orphan review sprint decides their fate.
