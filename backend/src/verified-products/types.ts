import { EvidenceRef, NeedProfileCode, SuitabilityResult } from '../domain';
import { LifeStage, MarketAvailability, Species, VerificationGrade } from '../intelligence/types';

export type VerifiedProductSort = 'confidence' | 'price_per_kg' | 'suitability_score';

export interface VerifiedProductListQuery {
  page: number;
  pageSize: number;
  species?: Species;
  life_stage?: LifeStage;
  need_code?: NeedProfileCode;
  trust_grade?: VerificationGrade;
  market_availability?: MarketAvailability;
  sort?: VerifiedProductSort;
}

export interface VerifiedProductListItem {
  product_id: string;
  slug: string;
  product_name: string;
  brand_name: string;
  species: Species;
  life_stage: LifeStage;
  market_availability: MarketAvailability;
  trust_grade: VerificationGrade;
  confidence: number;
  quick_verdict: string;
  strengths: string[];
  best_for: string[];
  considerations: string[];
  price_from: number;
  unit_price_per_kg: number;
  primary_image_url: string;
  source_count: number;
  suitability_score?: number;
  suitability_grade?: SuitabilityResult['grade'];
}

export interface VerifiedProductDetailResponse {
  identity: {
    product_id: string;
    slug: string;
    product_name: string;
    brand_name: string;
    species: Species;
    life_stage: LifeStage;
    market_availability: MarketAvailability;
  };
  quick_verdict: string;
  strengths: string[];
  considerations: string[];
  best_for: string[];
  avoid_if: string[];
  suitability_results: SuitabilityResult[];
  nutrition_profile: Record<string, number>;
  ingredient_profile: {
    normalized_ingredients: string[];
    controversial_ingredients: string[];
    suitability_tags: string[];
  };
  retail_offers: Array<{
    retailer: string;
    price_aud: number;
    unit_price_per_kg: number;
    source_url: string;
  }>;
  evidence_refs: EvidenceRef[];
  confidence: number;
  trust_grade: VerificationGrade;
  market_availability: MarketAvailability;
  image_metadata: Array<{
    image_url: string;
    source_url: string;
    source_type: 'MANUAL' | 'RETAILER' | 'OFFICIAL' | 'OPFF';
    alt_text: string;
  }>;
  disclaimer_flags: {
    disclaimer_required: boolean;
    medical_caution: boolean;
    text?: string;
  };
}

export interface CompareReadyProductResponse {
  product_id: string;
  slug: string;
  product_name: string;
  brand_name: string;
  trust_grade: VerificationGrade;
  confidence: number;
  protein: number;
  fat: number;
  fiber: number;
  calories: number;
  price_per_kg: number;
  suitability_summary: {
    score?: number;
    grade?: SuitabilityResult['grade'];
    reasons: string[];
    cautions: string[];
  };
}
