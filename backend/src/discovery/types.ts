export type DiscoverySourceType = 'retailer' | 'official' | 'OPFF';

export type DiscoveryMarketAvailability = 'ACTIVE' | 'LIMITED' | 'DISCONTINUED';

export type DiscoverySpecies = 'CAT';

export type RetailerCode = 'pet-circle' | 'petbarn' | 'petstock' | 'my-pet-warehouse';

export interface RobotsComplianceResult {
  source: string;
  robots_url: string;
  checked_at: string;
  allowed: boolean;
  reason: string;
}

export interface ProductImageMetadata {
  image_url: string;
  source_url: string;
  source_type: DiscoverySourceType;
  retailer?: string;
  width?: number;
  height?: number;
  alt_text?: string;
  metadata?: Record<string, unknown>;
}

export interface DiscoveredProduct {
  external_id: string;
  product_key: string;
  product_name: string;
  brand: string;
  species: DiscoverySpecies;
  life_stage: string;
  pack_size: string;
  pack_size_g?: number;
  price_aud?: number;
  source_url: string;
  source_type: DiscoverySourceType;
  retailer: string;
  market_availability: DiscoveryMarketAvailability;
  image_url?: string;
  images: ProductImageMetadata[];
  metadata: Record<string, unknown>;
  discovered_at: string;
}

export interface RetailerDiscoveryConfig {
  code: RetailerCode;
  name: string;
  base_url: string;
  robots_url: string;
  source_type: 'retailer';
  category_urls: string[];
  product_url_patterns: RegExp[];
}

export interface DiscoveryRunResult {
  products: DiscoveredProduct[];
  robots: RobotsComplianceResult[];
  total_discovered: number;
  duplicates_removed: number;
  sources_checked: string[];
}
