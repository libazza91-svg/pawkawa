/**
 * VerifiedProductProfile — core type definitions
 * Sprint 1.3C-P2: Multi-Source Product Verification
 */

/** A single verified nutrition field */
export interface VerifiedField {
  /** Agreed-upon value after verification */
  value: number;
  /** Confidence 0-1 based on source agreement */
  confidence: number;
  /** Number of sources that contributed to this value */
  sources: number;
  /** Individual source readings */
  source_values: SourceReading[];
  /** Verification status */
  status: 'verified' | 'minor_variance' | 'conflict' | 'unverified';
  /** Unit: % for macronutrients, kcal/kg for calories */
  unit: string;
  /** Tolerance range (±) */
  tolerance: number;
}

export interface SourceReading {
  source_name: string;
  source_type: 'manufacturer' | 'retailer' | 'seed';
  value: number;
  captured_at: string;
}

/** Ingredient verification */
export interface VerifiedIngredientField {
  /** Normalized ingredient list from most authoritative source */
  normalized_ingredients: string[];
  /** Sources that agree on ingredients */
  agreeing_sources: number;
  /** Sources that disagree */
  conflicting_sources: number;
  /** Ingredient overlap % across sources */
  overlap_percentage: number;
  /** Status */
  status: 'verified' | 'partial' | 'conflict' | 'unverified';
  /** Per-source ingredient lists */
  source_ingredients: { source_name: string; ingredients: string[] }[];
}

/** Full verified product profile */
export interface VerifiedProductProfile {
  product_id: string;
  brand: string;
  product_name: string;
  species: 'CAT' | 'DOG';
  verified_at: string;
  fields: {
    protein: VerifiedField;
    fat: VerifiedField;
    fiber: VerifiedField;
    moisture: VerifiedField;
    calories: VerifiedField;
    ingredients: VerifiedIngredientField;
  };
  /** Overall confidence across all fields */
  overall_confidence: number;
  /** Total unique sources consulted */
  total_sources: number;
  /** Profiling status */
  verification_status: 'verified' | 'partial' | 'conflict';
  /** Field-level conflicts detected */
  conflicts: FieldConflict[];
  /** Verification tier */
  tier: 'GOLD' | 'SILVER' | 'BRONZE' | 'UNVERIFIED';
}

export interface FieldConflict {
  field: string;
  seed_value: number;
  manufacturer_value: number;
  retailer_values: { source: string; value: number }[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

/** Batch verification summary for dashboard */
export interface VerificationSummary {
  total_products: number;
  verified: number;
  partial: number;
  conflict: number;
  unverified: number;
  // By field
  field_coverage: {
    protein: number;
    fat: number;
    fiber: number;
    moisture: number;
    calories: number;
    ingredients: number;
  };
  // By tier
  tier_distribution: {
    GOLD: number;
    SILVER: number;
    BRONZE: number;
    UNVERIFIED: number;
  };
  average_overall_confidence: number;
  total_conflicts: number;
}
