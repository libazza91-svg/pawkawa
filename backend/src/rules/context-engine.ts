import { verifiedProducts } from '../intelligence/product-insight-engine';
import {
  PetProfileInput,
  RecommendationConstraint,
  RecommendationContextResult,
  SuitabilityRecommendation,
  VerifiedProduct,
} from '../intelligence/types';
import { getBreedRisks } from './breed/breed-risks';
import { buildHealthConstraints } from './health/health-conditions';
import { scoreProductSuitabilityV1 } from './suitability/suitability-engine';

function buildBreedConstraints(breed?: string): RecommendationConstraint[] {
  const breedRisks = getBreedRisks(breed);
  if (!breedRisks) return [];

  return breedRisks.risks.map((entry) => ({
    code: `${breedRisks.breed}_${entry.signal.replace(/\s+/g, '_').toUpperCase()}`,
    label: `${breedRisks.breed.replace(/_/g, ' ')}: ${entry.signal}`,
    type: 'REQUIRES_VET' as const,
    reason: entry.consideration,
  }));
}

export function buildProfileConstraints(profile: PetProfileInput): RecommendationConstraint[] {
  return [
    ...buildBreedConstraints(profile.breed),
    ...buildHealthConstraints(profile.health_conditions || [], profile.vet_prescription_required || false),
  ];
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

export function buildRecommendationFromRules(
  profile: PetProfileInput,
  product: VerifiedProduct
): SuitabilityRecommendation {
  const result = scoreProductSuitabilityV1(profile, product);
  let score = result.score;
  const reasons = [...result.strengths];
  const cautions = [...result.risks];
  const hasGiConcern =
    (profile.health_conditions || []).includes('GI_SENSITIVE') ||
    (profile.health_conditions || []).includes('IBD_OR_CHRONIC_GI');

  if (profile.vet_prescription_required) {
    cautions.push('Prescription diet may override retail-food suitability');
  }

  if (hasGiConcern && product.suitability_tags.includes('Sensitive Stomach')) {
    score += 5;
    reasons.push('Sensitive stomach fit');
  }

  if (hasGiConcern && product.nutrition.fat >= 25) {
    score -= 18;
    cautions.push('High fat for GI-sensitive profile');
  }

  if (hasGiConcern) {
    cautions.push('Confirm novel/hydrolyzed diet need with veterinarian');
  }

  if (product.confidence >= 90) {
    reasons.push('High-confidence verified data');
  }

  if (product.unit_price_aud_per_kg > 100) {
    cautions.push('Premium unit price');
  }

  if (product.controversial_ingredients.length > 0) {
    cautions.push('Contains watch-list ingredients');
  }

  return {
    product_id: product.id,
    product_slug: product.slug,
    product_name: product.name,
    suitability_score: Math.max(0, Math.min(100, Math.round(score))),
    reasons: unique(reasons),
    cautions: unique(cautions),
  };
}

export function buildRecommendationContextFromRules(
  profile: PetProfileInput,
  catalog: VerifiedProduct[] = verifiedProducts
): RecommendationContextResult {
  const constraints = buildProfileConstraints(profile);
  const recommendations = catalog
    .filter((product) => product.species === profile.species)
    .map((product) => buildRecommendationFromRules(profile, product))
    .sort((a, b) => b.suitability_score - a.suitability_score);

  return {
    constraints,
    recommendations,
    warnings: [
      'Suitability scoring is for comparison only.',
      'Do not use this output as a diagnosis or treatment plan.',
      'Sick, post-surgery, cardiac, kidney, urinary, or chronic gastrointestinal cases require veterinary guidance before changing diet.',
    ],
  };
}
