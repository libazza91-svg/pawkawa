# Sprint 2.9 Controlled Staging Demo Report

Status: controlled external demo is acceptable with limits. This is not public MVP readiness.

## Demo Decision

```text
YES WITH LIMITS
```

Pawkawa can be shown to a small external tester as an AU cat food price-comparison MVP if the demo stays on the approved whitelist and is framed as limited retailer coverage. The site should not be described as a complete market-wide price comparison product yet.

## Route Smoke Test

| Route | Result | Notes |
| --- | --- | --- |
| `/` | Demo-ready with minor caveats | Price-first headline is clear. Homepage does not show no-offer cards. Copy should avoid sounding broader than tracked retailers. |
| `/search` | Demo-ready with minor caveats | Search page is price-first and shows retailer price cards. Advanced filters and placeholder mascot slot still make the page feel partly prototype-like. |
| `/learn` | Needs fix before public MVP | Useful positioning, but content is still placeholder-like and should be source-backed before public launch. Safe for controlled demo if presented as work-in-progress. |
| `/about` | Demo-ready with caveats | Trust method is visible. Needs deeper methodology and source policy before public MVP. |
| `/compare` | Should not be primary demo route | Still feels nutrition/recommendation-led compared with the price-first MVP. Do not lead external testers here. |
| `/price/royal-canin-indoor-adult-4000g` | Demo-ready | Shows Petstock + Petbarn, best price, unit price, stock, conditional member price, and Visit links. |
| `/price/royal-canin-fit-adult-4000g` | Demo-ready | Shows Petstock + Petbarn and clear price comparison. |
| `/price/royal-canin-light-weight-care-adult-3000g` | Demo-ready | Shows Petstock + Petbarn and clear price comparison. |
| `/price/hills-science-diet-indoor-adult-4000g` | Demo-ready | Shows Petstock + Petbarn and clear price comparison. |
| `/price/hills-science-diet-sensitive-stomach-skin-adult-chicken-3170g` | Demo-ready | Shows Petstock + Petbarn and clear price comparison. |
| `/price/black-hawk-indoor-chicken-rice-2000g` | Demo-ready | Shows Petstock + Petbarn and clear price comparison. |
| `/price/black-hawk-original-chicken-2000g` | Demo-ready | Shows Petstock + Petbarn and clear price comparison after normal data loading. |
| `/price/ziwi-peak-air-dried-mackerel-lamb-400g` | Demo-ready only as limited coverage example | Shows one retailer and limited coverage honestly. Do not use as a primary price-comparison example. |
| `/price/not-a-real-demo-product` | Demo-safe fallback | Shows "Price comparison not found" and a Back to Search path. |

No frontend console errors were observed during the route smoke check.

## Whitelist Product QA

| Product | Brand | Pack | Retailers | Best price | Unit price | Coverage | Last checked | Stock / conditional handling | Demo suitability |
| --- | --- | ---: | --- | ---: | ---: | --- | --- | --- | --- |
| `royal-canin-indoor-adult-4000g` | Royal Canin | 4kg | Petstock, Petbarn | AUD 63.00 at Petstock | AUD 15.75/kg | BASIC | 2026-06-18 | Both in stock. Petbarn member price shown as conditional. | Primary demo-ready |
| `royal-canin-fit-adult-4000g` | Royal Canin | 4kg | Petstock, Petbarn | AUD 70.00 at Petstock | AUD 17.50/kg | BASIC | 2026-06-18 | Both in stock. Petbarn member price shown as conditional. | Primary demo-ready |
| `royal-canin-light-weight-care-adult-3000g` | Royal Canin | 3kg | Petstock, Petbarn | AUD 65.00 at Petstock | AUD 21.67/kg | BASIC | 2026-06-18 | Both in stock. Petbarn member price shown as conditional. | Primary demo-ready |
| `hills-science-diet-indoor-adult-4000g` | Hill's Science Diet | 4kg | Petstock, Petbarn | AUD 72.00 at Petstock | AUD 18.00/kg | BASIC | 2026-06-18 | Both in stock. Petbarn member price shown as conditional. | Primary demo-ready |
| `hills-science-diet-sensitive-stomach-skin-adult-chicken-3170g` | Hill's Science Diet | 3.17kg | Petstock, Petbarn | AUD 69.00 at Petstock | AUD 21.77/kg | BASIC | 2026-06-18 | Both in stock. Petbarn member price shown as conditional. | Primary demo-ready |
| `black-hawk-indoor-chicken-rice-2000g` | Black Hawk | 2kg | Petbarn, Petstock | AUD 42.98 at Petstock | AUD 21.49/kg | BASIC | 2026-06-18 | Both in stock. Petbarn member price shown as conditional. | Primary demo-ready |
| `black-hawk-original-chicken-2000g` | Black Hawk | 2kg | Petbarn, Petstock | AUD 42.98 at Petstock | AUD 21.49/kg | BASIC | 2026-06-18 | Both in stock. Petbarn member price shown as conditional. | Primary demo-ready |
| `ziwi-peak-air-dried-mackerel-lamb-400g` | Ziwi Peak | 400g | Petstock | AUD 51.69 at Petstock | AUD 129.23/kg | LIMITED | 2026-06-16 | In stock. One retailer only. | Limited-coverage demo only |

## Retailer Outbound Link Result

All approved whitelist outbound retailer URLs returned HTTP 200 during QA. Petstock pages showed JSON-LD and price/product signals in the page HTML. Petbarn pages returned HTTP 200 and JSON-LD, but price/product signals were less obvious in the first HTML segment, so Petbarn parsing/link monitoring should remain part of operational QA.

The UI Visit links matched the API URLs for the checked product pages.

## Pricing And Coverage Correctness

- Pet Circle did not appear as a normal tracked retailer.
- Fixture rows did not affect best price.
- Petstock and Petbarn appeared where expected for the primary demo products.
- Ziwi correctly showed limited coverage and should not be positioned as a primary comparison example.
- Conditional member prices were displayed separately and not treated as guaranteed best price.
- Unknown slug behavior is safe and does not crash the page.

## Demo Guidance

Recommended demo path:

1. Start at `/`.
2. Search for "Royal Canin Indoor".
3. Open `/price/royal-canin-indoor-adult-4000g`.
4. Show Petstock/Petbarn retailer offer table.
5. Show one Black Hawk page as a second strong example.
6. Optionally show Ziwi only to explain honest limited coverage.

Avoid leading the demo with `/compare`, orphan 400g rows, or broad claims about all Australian retailers.
