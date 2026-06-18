import { PetProfileInput, VerifiedProduct } from '../../intelligence/types';
import { buildNeedProfile, buildProductDecisionSummary, scoreProductForNeed } from '../../domain';
import { SuitabilityScoreV1, ProductIntelligenceV1 } from '../types';

/**
 * Backward-compatible wrapper around backend/src/domain/decision-model.ts.
 * The domain decision model is the only active scoring source.
 */
export function generateProductIntelligenceV1(product: VerifiedProduct): ProductIntelligenceV1 {
  return buildProductDecisionSummary(product);
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
  const needCode = (profile.health_conditions || []).includes('GI_SENSITIVE') || (profile.health_conditions || []).includes('IBD_OR_CHRONIC_GI')
    ? 'SENSITIVE_STOMACH'
    : profile.age_years < 1
      ? 'KITTEN_GROWTH'
      : profile.age_years >= 7
        ? 'SENIOR_SUPPORT'
        : 'EVERYDAY_ADULT';
  const result = scoreProductForNeed(product, buildNeedProfile(needCode));
  return {
    score: result.score,
    strengths: result.matched_reasons,
    risks: result.caution_reasons,
  };
}
