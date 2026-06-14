// ── Data Governance Checkpoint — Frozen Enum Values ──────────────────

export const Species = ['CAT', 'DOG'] as const;
export type Species = (typeof Species)[number];

export const LifeStage = ['KITTEN', 'ADULT', 'SENIOR', 'PUPPY', 'ALL_LIFE_STAGES'] as const;
export type LifeStage = (typeof LifeStage)[number];

export const ProductStatus = ['ACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK'] as const;
export type ProductStatus = (typeof ProductStatus)[number];

export const SourceType = ['brand_site', 'retailer', 'open_pet_food_facts', 'manual'] as const;
export type SourceType = (typeof SourceType)[number];

export const HealthNeedCode = [
  'weight_control',
  'kidney_support',
  'allergy_sensitive',
  'senior_care',
  'kitten_puppy',
] as const;
export type HealthNeedCode = (typeof HealthNeedCode)[number];

export const HealthOperator = ['lte', 'gte', 'eq'] as const;
export type HealthOperator = (typeof HealthOperator)[number];
