export type Species = 'CAT' | 'DOG';
export type LifeStage = 'KITTEN' | 'PUPPY' | 'ADULT' | 'SENIOR' | 'ALL_LIFE_STAGES';
export type VerificationGrade = 'GOLD' | 'SILVER' | 'BRONZE' | 'UNVERIFIED';
export type MarketAvailability = 'ACTIVE' | 'LIMITED' | 'DISCONTINUED';
export type HealthCondition = 'GI_SENSITIVE' | 'IBD_OR_CHRONIC_GI' | 'POST_SURGERY' | 'HEART_RISK' | 'KIDNEY_SUPPORT' | 'URINARY_SUPPORT';

export interface VerifiedProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  species: Species;
  life_stage: LifeStage;
  verification_grade: VerificationGrade;
  confidence: number;
  market_availability: MarketAvailability;
  nutrition: {
    protein: number;
    fat: number;
    fiber: number;
    calories: number;
    moisture: number;
    ash: number;
    phosphorus: number;
  };
  ingredients_normalized: string[];
  controversial_ingredients: string[];
  suitability_tags: string[];
  unit_price_aud_per_kg: number;
}

export interface ProductInsight {
  quick_verdict: string;
  strengths: string[];
  considerations: string[];
  best_for: string[];
  avoid_if: string[];
}

export interface PetProfileInput {
  species: Species;
  age_years: number;
  breed?: string;
  health_conditions?: HealthCondition[];
  vet_prescription_required?: boolean;
}

export interface RecommendationConstraint {
  code: string;
  label: string;
  type: 'PREFER' | 'AVOID' | 'REQUIRES_VET';
  reason: string;
}

export interface SuitabilityRecommendation {
  product_id: string;
  product_slug: string;
  product_name: string;
  suitability_score: number;
  reasons: string[];
  cautions: string[];
}

export interface RecommendationContextResult {
  constraints: RecommendationConstraint[];
  recommendations: SuitabilityRecommendation[];
  warnings: string[];
}

export interface RecoveryKnowledgeTopic {
  id: string;
  title: string;
  species: Species[];
  situation: string;
  owner_summary: string;
  feeding_approach: string[];
  food_traits: string[];
  avoid: string[];
  call_vet_if: string[];
  evidence_level: 'VETERINARY_GUIDELINE' | 'VETERINARY_HOSPITAL_GUIDANCE' | 'CLINICAL_EDUCATION';
  source_labels: string[];
}
