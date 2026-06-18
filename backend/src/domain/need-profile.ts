export type NeedProfileCode =
  | 'INDOOR_CAT'
  | 'SENSITIVE_STOMACH'
  | 'WEIGHT_CONTROL'
  | 'SENIOR_SUPPORT'
  | 'RECOVERY_SUPPORT'
  | 'KITTEN_GROWTH'
  | 'EVERYDAY_ADULT';

export type NeedConstraintOperator = 'gte' | 'lte' | 'eq' | 'contains' | 'avoid';

export interface NeedConstraint {
  field: string;
  operator: NeedConstraintOperator;
  value: string | number | boolean;
  weight: number;
  reason: string;
}

export interface NeedProfile {
  code: NeedProfileCode;
  label: string;
  species: 'CAT';
  description: string;
  user_facing_summary: string;
  constraints: NeedConstraint[];
  caution_level: 'LOW' | 'MEDIUM' | 'HIGH';
  requires_vet_disclaimer: boolean;
}

export const needProfiles: Record<NeedProfileCode, NeedProfile> = {
  INDOOR_CAT: {
    code: 'INDOOR_CAT',
    label: 'Indoor Cat',
    species: 'CAT',
    description: 'Everyday food fit for indoor adult cats with lower activity levels.',
    user_facing_summary: 'Looks for balanced calories, indoor-cat fit, fiber support, and reliable everyday data.',
    caution_level: 'LOW',
    requires_vet_disclaimer: false,
    constraints: [
      { field: 'suitability_tags', operator: 'contains', value: 'Indoor Cat', weight: 12, reason: 'Labeled or normalized as a fit for indoor cats.' },
      { field: 'nutrition.fiber', operator: 'gte', value: 4, weight: 6, reason: 'Moderate fiber can support indoor-cat feeding plans.' },
      { field: 'nutrition.fat', operator: 'lte', value: 18, weight: 6, reason: 'Moderate fat may be a better everyday fit for lower activity cats.' },
      { field: 'market_availability', operator: 'eq', value: 'ACTIVE', weight: 4, reason: 'Active market availability supports repeat purchase.' },
    ],
  },
  SENSITIVE_STOMACH: {
    code: 'SENSITIVE_STOMACH',
    label: 'Sensitive Stomach',
    species: 'CAT',
    description: 'Cautious food matching for cats with sensitive digestion signals.',
    user_facing_summary: 'Prioritizes sensitive-digestion fit, moderate fat, simpler ingredients, and stronger evidence.',
    caution_level: 'MEDIUM',
    requires_vet_disclaimer: true,
    constraints: [
      { field: 'suitability_tags', operator: 'contains', value: 'Sensitive Stomach', weight: 15, reason: 'Product is tagged as potentially easier for sensitive digestion.' },
      { field: 'nutrition.fat', operator: 'lte', value: 20, weight: 10, reason: 'Moderate fat may be more suitable for sensitive digestion.' },
      { field: 'controversial_ingredients', operator: 'avoid', value: true, weight: -8, reason: 'Watch-list ingredients may need extra caution for sensitive cats.' },
      { field: 'confidence', operator: 'gte', value: 80, weight: 6, reason: 'Sensitive-digestion decisions need reliable product data.' },
    ],
  },
  WEIGHT_CONTROL: {
    code: 'WEIGHT_CONTROL',
    label: 'Weight Control',
    species: 'CAT',
    description: 'Food fit for cats where weight-aware everyday feeding is the goal.',
    user_facing_summary: 'Looks for higher protein, lower fat, fiber support, and indoor or weight-control fit.',
    caution_level: 'LOW',
    requires_vet_disclaimer: false,
    constraints: [
      { field: 'suitability_tags', operator: 'contains', value: 'Weight Control', weight: 14, reason: 'Product is tagged for weight-aware feeding.' },
      { field: 'nutrition.protein', operator: 'gte', value: 32, weight: 8, reason: 'Adequate protein can support lean mass during weight-aware feeding.' },
      { field: 'nutrition.fat', operator: 'lte', value: 15, weight: 10, reason: 'Lower fat may suit weight-aware feeding.' },
      { field: 'nutrition.fiber', operator: 'gte', value: 5, weight: 6, reason: 'Fiber can help support satiety.' },
    ],
  },
  SENIOR_SUPPORT: {
    code: 'SENIOR_SUPPORT',
    label: 'Senior Support',
    species: 'CAT',
    description: 'Cautious fit for older cats where digestibility and evidence quality matter.',
    user_facing_summary: 'Prioritizes senior life-stage fit, moderate nutrition, and stronger verification.',
    caution_level: 'MEDIUM',
    requires_vet_disclaimer: true,
    constraints: [
      { field: 'life_stage', operator: 'eq', value: 'SENIOR', weight: 12, reason: 'Senior life-stage match is preferred for older cats.' },
      { field: 'life_stage', operator: 'eq', value: 'ALL_LIFE_STAGES', weight: 5, reason: 'All life stages can be considered when senior-specific data is unavailable.' },
      { field: 'nutrition.fat', operator: 'lte', value: 22, weight: 5, reason: 'Moderate fat may be easier to assess for older cats.' },
      { field: 'confidence', operator: 'gte', value: 85, weight: 7, reason: 'Senior feeding decisions benefit from stronger source verification.' },
    ],
  },
  RECOVERY_SUPPORT: {
    code: 'RECOVERY_SUPPORT',
    label: 'Recovery Support',
    species: 'CAT',
    description: 'Vet-first caution profile for cats recovering from illness, surgery, or reduced appetite.',
    user_facing_summary: 'Uses retail food data only as a cautious comparison aid and keeps veterinary guidance first.',
    caution_level: 'HIGH',
    requires_vet_disclaimer: true,
    constraints: [
      { field: 'confidence', operator: 'gte', value: 90, weight: 8, reason: 'Recovery-context comparisons require strong source verification.' },
      { field: 'nutrition.protein', operator: 'gte', value: 30, weight: 4, reason: 'Adequate protein may be relevant for general nutrition comparison.' },
      { field: 'nutrition.fat', operator: 'lte', value: 25, weight: 4, reason: 'Very high fat may require extra caution in recovery contexts.' },
      { field: 'vet_guidance', operator: 'eq', value: true, weight: 0, reason: 'Recovery feeding should be confirmed with a veterinarian.' },
    ],
  },
  KITTEN_GROWTH: {
    code: 'KITTEN_GROWTH',
    label: 'Kitten Growth',
    species: 'CAT',
    description: 'Food fit for kittens and growth-stage nutrition comparison.',
    user_facing_summary: 'Prioritizes kitten or all-life-stages fit, higher protein, and reliable data.',
    caution_level: 'LOW',
    requires_vet_disclaimer: false,
    constraints: [
      { field: 'life_stage', operator: 'eq', value: 'KITTEN', weight: 16, reason: 'Kitten life-stage match is preferred for growth.' },
      { field: 'life_stage', operator: 'eq', value: 'ALL_LIFE_STAGES', weight: 8, reason: 'All life stages can be suitable when growth feeding is supported.' },
      { field: 'nutrition.protein', operator: 'gte', value: 35, weight: 8, reason: 'Higher protein is commonly relevant for growth-stage comparison.' },
      { field: 'nutrition.fat', operator: 'gte', value: 15, weight: 5, reason: 'Growth-stage foods often need stronger energy density.' },
    ],
  },
  EVERYDAY_ADULT: {
    code: 'EVERYDAY_ADULT',
    label: 'Everyday Adult',
    species: 'CAT',
    description: 'General everyday food fit for healthy adult cats.',
    user_facing_summary: 'Balances nutrition, price, availability, and evidence for routine adult feeding.',
    caution_level: 'LOW',
    requires_vet_disclaimer: false,
    constraints: [
      { field: 'life_stage', operator: 'eq', value: 'ADULT', weight: 10, reason: 'Adult life-stage match supports everyday fit.' },
      { field: 'life_stage', operator: 'eq', value: 'ALL_LIFE_STAGES', weight: 5, reason: 'All life stages can be considered for adult cats.' },
      { field: 'confidence', operator: 'gte', value: 80, weight: 6, reason: 'Everyday recommendations should use reliable product data.' },
      { field: 'unit_price_aud_per_kg', operator: 'lte', value: 80, weight: 4, reason: 'Moderate unit price supports practical everyday feeding.' },
    ],
  },
};

export function buildNeedProfile(code: NeedProfileCode): NeedProfile {
  const profile = needProfiles[code];
  if (!profile) {
    throw new Error(`Unknown need profile: ${code}`);
  }
  return {
    ...profile,
    constraints: profile.constraints.map((constraint) => ({ ...constraint })),
  };
}

export function listNeedProfiles(): NeedProfile[] {
  return (Object.keys(needProfiles) as NeedProfileCode[]).map(buildNeedProfile);
}
