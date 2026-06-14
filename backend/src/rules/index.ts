import { Rule, RuleCategory } from './types';
import { nutritionRules } from './nutrition';
import { breedRules } from './breed';
import { healthRules } from './health';
import { suitabilityScoringRules } from './suitability';
import { PetProfileInput } from '../intelligence/types';

/**
 * RuleRegistry — Centralised rule management for the Pet Intelligence Platform.
 * 
 * Features:
 * - Loads all rule modules at initialisation
 * - Supports getRules(category) for category-scoped queries
 * - Supports getApplicableRules(profile) for profile-driven rule filtering
 */
export class RuleRegistry {
  private rules: Rule[];

  constructor() {
    this.rules = [
      ...nutritionRules,
      ...breedRules,
      ...healthRules,
      ...suitabilityScoringRules,
    ];
  }

  /** Get all rules in the registry */
  getAllRules(): Rule[] {
    return this.rules;
  }

  /** Get rules filtered by category */
  getRules(category: RuleCategory): Rule[] {
    return this.rules.filter((rule) => rule.category === category);
  }

  /** Get rules applicable to a given pet profile */
  getApplicableRules(profile: PetProfileInput): Rule[] {
    const applicable: Rule[] = [];
    const conditions = (profile.health_conditions || []).map((c) => c.toUpperCase());
    const breed = (profile.breed || '').trim().toUpperCase().replace(/\s+/g, '_');

    for (const rule of this.rules) {
      if (this.ruleAppliesToProfile(rule, profile, conditions, breed)) {
        applicable.push(rule);
      }
    }

    return applicable;
  }

  private ruleAppliesToProfile(
    rule: Rule,
    profile: PetProfileInput,
    conditions: string[],
    breed: string
  ): boolean {
    switch (rule.id) {
      // Breed rules
      case 'BREED_RAGDOLL_HCM':
        return breed === 'RAGDOLL';
      case 'BREED_PERSIAN_URINARY_HAIRBALL':
        return breed === 'PERSIAN';
      case 'BREED_MAINE_COON_JOINT_CARDIAC':
        return breed === 'MAINE_COON';

      // Health rules
      case 'HLTH_PRESCRIPTION_REQUIRED':
        return !!profile.vet_prescription_required;
      case 'HLTH_GI_PREFER_DIGESTIBLE':
      case 'HLTH_GI_CONSIDER_NOVEL':
      case 'HLTH_GI_AVOID_HIGH_FAT':
        return conditions.includes('GI_SENSITIVE') || conditions.includes('IBD_OR_CHRONIC_GI');
      case 'HLTH_POST_SURGERY_RECOVERY':
      case 'HLTH_POST_SURGERY_CALORIE_DENSE':
        return conditions.includes('POST_SURGERY');
      case 'HLTH_HEART_RISK_VET':
        return conditions.includes('HEART_RISK');

      // Nutrition and suitability rules always apply (product-level evaluation)
      default:
        return true;
    }
  }
}

/** Singleton instance */
export const ruleRegistry = new RuleRegistry();

export { buildProfileConstraints, buildRecommendationContextFromRules, buildRecommendationFromRules } from './context-engine';

// Re-export types for convenience
export type { Rule, RuleCategory, BreedRiskEntry, BreedRiskOutput, SuitabilityScoreV1, ProductIntelligenceV1 } from './types';
