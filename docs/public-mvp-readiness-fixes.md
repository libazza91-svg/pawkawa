# Sprint 3.0 Public MVP Readiness Fixes

Status: implementation baseline

## Objective

Tighten the product experience so Pawkawa reads as an AU cat food price-comparison MVP, not a nutrition recommendation site or unfinished database.

## Implemented Direction

- Homepage copy emphasizes tracked retailer prices.
- Search page prioritizes tracked offers, unit price, stock and coverage.
- Product Compare is positioned as a secondary context tool.
- Learn explains how tracked price checks work.
- About explains source scope, retailer status, source hygiene and coverage limitations.
- Public copy avoids whole-market claims such as cheapest in Australia.

## Public MVP Boundary

Pawkawa may be prepared for a limited public MVP only after staging gates, source hygiene checks and demo whitelist QA remain stable.

This sprint does not approve public launch by itself.

## Remaining Public MVP Blockers

- Orphan 400g rows remain quarantined and need a separate decision.
- Current retailer coverage is still Petstock + Petbarn only.
- Product image and brand asset quality is not yet production-complete.
- Learn and About content should continue to be expanded from cross-checked sources before broad marketing.

## Verification Checklist

- Backend build passes.
- Backend tests pass.
- Backend TypeScript no-emit passes.
- Offer coverage report remains clean.
- Source hygiene cleanup remains dry-run only.
- Staging readiness gate has no failures.
- Frontend build passes.

## Next Recommended Sprint

Sprint 3.1 should focus on public demo polish and remaining trust blockers, not new retailer expansion.
