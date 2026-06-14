// ── Data Confidence Layer (Epic C) ──────────────────────────────

export type SourceTypeWeight = 'brand_site' | 'retailer' | 'open_pet_food_facts' | 'manual';

const SOURCE_WEIGHTS: Record<string, number> = {
  brand_site: 0.9,
  open_pet_food_facts: 0.7,
  retailer: 0.5,
  manual: 0.3,
};

const RELEVANT_FIELDS = [
  'name',
  'brand_name',
  'species',
  'life_stage',
  'protein_pct',
  'fat_pct',
  'crude_fiber_pct',
  'moisture_pct',
  'ingredients',
  'unit_price_aud',
] as const;

// ── Calculate confidence score ─────────────────────────────────────
// Formula: source_weight × field_completeness
// field_completeness = count of non-null relevant fields / 10
export function calcConfidenceScore(
  row: Record<string, unknown>,
  sourceType: string,
): number {
  const sourceWeight = SOURCE_WEIGHTS[sourceType] ?? 0.3;

  let filledCount = 0;
  for (const field of RELEVANT_FIELDS) {
    const val = row[field];
    if (val !== undefined && val !== null && val !== '') {
      filledCount++;
    }
  }

  const fieldCompleteness = filledCount / RELEVANT_FIELDS.length;
  const score = Math.round(sourceWeight * fieldCompleteness * 1000) / 1000;
  return score;
}

// ── Calculate verification status ──────────────────────────────────
// UNVERIFIED (0 sources) / SINGLE_SOURCE (1) / MULTI_SOURCE (≥2) / MANUALLY_VERIFIED
export function calcVerificationStatus(
  sourceCount: number,
): 'UNVERIFIED' | 'SINGLE_SOURCE' | 'MULTI_SOURCE' | 'MANUALLY_VERIFIED' {
  if (sourceCount <= 0) return 'UNVERIFIED';
  if (sourceCount === 1) return 'SINGLE_SOURCE';
  return 'MULTI_SOURCE';
}

// ── On re-import: increment source_count, recalculate ──────────────
export function mergeConfidence(
  existingSourceCount: number,
  newSourceType: string,
  existingScore: number,
  newScore: number,
): {
  source_count: number;
  confidence_score: number;
  verification_status: string;
} {
  const newSourceCount = existingSourceCount + 1;
  // Weighted average: favor more recent data slightly
  const mergedScore =
    (existingScore * existingSourceCount + newScore) / newSourceCount;
  const score = Math.round(mergedScore * 1000) / 1000;

  return {
    source_count: newSourceCount,
    confidence_score: score,
    verification_status: calcVerificationStatus(newSourceCount),
  };
}
