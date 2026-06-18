import { verifiedProducts } from '../verified-products/catalog';
import {
  PetProfileInput,
  RecommendationConstraint,
  RecommendationContextResult,
  SuitabilityRecommendation,
  VerifiedProduct,
} from '../intelligence/types';
import { buildNeedProfile, NeedProfile, NeedProfileCode, scoreProductForNeed } from '../domain';
import { getBreedRisks } from './breed/breed-risks';
import { buildHealthConstraints } from './health/health-conditions';

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

function inferNeedCodes(profile: PetProfileInput): NeedProfileCode[] {
  if (profile.need_codes && profile.need_codes.length > 0) return profile.need_codes;
  const codes: NeedProfileCode[] = [];
  const conditions = profile.health_conditions || [];

  if (conditions.includes('GI_SENSITIVE') || conditions.includes('IBD_OR_CHRONIC_GI')) codes.push('SENSITIVE_STOMACH');
  if (conditions.includes('POST_SURGERY')) codes.push('RECOVERY_SUPPORT');
  if (profile.age_years < 1) codes.push('KITTEN_GROWTH');
  if (profile.age_years >= 7) codes.push('SENIOR_SUPPORT');
  if (codes.length === 0) codes.push('EVERYDAY_ADULT');

  return unique(codes) as NeedProfileCode[];
}

function constraintsFromNeedProfiles(needProfiles: NeedProfile[]): RecommendationConstraint[] {
  return needProfiles.flatMap((profile) =>
    profile.constraints.map((constraint) => ({
      code: `${profile.code}_${constraint.field.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`,
      label: `${profile.label}: ${constraint.field}`,
      type: constraint.operator === 'avoid' || constraint.weight < 0 ? 'AVOID' as const : 'PREFER' as const,
      reason: constraint.reason,
    })),
  );
}

export function buildRecommendationFromRules(
  profile: PetProfileInput,
  product: VerifiedProduct
): SuitabilityRecommendation {
  const needProfile = buildNeedProfile(inferNeedCodes(profile)[0]);
  const result = scoreProductForNeed(product, needProfile);
  const cautions = [...result.caution_reasons];

  if (profile.vet_prescription_required) {
    cautions.push('Prescription diet may override retail-food suitability');
  }

  return {
    product_id: product.id,
    product_slug: product.slug,
    product_name: product.name,
    suitability_score: result.score,
    reasons: result.matched_reasons,
    cautions: unique(cautions),
    suitability_result: result,
    evidence_refs: result.evidence_refs,
  };
}

export function buildRecommendationContextFromRules(
  profile: PetProfileInput,
  catalog: VerifiedProduct[] = verifiedProducts
): RecommendationContextResult {
  const needProfiles = inferNeedCodes(profile).map(buildNeedProfile);
  const constraints = [
    ...constraintsFromNeedProfiles(needProfiles),
    ...buildProfileConstraints(profile),
  ];
  const recommendations = catalog
    .filter((product) => product.species === profile.species)
    .map((product) => buildRecommendationFromRules(profile, product))
    .sort((a, b) => b.suitability_score - a.suitability_score);

  return {
    need_profiles: needProfiles,
    constraints,
    recommendations,
    warnings: [
      'Suitability scoring is for comparison only.',
      'Do not use this output as a diagnosis or treatment plan.',
      'Sick, post-surgery, cardiac, kidney, urinary, or chronic gastrointestinal cases require veterinary guidance before changing diet.',
    ],
    disclaimer_required: needProfiles.some((profile) => profile.requires_vet_disclaimer) || !!profile.vet_prescription_required,
  };
}
