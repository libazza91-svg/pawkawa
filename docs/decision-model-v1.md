# Decision Model V1

Sprint 1.6 establishes one active decision path:

```text
NeedProfile
  -> Decision Model
  -> SuitabilityResult
  -> API response
```

## Source Files

- `backend/src/domain/need-profile.ts`
- `backend/src/domain/suitability-result.ts`
- `backend/src/domain/evidence.ts`
- `backend/src/domain/decision-model.ts`
- `backend/src/domain/index.ts`

## Public Functions

```ts
buildNeedProfile(code)
```

Returns one CAT-only MVP need profile.

```ts
scoreProductForNeed(product, needProfile, evidence?)
```

Scores a product against a need profile and returns `SuitabilityResult`.

```ts
buildProductDecisionSummary(product, suitabilityResults?, evidence?)
```

Builds the product insight response surface while preserving existing frontend fields.

## Active API Users

These endpoints use the decision model:

- `GET /api/intelligence/product/:id`
- `POST /api/intelligence/context`
- `POST /api/compare/recommend`

## Compatibility Wrappers

These files may remain, but they should only adapt old callers to the domain model:

- `backend/src/intelligence/product-insight-engine.ts`
- `backend/src/intelligence/recommendation-context-engine.ts`
- `backend/src/rules/context-engine.ts`
- `backend/src/rules/suitability/suitability-engine.ts`

They should not contain independent scoring logic.

## API Additions

`GET /api/intelligence/product/:id` keeps existing fields:

- `quick_verdict`
- `strengths`
- `considerations`
- `best_for`
- `avoid_if`
- `confidence`
- `trust_grade`

It adds:

- `suitability`
- `evidence_refs`

`POST /api/intelligence/context` now supports:

```json
{
  "need_codes": ["SENSITIVE_STOMACH"]
}
```

It returns:

- `need_profiles`
- `constraints`
- `recommendations`
- `warnings`
- `disclaimer_required`

`POST /api/compare/recommend` keeps old recommendation fields and adds each recommendation's shared `suitability_result`.

## Scoring Rules

The model starts from product confidence and applies weighted constraints from the selected `NeedProfile`.

Positive matches add weight.

Unmatched positive constraints reduce score.

Avoid constraints add caution when violated.

Missing fields appear in `missing_data`.

Final score is clamped to `0-100` and mapped to:

- `EXCELLENT`: `90-100`
- `GOOD`: `75-89`
- `FAIR`: `55-74`
- `POOR`: `0-54`

## Safety Boundary

The decision model must never claim disease treatment, cure, prevention, or surgical recovery benefit.

All health-related needs are suitability comparisons only. Recovery support is always vet-first and always requires a disclaimer.
