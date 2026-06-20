# Sprint 2.9 Staging Demo Issue List

## Blocking Before External Demo

No hard blocker was found for a small controlled external demo if the demo follows the approved whitelist and is introduced as limited retailer coverage.

Operational constraints before demo:

- Use `PRICE_COMPARISON_FIXTURE_FALLBACK=false`.
- Do not show orphan 400g rows.
- Do not claim complete Australian market coverage.
- Keep demo focused on `/`, `/search`, and approved `/price/:slug` pages.
- Do not use `/compare` as the primary demo path.

## Fix Before Public MVP

| Area | Issue | Why it matters |
| --- | --- | --- |
| Learn content | `/learn` is directionally useful but still reads like a placeholder knowledge layer. | Public trust requires source-backed, cross-checked educational content. |
| About methodology | `/about` explains sources and confidence at a high level but needs more concrete methodology. | Users need to understand why Pawkawa is trustworthy. |
| Compare route | `/compare` still feels nutrition/recommendation-led, not price-first. | It may confuse the MVP message if users expect retailer price comparison. |
| Search UX | Search page still has advanced filters and mascot/prototype copy that can distract from exact price search. | First-time users should immediately understand exact product price comparison. |
| Petbarn monitoring | Petbarn outbound pages return 200/JSON-LD, but price signals are not always obvious in shallow HTML checks. | Ingestion reliability should be monitored before public launch. |
| Orphan policy | Two 400g Royal Canin rows remain quarantined. | Public MVP should not rely on unresolved orphan state. |
| Coverage language | Product should consistently say "tracked retailers" instead of implying market-wide price coverage. | Reduces overclaim and legal/product trust risk. |

## Can Defer

| Area | Deferred item | Reason |
| --- | --- | --- |
| Third retailer | Add another retailer only after demo route and source hygiene remain stable. | More data before stability risks confusion. |
| 400g canonical strategy | Decide later whether small trial packs should become canonical products. | Not needed for controlled demo. |
| NZ data | Keep NZ disabled/coming soon. | AU cat food MVP remains the active scope. |
| Affiliate/feed integration | Defer until price data quality and outbound links are stable. | Avoid commercial layer before trust layer. |
| Full Learn content library | Build after source policy and citation workflow are decided. | Avoid copying or weak nutrition claims. |
| Frontend redesign | Defer broad redesign; only targeted clarity fixes should happen before public MVP. | Current route is demo-capable with limits. |

## Controlled Demo Recommendation

```text
YES WITH LIMITS
```

Use only the primary whitelist products for the main demo. Use Ziwi only to demonstrate limited coverage honesty. Keep orphan rows quarantined.
