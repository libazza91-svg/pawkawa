import { scoreProductSuitability } from './suitability-engine';
import { PetProfileInput, RecommendationConstraint, RecommendationContextResult, VerifiedProduct } from './types';
import { verifiedProducts } from './product-insight-engine';
import { getBreedRisks } from '../rules/breed/breed-risks';
import { buildHealthConstraints as buildHealthConstraintsFromRules } from '../rules/health/health-conditions';

function normalizeBreed(breed?: string): string {
  return (breed || '').trim().toUpperCase().replace(/\s+/g, '_');
}

/**
 * Build breed-specific constraints using the unified Breed Risk Engine (Epic 2).
 * Replaces the old inline breedRiskRules record.
 */
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

/**
 * Public wrapper: accepts PetProfileInput for backward compatibility
 * with callers (compare.ts, tests) that expect this signature.
 */
export function buildHealthConstraints(profile: PetProfileInput): RecommendationConstraint[] {
  return buildHealthConstraintsFromRules(
    profile.health_conditions || [],
    profile.vet_prescription_required || false
  );
}

export function buildRecommendationContext(
  profile: PetProfileInput,
  catalog: VerifiedProduct[] = verifiedProducts
): RecommendationContextResult {
  const breedConstraints = buildBreedConstraints(profile.breed);
  const healthConstraints = buildHealthConstraints(profile);
  const constraints = [...breedConstraints, ...healthConstraints];
  const recommendations = catalog
    .filter((product) => product.species === profile.species)
    .map((product) => scoreProductSuitability(product, constraints))
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
