/**
 * Base Price Connector — abstract class for retailer price scraping.
 * PetCircle + Petbarn extend this.
 *
 * Sprint 1.3C - P1
 */

export interface PriceResult {
  /** Retailer product page URL */
  source_url: string;
  /** Product name as listed on retailer */
  product_name: string;
  /** Brand name as listed on retailer */
  brand_name: string;
  /** Pack size string e.g. "2.5kg", "12x85g" */
  pack_size: string;
  /** Pack size in grams (parsed) */
  pack_size_g: number;
  /** Price in AUD */
  price_aud: number;
  /** Unit price per kg */
  unit_price_per_kg: number;
  /** Retailer name */
  retailer: string;
  /** Timestamp of price capture */
  last_checked: string;
  /** Match confidence vs search query (0-1) */
  match_confidence: number;
}

export interface ConnectorConfig {
  /** Base URL of the retailer */
  baseUrl: string;
  /** Retailer name for DB identification */
  retailerName: string;
  /** User-Agent header override */
  userAgent?: string;
  /** Request timeout in ms */
  timeout?: number;
}

export interface SearchQuery {
  brand: string;
  product_name: string;
  species?: 'CAT' | 'DOG';
  pack_size_hint?: string; // "2kg", "12x85g"
}

export interface ConnectorHealth {
  available: boolean;
  latency_ms: number;
  last_checked: string;
  error?: string;
}

export abstract class BasePriceConnector {
  protected config: ConnectorConfig;

  constructor(config: ConnectorConfig) {
    this.config = {
      userAgent: 'PetFoodCompare.au/1.0 (price-indexing-bot)',
      timeout: 15000,
      ...config,
    };
  }

  /**
   * Search for a product on the retailer and return price data.
   * Returns null if no matching product found.
   */
  abstract search(query: SearchQuery): Promise<PriceResult | null>;

  /**
   * Check connector health (site reachable, search working).
   */
  abstract healthCheck(): Promise<ConnectorHealth>;

  /**
   * Get the retailer name this connector targets.
   */
  get retailerName(): string {
    return this.config.retailerName;
  }

  /**
   * Normalize a pack size string to grams
   *
   * Examples:
   *   "2.5kg" → 2500
   *   "12x85g" → 1020 (12 × 85)
   *   "340g" → 340
   *   "1.2kg" → 1200
   */
  protected parsePackSizeToGrams(packSize: string): number {
    const cleaned = packSize.toLowerCase().trim();

    // Multi-pack: "12x85g" / "12 x 85g"
    const multiMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*g/);
    if (multiMatch) {
      return Math.round(parseFloat(multiMatch[1]) * parseFloat(multiMatch[2]));
    }

    // kg
    const kgMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*kg/);
    if (kgMatch) {
      return Math.round(parseFloat(kgMatch[1]) * 1000);
    }

    // g
    const gMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*g/);
    if (gMatch) {
      return Math.round(parseFloat(gMatch[1]));
    }

    return 0;
  }

  /**
   * Calculate unit price per kg from price and pack size
   */
  protected calculateUnitPrice(priceAud: number, packSizeG: number): number {
    if (packSizeG <= 0) return 0;
    return Math.round((priceAud / packSizeG * 1000) * 100) / 100;
  }

  /**
   * Build a search URL for the retailer
   */
  abstract buildSearchUrl(query: SearchQuery): string;
}
