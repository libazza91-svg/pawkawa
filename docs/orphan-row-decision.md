# Sprint 2.9 Orphan Row Decision

The following rows remain quarantine/manual-review only:

```text
royal-canin-fit-adult-400g
royal-canin-indoor-adult-400g
```

No deletion or canonicalization was performed in Sprint 2.9.

## Evidence Summary

| Orphan slug | Retailer | URL | Pack size | Stock | Price | Evidence |
| --- | --- | --- | ---: | --- | ---: | --- |
| `royal-canin-fit-adult-400g` | Petbarn | `https://www.petbarn.com.au/p/royal-canin-feline-in-out-fit-cat-food/30340` | 400g | IN_STOCK | AUD 14.49 | URL returned HTTP 200 with JSON-LD and product-like signals. DB metadata source is `petbarn_ingestion_pilot_v1` with match confidence 1. |
| `royal-canin-indoor-adult-400g` | Petbarn | `https://www.petbarn.com.au/p/royal-canin-feline-indoor-cat-food/29788` | 400g | IN_STOCK | AUD 14.49 | URL returned HTTP 200 with JSON-LD and product-like signals. DB metadata source is `petbarn_ingestion_pilot_v1` with match confidence 1. |

## Decision Questions

| Question | Current answer |
| --- | --- |
| Does this appear to be a real AU retail SKU? | Yes, both Petbarn URLs returned HTTP 200 and the stored offer rows are 400g, in stock, real ingestion rows. |
| Does the Petbarn page still appear valid? | Yes, both current Petbarn URLs returned HTTP 200 during QA. |
| Does Petstock have the same 400g pack in current project evidence? | No project evidence found for matching Petstock 400g offers. Current Petstock overlap is focused on larger packs. |
| Is pack size clearly 400g, not parser error? | Likely real 400g variants. Stored `pack_size_g` is 400 and URLs are variant-specific Petbarn product URLs. |
| Is it useful for MVP demo/search traffic? | Low. The MVP demo is stronger with 2-retailer products and these rows would create single-retailer noise. |
| Does it create low-value single-retailer noise? | Yes. Canonicalizing now would add products below the current controlled-demo standard. |

## Recommendation

```text
keep quarantined
```

Rationale:

- Evidence suggests the 400g rows are likely real Petbarn SKUs.
- There is not enough project evidence that matching Petstock 400g offers exist.
- Adding them to canonical catalog now would reduce demo clarity and increase single-retailer noise.
- Deleting them would be premature because they may become useful if a 400g canonical strategy is approved later.

## Next Decision Point

Before changing their status, a future sprint should decide whether Pawkawa wants canonical products for small trial packs such as 400g. If yes, run a controlled 400g pack-size review across Petstock and Petbarn. If no, remove or exclude small-pack orphan offers under an approved cleanup policy.
