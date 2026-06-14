import { PetProfileInput, VerifiedProduct } from '../../intelligence/types';
import { SuitabilityScoreV1, ProductIntelligenceV1 } from '../types';
import { suitabilityScoringRules } from './scoring-rules';
import { nutritionRules } from '../nutrition/protein-fat-fiber';

/**
 * Suitability Engine V1 — Unified scoring pipeline
 * 
 * Pipeline: Pet Profile → Constraint Resolution → Product Scoring → Reason Generation
 * 
 * Scoring Logic (rule-driven, no AI):
 * - Base score = product.confidence
 * - Strength bonuses: high protein, strong verification, tag alignment, good price
 * - Risk penalties: high fat, controversial ingredients, premium price, limited availability, life-stage mismatch
 * - Every strength/risk string embeds a human-readable reason
 */

function getPriceBand(product: VerifiedProduct): 'value' | 'mid' | 'premium' {
  if (product.unit_price_aud_per_kg <= 25) return 'value';
  if (product.unit_price_aud_per_kg <= 80) return 'mid';
  return 'premium';
}

function getLifeStageLabel(lifeStage: string): string {
  switch (lifeStage) {
    case 'KITTEN': return 'kitten';
    case 'PUPPY': return 'puppy';
    case 'ADULT': return 'adult';
    case 'SENIOR': return 'senior';
    case 'ALL_LIFE_STAGES': return 'all life stages';
    default: return lifeStage.toLowerCase();
  }
}

function getAgeLifeStage(ageYears: number, species: string): string {
  if (species === 'CAT') {
    if (ageYears < 1) return 'KITTEN';
    if (ageYears < 7) return 'ADULT';
    return 'SENIOR';
  } else {
    if (ageYears < 1) return 'PUPPY';
    if (ageYears < 7) return 'ADULT';
    return 'SENIOR';
  }
}

/**
 * Generate a standalone ProductIntelligenceV1 response for a product.
 * Rule-driven: no AI/LLM.
 * 
 * quick_verdict template: species / life_stage / protein_level / price_band / trust_level (5 dimensions)
 * best_for: suitability_tags + rule-derived categories
 * considerations: risk rule derivation
 */
export function generateProductIntelligenceV1(product: VerifiedProduct): ProductIntelligenceV1 {
  const priceBand = getPriceBand(product);
  const speciesLabel = product.species.toLowerCase() + 's';
  const lifeStageLabel = getLifeStageLabel(product.life_stage);

  // Protein level classification
  const proteinLevel =
    product.nutrition.protein >= 36 ? 'high-protein'
    : product.nutrition.protein >= 30 ? 'balanced-protein'
    : 'moderate-protein';

  // Price band classification
  const priceLabel =
    priceBand === 'premium' ? 'premium-priced'
    : priceBand === 'value' ? 'good-value'
    : 'mid-priced';

  // Trust level classification
  const trustLabel =
    product.confidence >= 90 ? 'strongly verified'
    : product.confidence >= 80 ? 'well verified'
    : 'partially verified';

  // Audience string
  const audience =
    product.life_stage === 'ALL_LIFE_STAGES'
      ? `${speciesLabel} across life stages`
      : `${lifeStageLabel} ${speciesLabel}`;

  // Build quick_verdict from 5 dimensions
  const quick_verdict = `${product.name} is a ${proteinLevel}, ${priceLabel} food for ${audience}, with ${trustLabel} product data.`;

  // Build best_for from suitability_tags + rule-derived categories
  const bestFor: string[] = [...product.suitability_tags];

  if (product.species === 'CAT' && product.life_stage === 'ADULT') {
    bestFor.push('Adult Cats');
  }
  if (product.species === 'DOG' && product.life_stage === 'PUPPY') {
    bestFor.push('Growing Puppies');
  }
  if (product.species === 'DOG' && product.life_stage === 'ADULT') {
    bestFor.push('Adult Dogs');
  }
  if (product.nutrition.protein >= 36 && product.species === 'CAT') {
    bestFor.push('Active Cats');
  }
  if (product.nutrition.protein >= 36 && product.species === 'DOG') {
    bestFor.push('Active Dogs');
  }
  if (product.life_stage === 'ALL_LIFE_STAGES') {
    bestFor.push('Multi-Stage Feeding');
  }

  // Build considerations from risk rules
  const considerations: string[] = [];

  if (product.nutrition.fat >= 28) {
    considerations.push(`High Fat (${product.nutrition.fat}%) — may not suit weight management, GI-sensitive, or sedentary pets.`);
  }
  if (priceBand === 'premium') {
    considerations.push(`Above Average Price ($${product.unit_price_aud_per_kg.toFixed(2)}/kg)`);
  }
  if (product.controversial_ingredients.length > 0) {
    considerations.push(
      `Contains Watch-List Ingredients (${product.controversial_ingredients.join(', ')})`
    );
  }
  if (product.market_availability === 'LIMITED') {
    considerations.push('Limited Availability — may face supply disruption');
  }
  if (product.confidence < 80) {
    considerations.push('Limited Verification Depth — product data may be less reliable');
  }
  if (product.life_stage !== 'ALL_LIFE_STAGES') {
    considerations.push(`Formulated for ${lifeStageLabel} ${speciesLabel} only — not suitable for all life stages.`);
  }

  return {
    quick_verdict,
    best_for: dedupeStringArray(bestFor),
    considerations,
    confidence: product.confidence,
    trust_grade: product.verification_grade,
  };
}

function dedupeStringArray(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

/**
 * Score a product's suitability for a specific pet profile.
 * 
 * @param profile - The pet's health profile
 * @param product - The verified product to evaluate
 * @returns { score, strengths, risks } where strengths and risks embed reasons inline
 */
export function scoreProductSuitabilityV1(
  profile: PetProfileInput,
  product: VerifiedProduct
): SuitabilityScoreV1 {
  const strengths: string[] = [];
  const risks: string[] = [];
  let score = product.confidence;
  const priceBand = getPriceBand(product);

  // ── Step 1: Nutrition-based evaluation ──

  // High protein
  if (product.nutrition.protein >= 36) {
    score += 5;
    strengths.push(`High Protein (${product.nutrition.protein}%)`);
  } else if (product.nutrition.protein >= 30) {
    score += 3;
    strengths.push(`Balanced Protein (${product.nutrition.protein}%)`);
  }

  // High fat
  if (product.nutrition.fat >= 28) {
    const hasGiRisk =
      (profile.health_conditions || []).includes('GI_SENSITIVE') ||
      (profile.health_conditions || []).includes('IBD_OR_CHRONIC_GI');
    score -= 5;
    if (hasGiRisk) {
      risks.push(`High Fat (${product.nutrition.fat}%) — caution for GI-sensitive cats`);
    } else {
      risks.push(`High Fat (${product.nutrition.fat}%) — may not suit weight management or sedentary pets`);
    }
  }

  // ── Step 2: Verification strength ──

  if (product.confidence >= 90) {
    score += 5;
    strengths.push(`Strong Source Verification (${product.verification_grade})`);
  } else if (product.confidence >= 80) {
    score += 3;
    strengths.push(`Good Source Verification (${product.verification_grade})`);
  } else {
    // Low verification is a warning (weight 0, informational only)
    risks.push('Limited Verification Depth — product data may be less reliable');
  }

  // ── Step 3: Price evaluation ──

  if (priceBand === 'value') {
    score += 3;
    strengths.push(`Good Everyday Value ($${product.unit_price_aud_per_kg.toFixed(2)}/kg)`);
  } else if (priceBand === 'premium') {
    score -= 4;
    risks.push(`Above Average Price ($${product.unit_price_aud_per_kg.toFixed(2)}/kg)`);
  }

  // ── Step 4: Ingredients ──

  if (product.controversial_ingredients.length > 0) {
    score -= 5;
    risks.push(
      `Contains Watch-List Ingredients (${product.controversial_ingredients.join(', ')})`
    );
  }

  // ── Step 5: Availability ──

  if (product.market_availability === 'LIMITED') {
    score -= 3;
    risks.push('Limited Availability — may face supply disruption');
  }

  // ── Step 6: Suitability tag alignment ──

  if (product.suitability_tags.includes('Sensitive Stomach')) {
    const hasGi =
      (profile.health_conditions || []).includes('GI_SENSITIVE') ||
      (profile.health_conditions || []).includes('IBD_OR_CHRONIC_GI');
    score += hasGi ? 5 : 1;
    strengths.push('Sensitive Stomach Formula');
  }

  if (product.suitability_tags.includes('High Protein')) {
    score += 3;
    strengths.push('High Protein Formula');
  }

  if (product.suitability_tags.includes('Weight Control')) {
    score += 2;
    strengths.push('Weight Control Formula');
  }

  if (product.suitability_tags.includes('Indoor Cat')) {
    score += 1;
    strengths.push('Indoor Cat Formula');
  }

  if (product.suitability_tags.includes('Kitten Growth') && profile.age_years < 1) {
    score += 3;
    strengths.push('Kitten Growth Support');
  }

  // ── Step 7: Life-stage match ──

  const petLifeStage = getAgeLifeStage(profile.age_years, profile.species);
  if (product.life_stage !== 'ALL_LIFE_STAGES' && product.life_stage !== petLifeStage) {
    score -= 8;
    risks.push(
      `Life Stage Mismatch — product is for ${getLifeStageLabel(product.life_stage)}, but pet is ${getLifeStageLabel(petLifeStage)}`
    );
  }

  // ── Step 8: Species barrier ──

  if (product.species !== profile.species) {
    // Should not happen if pre-filtered, but defensive check
    score -= 50;
    risks.push(`Species Mismatch — product is for ${product.species.toLowerCase()}s`);
  }

  // ── Clamp and return ──

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    strengths,
    risks,
  };
}
