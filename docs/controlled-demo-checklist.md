# Controlled External Demo Checklist

Status: Sprint 3.2 docs-only preparation  
Scope: controlled AU cat food price-comparison demo only

## Demo Decision

Pawkawa is ready for a controlled external demo with limits. It is not ready to be presented as a public full-market MVP.

The demo should position Pawkawa as:

```text
AU-first cat food price checks from currently tracked retailers.
```

Do not claim:

- cheapest in Australia
- guaranteed lowest price
- complete market coverage
- veterinary recommendation
- full AU/NZ coverage

## Pre-Demo Checks

### Public App

- Confirm public navigation does not expose `/admin`.
- Confirm primary public path is Find Prices / price pages.
- Confirm Product Compare is framed as secondary context.
- Confirm Learn/About explain source limits and non-medical positioning.
- Confirm no visible fixture/QA retailer appears in public price pages.

### Admin Console

- Confirm `/admin/login` is the only discoverable admin entry point.
- Confirm admin pages require authenticated session.
- Confirm `/admin/images` loads product options.
- Confirm QA uploaded images are disabled or clearly internal.
- Confirm QA manual overrides are inactive.
- Confirm unsafe manual overrides remain admin-only and inactive.

### Storage

- Current Supabase Storage upload/delete smoke check passed against `product-images`.
- Service role key is stored only in ignored local `backend/.env`.
- Service role key was not committed.
- Key rotation is not being performed in this sprint by owner decision. Revisit rotation before broader external access or handoff.

## Controlled Public Demo Pages

Show these pages in order:

1. `/`
2. `/search`
3. `/price/royal-canin-indoor-adult-4000g`
4. `/price/black-hawk-indoor-chicken-rice-2000g`
5. `/price/ziwi-peak-air-dried-mackerel-lamb-400g`
6. `/compare`
7. `/learn`
8. `/about`

## Controlled Admin Demo Pages

Show only after explaining that this is an internal operations console:

1. `/admin/login`
2. `/admin`
3. `/admin/products`
4. `/admin/offers`
5. `/admin/sources`
6. `/admin/dictionary`
7. `/admin/images`
8. `/admin/audit`

## Data Safety Checks

Current staging state checked during Sprint 3.2 prep:

- `qa-safe-manual`: inactive and not eligible for ordinary best price.
- `qa-unsafe-manual`: inactive and not eligible for ordinary best price.
- QA uploaded product images: disabled and not primary.
- Public checked price pages did not include QA Manual Retailer.
- Active manual overrides: `0`.
- Active product images: `0`.

## Demo Script Notes

Use restrained language:

- "tracked retailers"
- "best price found from current tracked offers"
- "limited coverage"
- "not veterinary advice"

Avoid:

- "whole market"
- "all retailers"
- "guaranteed cheapest"
- "recommended for disease"
- "treats" or "cures"

## Stop Conditions

Pause the demo if:

- a QA retailer appears publicly
- an inactive QA image appears as a public primary image
- a price page shows fixture/demo wording as a normal retailer
- admin route appears in public navigation
- external links route to an unrelated product or bundle page without warning
