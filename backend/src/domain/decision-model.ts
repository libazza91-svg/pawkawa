import { VerifiedProduct } from '../intelligence/types';
import { Evidence, EvidenceRef, toEvidenceRef } from './evidence';
import { buildNeedProfile, NeedConstraint, NeedProfile, NeedProfileCode } from './need-profile';
import { gradeSuitabilityScore, SuitabilityResult } from './suitability-result';

const MEDICAL_SAFETY_DISCLAIMER = 'This is for food comparison only and is not a substitute for veterinary advice.';

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function readProductField(product: VerifiedProduct, field: string): string | number | boolean | string[] | undefined {
  switch (field) {
    case 'life_stage':
      return product.life_stage;
    case 'market_availability':
      return product.market_availability;
    case 'confidence':
      return product.confidence;
    case 'unit_price_aud_per_kg':
      return product.unit_price_aud_per_kg;
    case 'nutrition.protein':
      return product.nutrition.protein;
    case 'nutrition.fat':
      return product.nutrition.fat;
    case 'nutrition.fiber':
      return product.nutrition.fiber;
    case 'nutrition.calories':
      return product.nutrition.calories;
    case 'suitability_tags':
      return product.suitability_tags;
    case 'controversial_ingredients':
      return product.controversial_ingredients;
    case 'vet_guidance':
      return true;
    default:
      return undefined;
  }
}

function evidenceId(product: VerifiedProduct, field: string, sourceName: string): string {
  return `${product.id}:${field}:${sourceName}`.replace(/[^a-zA-Z0-9:_-]/g, '_');
}

export function buildProductEvidence(product: VerifiedProduct): Evidence[] {
  const sourceType = product.verification_grade === 'GOLD' ? 'OFFICIAL' : 'RETAILER';
  const sourceName = product.verification_grade === 'GOLD' ? 'Verified official and retailer sources' : 'Verified retailer sources';
  const confidence = Math.min(1, Math.max(0.35, product.confidence / 100));
  const fields: Array<[string, string | number | boolean]> = [
    ['confidence', product.confidence],
    ['verification_grade', product.verification_grade],
    ['market_availability', product.market_availability],
    ['nutrition.protein', product.nutrition.protein],
    ['nutrition.fat', product.nutrition.fat],
    ['nutrition.fiber', product.nutrition.fiber],
    ['life_stage', product.life_stage],
    ['unit_price_aud_per_kg', product.unit_price_aud_per_kg],
  ];

  return fields.map(([field, value]) => ({
    evidence_id: evidenceId(product, field, sourceName),
    product_id: product.id,
    field,
    value,
    source_type: sourceType,
    source_name: sourceName,
    captured_at: new Date('2026-06-14T00:00:00.000Z').toISOString(),
    confidence_contribution: confidence,
    conflict_status: product.confidence >= 80 ? 'NONE' : 'REVIEW_REQUIRED',
  }));
}

function findEvidenceRef(evidence: Evidence[], field: string): EvidenceRef[] {
  return evidence.filter((item) => item.field === field || item.field.startsWith(field)).map(toEvidenceRef);
}

function matchesConstraint(product: VerifiedProduct, constraint: NeedConstraint): {
  matched: boolean;
  missing: boolean;
} {
  const actual = readProductField(product, constraint.field);
  if (actual === undefined || actual === null || actual === '') return { matched: false, missing: true };

  switch (constraint.operator) {
    case 'gte':
      return { matched: typeof actual === 'number' && actual >= Number(constraint.value), missing: false };
    case 'lte':
      return { matched: typeof actual === 'number' && actual <= Number(constraint.value), missing: false };
    case 'eq':
      return { matched: actual === constraint.value, missing: false };
    case 'contains':
      return { matched: Array.isArray(actual) && actual.includes(String(constraint.value)), missing: false };
    case 'avoid':
      return {
        matched: Array.isArray(actual) ? actual.length === 0 : actual !== constraint.value,
        missing: false,
      };
    default:
      return { matched: false, missing: true };
  }
}

function buildCautionForConstraint(constraint: NeedConstraint): string {
  if (constraint.operator === 'avoid') return constraint.reason;
  return `Does not fully match: ${constraint.reason}`;
}

export function scoreProductForNeed(
  product: VerifiedProduct,
  needProfile: NeedProfile,
  evidence: Evidence[] = buildProductEvidence(product),
): SuitabilityResult {
  let score = product.confidence;
  const matchedReasons: string[] = [];
  const cautionReasons: string[] = [];
  const missingData: string[] = [];
  const evidenceRefs: EvidenceRef[] = [];

  if (product.species !== needProfile.species) {
    score -= 50;
    cautionReasons.push('Species mismatch for this cat-only need profile.');
  }

  for (const constraint of needProfile.constraints) {
    const result = matchesConstraint(product, constraint);
    evidenceRefs.push(...findEvidenceRef(evidence, constraint.field));

    if (result.missing) {
      score -= Math.min(8, Math.abs(constraint.weight));
      missingData.push(constraint.field);
      continue;
    }

    if (result.matched) {
      score += constraint.weight;
      if (constraint.weight >= 0) matchedReasons.push(constraint.reason);
      continue;
    }

    if (constraint.weight > 0) {
      score -= Math.min(12, constraint.weight);
      cautionReasons.push(buildCautionForConstraint(constraint));
    } else {
      score += constraint.weight;
      cautionReasons.push(constraint.reason);
    }
  }

  if (product.market_availability === 'LIMITED') {
    score -= 3;
    cautionReasons.push('Limited market availability may affect repeat purchase.');
  }

  if (product.confidence < 80) {
    missingData.push('verified_source_depth');
    cautionReasons.push('Product data has limited verification depth.');
  }

  const finalScore = clampScore(score);

  return {
    product_id: product.id,
    product_slug: product.slug,
    need_code: needProfile.code,
    score: finalScore,
    grade: gradeSuitabilityScore(finalScore),
    matched_reasons: unique(matchedReasons),
    caution_reasons: unique(cautionReasons),
    missing_data: unique(missingData),
    evidence_refs: uniqueEvidenceRefs(evidenceRefs),
    disclaimer_required: needProfile.requires_vet_disclaimer,
  };
}

function uniqueEvidenceRefs(refs: EvidenceRef[]): EvidenceRef[] {
  const byId = new Map<string, EvidenceRef>();
  for (const ref of refs) byId.set(ref.evidence_id, ref);
  return Array.from(byId.values());
}

function defaultNeedCodesForProduct(product: VerifiedProduct): NeedProfileCode[] {
  const codes: NeedProfileCode[] = ['EVERYDAY_ADULT'];
  if (product.suitability_tags.includes('Indoor Cat')) codes.push('INDOOR_CAT');
  if (product.suitability_tags.includes('Sensitive Stomach')) codes.push('SENSITIVE_STOMACH');
  if (product.suitability_tags.includes('Weight Control')) codes.push('WEIGHT_CONTROL');
  if (product.suitability_tags.includes('Kitten Growth') || product.life_stage === 'KITTEN') codes.push('KITTEN_GROWTH');
  if (product.life_stage === 'SENIOR') codes.push('SENIOR_SUPPORT');
  return unique(codes) as NeedProfileCode[];
}

function priceBand(product: VerifiedProduct): 'good-value' | 'mid-priced' | 'premium-priced' {
  if (product.unit_price_aud_per_kg <= 25) return 'good-value';
  if (product.unit_price_aud_per_kg <= 80) return 'mid-priced';
  return 'premium-priced';
}

function proteinLabel(product: VerifiedProduct): 'high-protein' | 'balanced-protein' | 'moderate-protein' {
  if (product.nutrition.protein >= 36) return 'high-protein';
  if (product.nutrition.protein >= 30) return 'balanced-protein';
  return 'moderate-protein';
}

function trustLabel(product: VerifiedProduct): 'strongly verified' | 'well verified' | 'partially verified' {
  if (product.confidence >= 90) return 'strongly verified';
  if (product.confidence >= 80) return 'well verified';
  return 'partially verified';
}

export function buildProductDecisionSummary(
  product: VerifiedProduct,
  suitabilityResults: SuitabilityResult[] = defaultNeedCodesForProduct(product).map((code) =>
    scoreProductForNeed(product, buildNeedProfile(code)),
  ),
  evidence: Evidence[] = buildProductEvidence(product),
) {
  const strengths: string[] = [];
  const considerations: string[] = [];
  const bestFor: string[] = [...product.suitability_tags];
  const avoidIf: string[] = ['Veterinary prescription diet required'];
  const band = priceBand(product);

  if (product.nutrition.protein >= 36) strengths.push('High Protein');
  else if (product.nutrition.protein >= 30) strengths.push('Balanced Protein');

  if (product.confidence >= 90) strengths.push('Strong Source Verification');
  else if (product.confidence >= 80) strengths.push('Good Source Verification');
  else considerations.push('Limited Verification Depth');

  if (band === 'good-value') strengths.push('Good Everyday Value');
  if (band === 'premium-priced') considerations.push('Above Average Price');

  if (product.nutrition.fat >= 28) {
    considerations.push('High Fat');
    avoidIf.push('Fat Restriction Recommended');
  }

  if (product.controversial_ingredients.length > 0) {
    considerations.push('Contains Watch-List Ingredients');
    avoidIf.push('Ingredient Sensitivity Suspected');
  }

  if (product.market_availability === 'LIMITED') considerations.push('Limited Availability');
  if (product.life_stage !== 'ALL_LIFE_STAGES') avoidIf.push('Not intended for all life stages');
  if (product.life_stage === 'ADULT' && product.species === 'CAT') bestFor.push('Adult Cats');
  if (product.nutrition.protein >= 36 && product.species === 'CAT') bestFor.push('Active Cats');

  const quick_verdict = `${product.name} is a ${proteinLabel(product)}, ${band} food for cats, with ${trustLabel(product)} product data.`;

  return {
    product_id: product.id,
    quick_verdict,
    strengths: unique(strengths),
    considerations: unique(considerations),
    best_for: unique(bestFor),
    avoid_if: unique(avoidIf),
    confidence: product.confidence,
    trust_grade: product.verification_grade,
    suitability: suitabilityResults,
    evidence_refs: uniqueEvidenceRefs(evidence.map(toEvidenceRef)),
    disclaimer: suitabilityResults.some((result) => result.disclaimer_required) ? MEDICAL_SAFETY_DISCLAIMER : undefined,
  };
}

export { buildNeedProfile };
