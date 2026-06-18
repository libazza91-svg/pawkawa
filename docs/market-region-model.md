# Market Region Model

Pawkawa must keep Australian and New Zealand offers separated at the data and API layers.

## Principle

AU and NZ are not frontend-only filters.

Every `RetailOffer` and `PriceSnapshot` must include:

- `market: "AU" | "NZ"`
- `currency: "AUD" | "NZD"`

Lowest-price calculations must filter by market and currency before sorting.

## Current Configuration

```json
{
  "default_market": "AU",
  "markets": [
    {
      "market": "AU",
      "currency": "AUD",
      "enabled": true
    },
    {
      "market": "NZ",
      "currency": "NZD",
      "enabled": false,
      "status": "PENDING"
    }
  ]
}
```

## User Location

Future UX may use IP country as a soft default, but it must not be mandatory.

Rules:

- User-selected market has priority over IP detection.
- If the user declines or blocks location/IP-based personalization, default to `AU` or the last manually selected market.
- The market selector should be visible enough for NZ users to switch manually.

## Separation Rules

- AU users should not see NZ offers in default results.
- NZ users should not see AU offers in default results.
- AUD and NZD must not be compared in one best-price calculation.
- Market-specific product pages can use `?market=AU` or `?market=NZ`.
- Retailer availability and promotion rules are market-specific.

## Future NZ Work

Sprint 1.8 structurally supports NZ but does not add NZ connectors or scraping.

Future work should add:

- NZ retailer index
- NZ retailer discovery connectors
- NZD-specific promotion handling
- NZ shipping thresholds
- NZ default product availability
