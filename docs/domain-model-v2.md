# Domain Model V2

Pawkawa's V2 domain model separates product facts from decision outputs.

The core rule is:

```text
Product facts + NeedProfile + Evidence
  -> Decision Model
  -> SuitabilityResult
  -> API response
```

Frontend code renders the result. It does not interpret nutrition or health rules.

## NeedProfile

`NeedProfile` represents what the user needs, not what a product is.

MVP profiles are CAT-only:

- `INDOOR_CAT`
- `SENSITIVE_STOMACH`
- `WEIGHT_CONTROL`
- `SENIOR_SUPPORT`
- `RECOVERY_SUPPORT`
- `KITTEN_GROWTH`
- `EVERYDAY_ADULT`

Shape:

```ts
{
  code: string;
  label: string;
  species: "CAT";
  description: string;
  user_facing_summary: string;
  constraints: NeedConstraint[];
  caution_level: "LOW" | "MEDIUM" | "HIGH";
  requires_vet_disclaimer: boolean;
}
```

`RECOVERY_SUPPORT` always has `requires_vet_disclaimer: true`.

Dog profiles are intentionally out of scope for MVP.

## NeedConstraint

Shape:

```ts
{
  field: string;
  operator: "gte" | "lte" | "eq" | "contains" | "avoid";
  value: string | number | boolean;
  weight: number;
  reason: string;
}
```

Constraints are weighted comparison signals. They are not treatment rules.

## SuitabilityResult

`SuitabilityResult` is the shared output of matching one product against one need profile.

Shape:

```ts
{
  product_id: string;
  product_slug: string;
  need_code: string;
  score: number;
  grade: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  matched_reasons: string[];
  caution_reasons: string[];
  missing_data: string[];
  evidence_refs: EvidenceRef[];
  disclaimer_required: boolean;
}
```

Scoring bands:

- `90-100`: `EXCELLENT`
- `75-89`: `GOOD`
- `55-74`: `FAIR`
- `0-54`: `POOR`

Missing data is not ignored. It appears in `missing_data` and can reduce the score.

## Evidence

Evidence answers: "Why does the system believe this product fact?"

Shape:

```ts
{
  evidence_id: string;
  product_id: string;
  field: string;
  value: string | number | boolean;
  source_type: "OFFICIAL" | "RETAILER" | "OPFF" | "MANUAL";
  source_name: string;
  source_url?: string;
  captured_at?: string;
  confidence_contribution: number;
  conflict_status: "NONE" | "MINOR" | "MAJOR" | "REVIEW_REQUIRED";
}
```

Evidence refs are lightweight pointers used by API responses:

```ts
{
  evidence_id: string;
  field: string;
  source_name: string;
}
```

Sprint 1.6 uses lightweight generated evidence from existing verified product data. Complex evidence snapshot storage is intentionally out of scope.

## Medical Safety Boundary

Allowed language:

- "may be more suitable for sensitive digestion"
- "consider veterinary guidance"
- "not a substitute for veterinary advice"
- "requires vet confirmation"

Forbidden language:

- "treats gastritis"
- "cures stomach issues"
- "helps recover from surgery"
- "recommended for disease"
- "prevents heart disease"

Pawkawa scores suitability. It does not recommend treatment.
