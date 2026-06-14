import { Rule } from '../types';
import { RecommendationConstraint } from '../../intelligence/types';

/**
 * Health condition rules — migrated from buildHealthConstraints()
 * in recommendation-context-engine.ts.
 * 
 * These define constraints triggered by specific health conditions.
 */

export const healthRules: Rule[] = [
  {
    id: 'HLTH_PRESCRIPTION_REQUIRED',
    category: 'health',
    condition: 'vet_prescription_required = true',
    action: 'REQUIRES_VET: prescription diet required',
    weight: -35,
    reason: 'Retail food comparison should not override a prescription diet plan.',
  },
  {
    id: 'HLTH_GI_PREFER_DIGESTIBLE',
    category: 'health',
    condition: 'health_conditions includes GI_SENSITIVE or IBD_OR_CHRONIC_GI',
    action: 'PREFER: highly digestible GI support food',
    weight: 14,
    reason: 'Chronic digestive signs often need a controlled diet trial selected with a veterinarian.',
  },
  {
    id: 'HLTH_GI_CONSIDER_NOVEL',
    category: 'health',
    condition: 'health_conditions includes GI_SENSITIVE or IBD_OR_CHRONIC_GI',
    action: 'PREFER: novel or hydrolyzed protein if vet-directed',
    weight: 0,
    reason: 'Novel or hydrolyzed protein can be used for suspected food reactions or chronic GI inflammation under veterinary guidance.',
  },
  {
    id: 'HLTH_GI_AVOID_HIGH_FAT',
    category: 'health',
    condition: 'health_conditions includes GI_SENSITIVE or IBD_OR_CHRONIC_GI',
    action: 'AVOID: high-fat foods during GI flare-ups',
    weight: -18,
    reason: 'Higher fat may be unsuitable for some digestive cases and should be checked with the veterinarian.',
  },
  {
    id: 'HLTH_POST_SURGERY_RECOVERY',
    category: 'health',
    condition: 'health_conditions includes POST_SURGERY',
    action: 'REQUIRES_VET: follow discharge nutrition plan',
    weight: -10,
    reason: 'Post-surgery feeding depends on anaesthesia, nausea, pain, procedure type, and appetite.',
  },
  {
    id: 'HLTH_POST_SURGERY_CALORIE_DENSE',
    category: 'health',
    condition: 'health_conditions includes POST_SURGERY',
    action: 'PREFER: calorie-dense recovery food if prescribed',
    weight: 0,
    reason: 'Recovery patients may need concentrated calories and palatable food when intake is limited.',
  },
  {
    id: 'HLTH_HEART_RISK_VET',
    category: 'health',
    condition: 'health_conditions includes HEART_RISK',
    action: 'REQUIRES_VET: heart-risk diet decisions need veterinary review',
    weight: -10,
    reason: 'Food search cannot diagnose or manage cardiac disease; body weight and sodium strategy should be vet-directed.',
  },
];

/**
 * Build RecommendationConstraint objects from health conditions.
 * Mirrors the original buildHealthConstraints() behaviour.
 */
export function buildHealthConstraints(
  healthConditions: string[] = [],
  vetPrescriptionRequired: boolean = false
): RecommendationConstraint[] {
  const constraints: RecommendationConstraint[] = [];

  if (vetPrescriptionRequired) {
    constraints.push({
      code: 'PRESCRIPTION_REQUIRED',
      label: 'Veterinary prescription diet required',
      type: 'REQUIRES_VET',
      reason: 'Retail food comparison should not override a prescription diet plan.',
    });
  }

  if (healthConditions.includes('GI_SENSITIVE') || healthConditions.includes('IBD_OR_CHRONIC_GI')) {
    constraints.push(
      {
        code: 'PREFER_DIGESTIBLE_GI_FOOD',
        label: 'Prefer highly digestible gastrointestinal support',
        type: 'PREFER',
        reason: 'Chronic digestive signs often need a controlled diet trial selected with a veterinarian.',
      },
      {
        code: 'CONSIDER_NOVEL_OR_HYDROLYZED',
        label: 'Consider novel or hydrolyzed protein if vet-directed',
        type: 'PREFER',
        reason: 'Novel or hydrolyzed protein can be used for suspected food reactions or chronic GI inflammation under veterinary guidance.',
      },
      {
        code: 'AVOID_HIGH_FAT_GI',
        label: 'Avoid high-fat foods during GI flare-ups',
        type: 'AVOID',
        reason: 'Higher fat may be unsuitable for some digestive cases and should be checked with the veterinarian.',
      }
    );
  }

  if (healthConditions.includes('POST_SURGERY')) {
    constraints.push(
      {
        code: 'RECOVERY_PLAN_FIRST',
        label: 'Follow the discharge nutrition plan first',
        type: 'REQUIRES_VET',
        reason: 'Post-surgery feeding depends on anaesthesia, nausea, pain, procedure type, and appetite.',
      },
      {
        code: 'PREFER_CALORIE_DENSE_RECOVERY',
        label: 'Prefer calorie-dense recovery food if prescribed',
        type: 'PREFER',
        reason: 'Recovery patients may need concentrated calories and palatable food when intake is limited.',
      }
    );
  }

  if (healthConditions.includes('HEART_RISK')) {
    constraints.push({
      code: 'HEART_CONDITION_VET_PLAN',
      label: 'Heart-risk diet decisions need veterinary review',
      type: 'REQUIRES_VET',
      reason: 'Food search cannot diagnose or manage cardiac disease; body weight and sodium strategy should be vet-directed.',
    });
  }

  return constraints;
}
