export type MarketRegion = 'AU' | 'NZ';
export type CurrencyCode = 'AUD' | 'NZD';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
export type PromotionType = 'SALE' | 'MEMBER_PRICE' | 'COUPON' | 'MULTIBUY' | 'FREE_SHIPPING' | 'OTHER';

export interface MarketConfig {
  market: MarketRegion;
  currency: CurrencyCode;
  enabled: boolean;
  default_retailers: string[];
  status: 'ENABLED' | 'LIMITED' | 'PENDING';
}

export interface RetailOfferInput {
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
  coupon_unconditional?: boolean;
  member_price_unconditional?: boolean;
  stock_status: StockStatus;
  promotion_text?: string;
  promotion_type?: PromotionType;
  coupon_code?: string;
  minimum_spend?: number;
  shipping_threshold?: number;
  last_checked_at: string;
  primary_image_url?: string;
  metadata?: Record<string, unknown>;
}

export interface RetailOffer extends RetailOfferInput {
  effective_price: number;
  unit_price_per_kg: number;
  conditional_best_price?: number;
  conditional_price_reason?: string;
}

export interface CanonicalProduct {
  product_id: string;
  slug: string;
  product_name: string;
  brand_name: string;
  species: 'CAT';
  pack_size_g: number;
  primary_image_url?: string;
  formula_tokens: string[];
  flavour_tokens: string[];
}

export interface CanonicalMatchResult {
  canonical_product: CanonicalProduct;
  match_confidence: number;
  match_reasons: string[];
  match_warnings: string[];
}

export interface ProductSearchResult {
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
}

export interface ProductOffersResponse {
  product: CanonicalProduct;
  market: MarketRegion;
  currency: CurrencyCode;
  offers: RetailOffer[];
}

export interface PriceComparisonResponse {
  product: CanonicalProduct;
  market: MarketRegion;
  currency: CurrencyCode;
  best_price_today: number | null;
  best_retailer: string | null;
  lowest_unit_price_per_kg: number | null;
  offer_count: number;
  last_checked_summary: string;
  offers: RetailOffer[];
  secondary: {
    nutrition: Record<string, number> | null;
    ingredients: string[];
    suitability: string[];
    evidence: unknown[];
  };
}
