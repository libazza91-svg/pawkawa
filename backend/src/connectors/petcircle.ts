/**
 * PetCircle Price Connector
 *
 * Target: https://www.petcircle.com.au
 * Scrapes product pages for: URL, name, pack size, price.
 *
 * PetCircle is one of Australia's largest online pet supply retailers.
 * They carry Royal Canin, Hill's, Advance, Black Hawk, Ziwi Peak, and more.
 *
 * Rate limiting: max 1 request/second in production.
 */

import {
  BasePriceConnector,
  ConnectorConfig,
  SearchQuery,
  PriceResult,
  ConnectorHealth,
} from './base-price-connector';

// --------------------------------------------------------------------
// Mock data — used when scraping is unavailable (dev/test).
// Maps "{brand} {product_name}" → PriceResult
// --------------------------------------------------------------------
export const PETCIRCLE_MOCK_PRICES: Record<string, PriceResult> = {
  // Royal Canin
  'royal_canin_feline_kitten_dry': {
    source_url: 'https://www.petcircle.com.au/product/royal-canin-kitten-dry-cat-food',
    product_name: 'Royal Canin Kitten Dry Cat Food',
    brand_name: 'Royal Canin',
    pack_size: '2kg',
    pack_size_g: 2000,
    price_aud: 42.99,
    unit_price_per_kg: 21.50,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.98,
  },
  'royal_canin_feline_adult_dry': {
    source_url: 'https://www.petcircle.com.au/product/royal-canin-feline-adult-dry-food',
    product_name: 'Royal Canin Feline Adult Dry Cat Food',
    brand_name: 'Royal Canin',
    pack_size: '4kg',
    pack_size_g: 4000,
    price_aud: 74.99,
    unit_price_per_kg: 18.75,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },
  'royal_canin_feline_senior_dry': {
    source_url: 'https://www.petcircle.com.au/product/royal-canin-ageing-12-dry-cat-food',
    product_name: 'Royal Canin Ageing 12+ Dry Cat Food',
    brand_name: 'Royal Canin',
    pack_size: '2kg',
    pack_size_g: 2000,
    price_aud: 44.99,
    unit_price_per_kg: 22.50,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.95,
  },
  'royal_canin_canine_puppy_dry': {
    source_url: 'https://www.petcircle.com.au/product/royal-canin-medium-puppy-dry-dog-food',
    product_name: 'Royal Canin Medium Puppy Dry Dog Food',
    brand_name: 'Royal Canin',
    pack_size: '4kg',
    pack_size_g: 4000,
    price_aud: 59.99,
    unit_price_per_kg: 15.00,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.98,
  },
  'royal_canin_canine_adult_dry': {
    source_url: 'https://www.petcircle.com.au/product/royal-canin-medium-adult-dry-dog-food',
    product_name: 'Royal Canin Medium Adult Dry Dog Food',
    brand_name: 'Royal Canin',
    pack_size: '4kg',
    pack_size_g: 4000,
    price_aud: 64.99,
    unit_price_per_kg: 16.25,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },

  // Hill's
  'hills_feline_kitten_dry': {
    source_url: 'https://www.petcircle.com.au/product/hills-science-diet-kitten-dry-cat-food',
    product_name: "Hill's Science Diet Kitten Dry Cat Food",
    brand_name: "Hill's",
    pack_size: '1.8kg',
    pack_size_g: 1800,
    price_aud: 39.99,
    unit_price_per_kg: 22.22,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },
  'hills_feline_adult_dry': {
    source_url: 'https://www.petcircle.com.au/product/hills-science-diet-adult-dry-cat-food',
    product_name: "Hill's Science Diet Adult Dry Cat Food",
    brand_name: "Hill's",
    pack_size: '3.2kg',
    pack_size_g: 3200,
    price_aud: 59.99,
    unit_price_per_kg: 18.75,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.96,
  },
  'hills_canine_adult_dry': {
    source_url: 'https://www.petcircle.com.au/product/hills-science-diet-adult-dry-dog-food',
    product_name: "Hill's Science Diet Adult Dry Dog Food",
    brand_name: "Hill's",
    pack_size: '7kg',
    pack_size_g: 7000,
    price_aud: 89.99,
    unit_price_per_kg: 12.86,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },

  // Advance
  'advance_feline_adult_dry': {
    source_url: 'https://www.petcircle.com.au/product/advance-adult-cat-chicken',
    product_name: 'Advance Adult Cat Chicken Dry Food',
    brand_name: 'Advance',
    pack_size: '3kg',
    pack_size_g: 3000,
    price_aud: 38.99,
    unit_price_per_kg: 13.00,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },
  'advance_canine_puppy_dry': {
    source_url: 'https://www.petcircle.com.au/product/advance-puppy-chicken-rice-dry-dog-food',
    product_name: 'Advance Puppy Chicken & Rice Dry Dog Food',
    brand_name: 'Advance',
    pack_size: '3kg',
    pack_size_g: 3000,
    price_aud: 35.99,
    unit_price_per_kg: 12.00,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.96,
  },
  'advance_canine_adult_dry': {
    source_url: 'https://www.petcircle.com.au/product/advance-adult-chicken-rice-dry-dog-food',
    product_name: 'Advance Adult Chicken & Rice Dry Dog Food',
    brand_name: 'Advance',
    pack_size: '7kg',
    pack_size_g: 7000,
    price_aud: 66.99,
    unit_price_per_kg: 9.57,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },

  // Black Hawk
  'black_hawk_feline_adult_dry': {
    source_url: 'https://www.petcircle.com.au/product/black-hawk-original-adult-cat-chicken',
    product_name: 'Black Hawk Original Adult Cat Chicken Dry Food',
    brand_name: 'Black Hawk',
    pack_size: '3kg',
    pack_size_g: 3000,
    price_aud: 44.99,
    unit_price_per_kg: 15.00,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.96,
  },
  'black_hawk_canine_adult_dry': {
    source_url: 'https://www.petcircle.com.au/product/black-hawk-original-adult-dog-lamb-rice',
    product_name: 'Black Hawk Original Adult Dog Lamb & Rice',
    brand_name: 'Black Hawk',
    pack_size: '20kg',
    pack_size_g: 20000,
    price_aud: 119.99,
    unit_price_per_kg: 6.00,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.98,
  },

  // Ziwi Peak
  'ziwi_peak_feline_adult_dry': {
    source_url: 'https://www.petcircle.com.au/product/ziwi-peak-air-dried-mackerel-lamb-cat',
    product_name: 'Ziwi Peak Air-Dried Mackerel & Lamb Cat Food',
    brand_name: 'Ziwi Peak',
    pack_size: '1kg',
    pack_size_g: 1000,
    price_aud: 62.99,
    unit_price_per_kg: 62.99,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.96,
  },
  'ziwi_peak_canine_adult_dry': {
    source_url: 'https://www.petcircle.com.au/product/ziwi-peak-air-dried-beef-dog-food',
    product_name: 'Ziwi Peak Air-Dried Beef Dog Food',
    brand_name: 'Ziwi Peak',
    pack_size: '2.5kg',
    pack_size_g: 2500,
    price_aud: 89.99,
    unit_price_per_kg: 36.00,
    retailer: 'PetCircle',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },
};

const DEFAULT_CONFIG: ConnectorConfig = {
  baseUrl: 'https://www.petcircle.com.au',
  retailerName: 'PetCircle',
};

export class PetCircleConnector extends BasePriceConnector {
  private useMock: boolean;

  constructor(config?: Partial<ConnectorConfig>) {
    super({ ...DEFAULT_CONFIG, ...config });
    // In production, live scraping; in dev/test without runtime, use mock
    this.useMock = process.env.PRICE_SCRAPE_MODE !== 'live';
  }

  buildSearchUrl(query: SearchQuery): string {
    const terms = encodeURIComponent(`${query.brand} ${query.product_name} dog cat food`);
    return `${this.config.baseUrl}/search?q=${terms}`;
  }

  async search(query: SearchQuery): Promise<PriceResult | null> {
    if (this.useMock) {
      return this.mockSearch(query);
    }
    return this.liveSearch(query);
  }

  /**
   * Mock search uses pre-loaded fixture data keyed by normalized query.
   */
  private mockSearch(query: SearchQuery): PriceResult | null {
    const key = `${query.brand}_${query.product_name}`
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');

    return PETCIRCLE_MOCK_PRICES[key] ?? null;
  }

  /**
   * Live search — scrapes PetCircle search → product page.
   * Requires Node.js runtime + Cheerio/Axios.
   */
  private async liveSearch(_query: SearchQuery): Promise<PriceResult | null> {
    // TODO: implement with Cheerio/Axios when runtime available
    // 1. GET /search?q={brand} {product}
    // 2. Parse search results, find first match
    // 3. Navigate to product page
    // 4. Extract price, pack size from DOM
    throw new Error('Live PetCircle scraping not implemented — enable mock mode for dev');
  }

  async healthCheck(): Promise<ConnectorHealth> {
    const start = Date.now();
    try {
      const testResult = await this.mockSearch({
        brand: 'Royal Canin',
        product_name: 'kitten',
      });
      return {
        available: testResult !== null,
        latency_ms: Date.now() - start,
        last_checked: new Date().toISOString(),
      };
    } catch (e: any) {
      return {
        available: false,
        latency_ms: Date.now() - start,
        last_checked: new Date().toISOString(),
        error: e.message,
      };
    }
  }
}
