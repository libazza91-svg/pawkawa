import type { LifeStage, Product, Species, VerificationGrade } from './data';

export type RouteName = 'landing' | 'search' | 'product' | 'compare' | 'brand';

export type RouteState = {
  name: RouteName;
  slug?: string;
};

export type Filters = {
  keyword: string;
  brand: string;
  species: 'All Species' | Species;
  lifeStage: 'All Life Stages' | LifeStage;
  grade: 'All Grades' | VerificationGrade;
  maxPrice: number;
};

export type ProductInsight = {
  product_id: string;
  quick_verdict: string;
  strengths: string[];
  considerations: string[];
  best_for: string[];
  avoid_if: string[];
  confidence: number;
  trust_grade: VerificationGrade;
};

export type RecommendationContext = {
  constraints: Array<{ code: string; label: string; type: 'PREFER' | 'AVOID' | 'REQUIRES_VET'; reason: string }>;
  recommendations: Array<{ product_id: string; product_slug: string; product_name: string; suitability_score: number; reasons: string[]; cautions: string[] }>;
  warnings: string[];
};

export type ProductListResponse = {
  items: Array<{
    product_id: number;
    name: string;
    slug: string;
    brand_name: string | null;
    species: 'CAT' | 'DOG' | null;
    life_stage: string | null;
    confidence: number;
    trust_grade: VerificationGrade;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type CompareResponse = {
  products: Array<{
    product_id: number;
    slug: string;
    product_name: string;
    brand_name: string;
    species: 'CAT' | 'DOG' | null;
    life_stage: string | null;
    format: string | null;
    origin: string | null;
    confidence: number;
    trust_grade: VerificationGrade;
    market_availability: 'ACTIVE' | 'LIMITED' | 'DISCONTINUED';
  }>;
  comparison: {
    nutritionTable: Array<Record<string, string | null>>;
    ingredientSets: Array<{ product_id: number; product_name: string; ingredients: string[] }>;
    priceComparison: Array<{
      product_id: number;
      product_name: string;
      retailers: Array<{ retailer: string | null; price_aud: string; unit_price_aud_per_kg: string | null }>;
    }>;
  };
};

export type CompareRecommendationResponse = RecommendationContext & {
  disclaimer?: string;
};

export type RecoveryTopic = {
  id: string;
  title: string;
  owner_summary: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type CompareTableProduct = Product;
