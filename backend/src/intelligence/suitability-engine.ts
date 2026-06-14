import { buildRecommendationFromRules } from '../rules';
import { HealthCondition, PetProfileInput, RecommendationConstraint, SuitabilityRecommendation, VerifiedProduct } from './types';

function inferHealthConditions(constraints: RecommendationConstraint[]): HealthCondition[] {
  const conditions: HealthCondition[] = [];

  if (constraints.some((constraint) => constraint.code === 'PREFER_DIGESTIBLE_GI_FOOD' || constraint.code === 'AVOID_HIGH_FAT_GI')) {
    conditions.push('GI_SENSITIVE');
  }
  if (constraints.some((constraint) => constraint.code === 'RECOVERY_PLAN_FIRST' || constraint.code === 'PREFER_CALORIE_DENSE_RECOVERY')) {
    conditions.push('POST_SURGERY');
  }
  if (constraints.some((constraint) => constraint.code === 'HEART_CONDITION_VET_PLAN')) {
    conditions.push('HEART_RISK');
  }

  return conditions;
}

export function scoreProductSuitability(product: VerifiedProduct, constraints: RecommendationConstraint[]): SuitabilityRecommendation {
  const profile: PetProfileInput = {
    species: product.species,
    age_years: product.life_stage === 'PUPPY' || product.life_stage === 'KITTEN' ? 0 : product.life_stage === 'SENIOR' ? 10 : 3,
    health_conditions: inferHealthConditions(constraints),
    vet_prescription_required: constraints.some((constraint) => constraint.code === 'PRESCRIPTION_REQUIRED'),
  };
  return buildRecommendationFromRules(profile, product);
}
