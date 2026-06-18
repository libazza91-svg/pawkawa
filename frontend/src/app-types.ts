import type { LifeStage, Product, Species, VerificationGrade } from './data';

export type RouteName = 'landing' | 'search' | 'product' | 'price' | 'compare' | 'brand' | 'learn' | 'about';

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

export type VerifiedProductListItem = {
  product_id: string;
  slug: string;
  product_name: string;
  brand_name: string;
  species: 'CAT' | 'DOG';
  life_stage: 'KITTEN' | 'PUPPY' | 'ADULT' | 'SENIOR' | 'ALL_LIFE_STAGES';
  market_availability: 'ACTIVE' | 'LIMITED' | 'DISCONTINUED';
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
  suitability_grade?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'CAUTION';
};

export type VerifiedProductListResponse = {
  items: VerifiedProductListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type VerifiedProductDetailResponse = {
  identity: {
    product_id: string;
    slug: string;
    product_name: string;
    brand_name: string;
    species: 'CAT' | 'DOG';
    life_stage: 'KITTEN' | 'PUPPY' | 'ADULT' | 'SENIOR' | 'ALL_LIFE_STAGES';
    market_availability: 'ACTIVE' | 'LIMITED' | 'DISCONTINUED';
  };
  quick_verdict: string;
  strengths: string[];
  considerations: string[];
  best_for: string[];
  avoid_if: string[];
  suitability_results: Array<{
    need_code: string;
    score: number;
    grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'CAUTION';
    matched_reasons: string[];
    caution_reasons: string[];
    evidence_refs: Array<{ id: string; label: string; source_type: string; source_url?: string; checked_at?: string }>;
    disclaimer_required: boolean;
  }>;
  nutrition_profile: Product['nutrition'];
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
  evidence_refs: Array<{ id: string; label: string; source_type: string; source_url?: string; checked_at?: string }>;
  confidence: number;
  trust_grade: VerificationGrade;
  market_availability: 'ACTIVE' | 'LIMITED' | 'DISCONTINUED';
  image_metadata: Array<{ image_url: string; source_url: string; source_type: string; alt_text: string }>;
  disclaimer_flags: {
    disclaimer_required: boolean;
    medical_caution: boolean;
    text?: string;
  };
};

export type MarketRegion = 'AU' | 'NZ';
export type CurrencyCode = 'AUD' | 'NZD';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
export type PromotionType = 'SALE' | 'MEMBER_PRICE' | 'COUPON' | 'MULTIBUY' | 'FREE_SHIPPING' | 'OTHER';

export type MarketConfig = {
  market: MarketRegion;
  currency: CurrencyCode;
  enabled: boolean;
  default_retailers: string[];
  status: 'ENABLED' | 'LIMITED' | 'PENDING';
};

export type MarketsResponse = {
  markets: MarketConfig[];
  default_market: MarketRegion;
  selection_policy: string;
};

export type PriceSearchResult = {
  product_id: string;
  slug: string;
  product_name: string;
  brand_name: string;
  primary_image_url?: string;
  pack_sizes: number[];
  lowest_effective_price: number | null;
  lowest_unit_price_per_kg: number | null;
  best_retailer: string | null;
  offer_count: number;
  market: MarketRegion;
  currency: CurrencyCode;
};

export type PriceSearchResponse = {
  items: PriceSearchResult[];
};

export type RetailOffer = {
  product_id: string;
  product_slug: string;
  product_name: string;
  brand_name: string;
  retailer_name: string;
  retailer_slug: string;
  market: MarketRegion;
  currency: CurrencyCode;
  product_url: string;
  pack_size_g: number;
  base_price: number;
  sale_price?: number;
  member_price?: number;
  coupon_price?: number;
  conditional_best_price?: number;
  conditional_price_reason?: string;
  effective_price: number;
  unit_price_per_kg: number;
  stock_status: StockStatus;
  promotion_text?: string;
  promotion_type?: PromotionType;
  coupon_code?: string;
  minimum_spend?: number;
  shipping_threshold?: number;
  last_checked_at: string;
  primary_image_url?: string;
};

export type PriceComparisonResponse = {
  product: {
    product_id: string;
    slug: string;
    product_name: string;
    brand_name: string;
    species: 'CAT';
    pack_size_g: number;
    primary_image_url?: string;
    formula_tokens: string[];
    flavour_tokens: string[];
  };
  market: MarketRegion;
  currency: CurrencyCode;
  best_price_today: number | null;
  best_retailer: string | null;
  lowest_unit_price_per_kg: number | null;
  offer_count: number;
  last_checked_summary: string;
  offers: RetailOffer[];
  secondary: {
    nutrition: Product['nutrition'] | null;
    ingredients: string[];
    suitability: string[];
    evidence: unknown[];
  };
};

export type RecommendationContext = {
  constraints: Array<{ code: string; label: string; type: 'PREFER' | 'AVOID' | 'REQUIRES_VET'; reason: string }>;
  recommendations: Array<{ product_id: string; product_slug: string; product_name: string; suitability_score: number; reasons: string[]; cautions: string[] }>;
  warnings: string[];
};

export type ProductListResponse = {
  items: Array<{
    product_id: number | string;
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
