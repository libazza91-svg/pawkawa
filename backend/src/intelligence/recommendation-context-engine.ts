import { PetProfileInput, RecommendationConstraint, RecommendationContextResult, VerifiedProduct } from './types';
import { verifiedProducts } from '../verified-products/catalog';
import { buildProfileConstraints, buildRecommendationContextFromRules } from '../rules';

/**
 * Public wrapper: accepts PetProfileInput for backward compatibility
 * with callers (compare.ts, tests) that expect this signature.
 */
export function buildHealthConstraints(profile: PetProfileInput): RecommendationConstraint[] {
  return buildProfileConstraints(profile).filter((constraint) => {
    return (
      constraint.code === 'PRESCRIPTION_REQUIRED' ||
      constraint.code === 'PREFER_DIGESTIBLE_GI_FOOD' ||
      constraint.code === 'CONSIDER_NOVEL_OR_HYDROLYZED' ||
      constraint.code === 'AVOID_HIGH_FAT_GI' ||
      constraint.code === 'RECOVERY_PLAN_FIRST' ||
      constraint.code === 'PREFER_CALORIE_DENSE_RECOVERY' ||
      constraint.code === 'HEART_CONDITION_VET_PLAN'
    );
  });
}

export function buildRecommendationContext(
  profile: PetProfileInput,
  catalog: VerifiedProduct[] = verifiedProducts
): RecommendationContextResult {
  return buildRecommendationContextFromRules(profile, catalog);
}
