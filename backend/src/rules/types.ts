/**
 * Rule Registry — Unified Rule Type Definitions
 * 
 * All rules across nutrition, breed, health, and suitability categories
 * share this common shape for registry lookup and scoring.
 */

export type RuleCategory = 'nutrition' | 'breed' | 'health' | 'suitability';

export interface Rule {
  /** Unique rule identifier, e.g. NUT_HIGH_PROTEIN, BREED_RAGDOLL_HCM */
  id: string;
  /** Which category this rule belongs to */
  category: RuleCategory;
  /** Human-readable description of when this rule triggers */
  condition: string;
  /** What action this rule prescribes */
  action: string;
  /** Scoring weight: positive = strength/bonus, negative = penalty/risk, 0 = informational */
  weight: number;
  /** Human-readable rationale for this rule */
  reason: string;
}

/**
 * Breed-specific risk signal + nutritional consideration.
 * Used by the Breed Risk Engine (Epic 2).
 */
export interface BreedRiskEntry {
  signal: string;
  consideration: string;
  evidence_level: 'VETERINARY_GUIDELINE' | 'VETERINARY_HOSPITAL_GUIDANCE' | 'CLINICAL_EDUCATION';
  source_labels: string[];
}

/** Output shape of the Breed Risk Engine */
export interface BreedRiskOutput {
  breed: string;
  risks: BreedRiskEntry[];
}

/**
 * Suitability Engine V1 scoring output (Epic 1).
 * Each strength/risk string embeds its human-readable reason inline.
 */
export interface SuitabilityScoreV1 {
  score: number;
  strengths: string[];
  risks: string[];
}

/**
 * Product Intelligence API response shape (Epic 3).
 */
export interface ProductIntelligenceV1 {
  product_id: string;
  quick_verdict: string;
  strengths: string[];
  best_for: string[];
  considerations: string[];
  avoid_if: string[];
  confidence: number;
  trust_grade: 'GOLD' | 'SILVER' | 'BRONZE' | 'UNVERIFIED';
}
