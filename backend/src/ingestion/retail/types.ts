import { CanonicalMatchResult, PromotionType, StockStatus } from '../../price-comparison/types';

export type IngestionStatus =
  | 'INGESTED'
  | 'ROBOTS_DISALLOWED'
  | 'FETCH_TIMEOUT'
  | 'FETCH_BLOCKED'
  | 'PARSE_FAILED'
  | 'CANONICAL_MISSING'
  | 'LOW_CONFIDENCE_MATCH'
  | 'PACK_SIZE_CONFLICT'
  | 'PRICE_MISSING'
  | 'STOCK_UNKNOWN'
  | 'SKIPPED';

export interface RetailIngestionConfig {
  userAgent: string;
  timeoutMs: number;
  retryCount: number;
  delayMs: number;
  minimumWriteConfidence: number;
}

export interface RobotsCheckResult {
  allowed: boolean;
  robotsUrl: string;
  reason: string;
}

export interface FetchResult {
  status: number;
  url: string;
  body: string;
  contentType?: string;
}

export interface ParsedRetailOffer {
  retailer_name: string;
  retailer_slug: string;
  product_url: string;
  retailer_product_title: string;
  brand_name: string;
  product_name: string;
  pack_size_g: number;
  base_price: number;
  sale_price?: number;
  member_price?: number;
  coupon_price?: number;
  promotion_text?: string;
  promotion_type?: PromotionType;
  stock_status: StockStatus;
  image_url?: string;
  captured_at: string;
  market: 'AU';
  currency: 'AUD';
}

export interface PetstockPilotManifestItem {
  retailer: 'petstock';
  market: 'AU';
  currency: 'AUD';
  product_url: string;
  expected_brand?: string;
  expected_pack_size_g?: number;
  expected_canonical_slug?: string;
  notes?: string;
}

export interface PetbarnPilotManifestItem {
  retailer: 'petbarn';
  market: 'AU';
  currency: 'AUD';
  product_url: string;
  expected_brand?: string;
  expected_pack_size_g?: number;
  expected_canonical_slug?: string;
  notes?: string;
}

export type RetailPilotManifestItem = PetstockPilotManifestItem | PetbarnPilotManifestItem;

export interface RetailIngestionReport {
  status: IngestionStatus;
  product_url: string;
  retailer_slug: string;
  message: string;
  retailer_product_title?: string;
  parsed_brand?: string;
  parsed_pack_size_g?: number;
  parsed_price?: number;
  canonical_slug?: string;
  match_confidence?: number;
  match_reasons?: string[];
  match_warnings?: string[];
  parsed_successfully?: boolean;
  canonical_matched?: boolean;
  offer_written?: boolean;
  snapshot_written?: boolean;
  parsed?: ParsedRetailOffer;
  canonical_match?: CanonicalMatchResult;
  retail_offer_id?: number;
  snapshot_created?: boolean;
}

export interface RetailIngestionSummary {
  urls_processed: number;
  ingested_count: number;
  skipped_count: number;
  parse_success_count: number;
  parse_success_rate: number;
  canonical_match_success_count: number;
  canonical_match_success_rate: number;
  offers_written: number;
  snapshots_written: number;
  pack_size_conflicts: number;
  canonical_missing_count: number;
  low_confidence_count: number;
  by_status: Record<IngestionStatus, number>;
}

export interface RetailIngestionDbCoverage {
  retail_offers_count: number;
  price_snapshots_count: number;
  petstock_active_offers_count: number;
  canonical_products_with_petstock_offer_count: number;
  petbarn_active_offers_count?: number;
  canonical_products_with_petbarn_offer_count?: number;
}

export interface RetailIngestionRunResult {
  manifest_path?: string;
  reports: RetailIngestionReport[];
  summary: RetailIngestionSummary;
  db_coverage?: RetailIngestionDbCoverage;
}
