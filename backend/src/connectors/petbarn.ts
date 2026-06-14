/**
 * Petbarn Price Connector
 *
 * Target: https://www.petbarn.com.au
 * Scrapes product pages for: URL, name, pack size, price.
 *
 * Petbarn is Australia's largest brick-and-mortar + online pet retailer,
 * carrying premium brands including Royal Canin wholesale exclusives.
 */

import {
  BasePriceConnector,
  ConnectorConfig,
  SearchQuery,
  PriceResult,
  ConnectorHealth,
} from './base-price-connector';

// --------------------------------------------------------------------
// Mock data — 15 products with realistic Petbarn pricing.
// Petbarn tends to be slightly cheaper than PetCircle on bulk sizes.
// --------------------------------------------------------------------
export const PETBARN_MOCK_PRICES: Record<string, PriceResult> = {
  // Royal Canin (Petbarn prices typically $1-3 cheaper than PetCircle)
  'royal_canin_feline_kitten_dry': {
    source_url: 'https://www.petbarn.com.au/royal-canin-kitten-dry-cat-food',
    product_name: 'Royal Canin Kitten Dry Cat Food',
    brand_name: 'Royal Canin',
    pack_size: '2kg',
    pack_size_g: 2000,
    price_aud: 41.99,
    unit_price_per_kg: 21.00,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.98,
  },
  'royal_canin_feline_adult_dry': {
    source_url: 'https://www.petbarn.com.au/royal-canin-feline-adult-dry-food',
    product_name: 'Royal Canin Feline Adult Dry Cat Food',
    brand_name: 'Royal Canin',
    pack_size: '4kg',
    pack_size_g: 4000,
    price_aud: 72.99,
    unit_price_per_kg: 18.25,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },
  'royal_canin_feline_senior_dry': {
    source_url: 'https://www.petbarn.com.au/royal-canin-ageing-12-dry-cat-food',
    product_name: 'Royal Canin Ageing 12+ Dry Cat Food',
    brand_name: 'Royal Canin',
    pack_size: '2kg',
    pack_size_g: 2000,
    price_aud: 44.50,
    unit_price_per_kg: 22.25,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.95,
  },
  'royal_canin_canine_puppy_dry': {
    source_url: 'https://www.petbarn.com.au/royal-canin-medium-puppy-dry-dog-food',
    product_name: 'Royal Canin Medium Puppy Dry Dog Food',
    brand_name: 'Royal Canin',
    pack_size: '4kg',
    pack_size_g: 4000,
    price_aud: 57.99,
    unit_price_per_kg: 14.50,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },
  'royal_canin_canine_adult_dry': {
    source_url: 'https://www.petbarn.com.au/royal-canin-medium-adult-dry-dog-food',
    product_name: 'Royal Canin Medium Adult Dry Dog Food',
    brand_name: 'Royal Canin',
    pack_size: '4kg',
    pack_size_g: 4000,
    price_aud: 63.50,
    unit_price_per_kg: 15.88,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.96,
  },

  // Hill's (Petbarn matches PetCircle closely on Hill's)
  'hills_feline_kitten_dry': {
    source_url: 'https://www.petbarn.com.au/hills-science-diet-kitten-dry-cat-food',
    product_name: "Hill's Science Diet Kitten Dry Cat Food",
    brand_name: "Hill's",
    pack_size: '1.8kg',
    pack_size_g: 1800,
    price_aud: 39.99,
    unit_price_per_kg: 22.22,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.96,
  },
  'hills_feline_adult_dry': {
    source_url: 'https://www.petbarn.com.au/hills-science-diet-adult-dry-cat-food',
    product_name: "Hill's Science Diet Adult Dry Cat Food",
    brand_name: "Hill's",
    pack_size: '3.2kg',
    pack_size_g: 3200,
    price_aud: 61.99,
    unit_price_per_kg: 19.37,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.95,
  },

  // Advance (Petbarn often cheaper on Advance)
  'advance_feline_adult_dry': {
    source_url: 'https://www.petbarn.com.au/advance-adult-cat-chicken-dry-food',
    product_name: 'Advance Adult Cat Chicken Dry Food',
    brand_name: 'Advance',
    pack_size: '3kg',
    pack_size_g: 3000,
    price_aud: 36.99,
    unit_price_per_kg: 12.33,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.96,
  },
  'advance_canine_puppy_dry': {
    source_url: 'https://www.petbarn.com.au/advance-puppy-chicken-rice-dry-dog-food',
    product_name: 'Advance Puppy Chicken & Rice Dry Dog Food',
    brand_name: 'Advance',
    pack_size: '3kg',
    pack_size_g: 3000,
    price_aud: 34.99,
    unit_price_per_kg: 11.66,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },
  'advance_canine_adult_dry': {
    source_url: 'https://www.petbarn.com.au/advance-adult-chicken-rice-dry-dog-food',
    product_name: 'Advance Adult Chicken & Rice Dry Dog Food',
    brand_name: 'Advance',
    pack_size: '7kg',
    pack_size_g: 7000,
    price_aud: 63.99,
    unit_price_per_kg: 9.14,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.97,
  },

  // Black Hawk
  'black_hawk_feline_adult_dry': {
    source_url: 'https://www.petbarn.com.au/black-hawk-original-adult-cat-chicken',
    product_name: 'Black Hawk Original Adult Cat Chicken Dry Food',
    brand_name: 'Black Hawk',
    pack_size: '3kg',
    pack_size_g: 3000,
    price_aud: 44.50,
    unit_price_per_kg: 14.83,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.96,
  },
  'black_hawk_canine_adult_dry': {
    source_url: 'https://www.petbarn.com.au/black-hawk-original-adult-dog-lamb-rice',
    product_name: 'Black Hawk Original Adult Dog Lamb & Rice',
    brand_name: 'Black Hawk',
    pack_size: '20kg',
    pack_size_g: 20000,
    price_aud: 117.99,
    unit_price_per_kg: 5.90,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.98,
  },

  // Ziwi Peak (Petbarn often slightly cheaper on premium)
  'ziwi_peak_feline_adult_dry': {
    source_url: 'https://www.petbarn.com.au/ziwi-peak-air-dried-mackerel-lamb-cat',
    product_name: 'Ziwi Peak Air-Dried Mackerel & Lamb Cat Food',
    brand_name: 'Ziwi Peak',
    pack_size: '1kg',
    pack_size_g: 1000,
    price_aud: 59.99,
    unit_price_per_kg: 59.99,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.95,
  },

  // Royal Canin Canine Senior — Petbarn exclusive
  'royal_canin_canine_senior_dry': {
    source_url: 'https://www.petbarn.com.au/royal-canin-medium-ageing-10-dry-dog-food',
    product_name: 'Royal Canin Medium Ageing 10+ Dry Dog Food',
    brand_name: 'Royal Canin',
    pack_size: '4kg',
    pack_size_g: 4000,
    price_aud: 62.99,
    unit_price_per_kg: 15.75,
    retailer: 'Petbarn',
    last_checked: '2026-06-13T10:00:00Z',
    match_confidence: 0.96,
  },
};

const DEFAULT_CONFIG: ConnectorConfig = {
  baseUrl: 'https://www.petbarn.com.au',
  retailerName: 'Petbarn',
};

export class PetbarnConnector extends BasePriceConnector {
  private useMock: boolean;

  constructor(config?: Partial<ConnectorConfig>) {
    super({ ...DEFAULT_CONFIG, ...config });
    this.useMock = process.env.PRICE_SCRAPE_MODE !== 'live';
  }

  buildSearchUrl(query: SearchQuery): string {
    const terms = encodeURIComponent(`${query.brand} ${query.product_name}`);
    return `${this.config.baseUrl}/search?q=${terms}`;
  }

  async search(query: SearchQuery): Promise<PriceResult | null> {
    if (this.useMock) {
      return this.mockSearch(query);
    }
    return this.liveSearch(query);
  }

  private mockSearch(query: SearchQuery): PriceResult | null {
    const key = `${query.brand}_${query.product_name}`
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');

    return PETBARN_MOCK_PRICES[key] ?? null;
  }

  private async liveSearch(_query: SearchQuery): Promise<PriceResult | null> {
    throw new Error('Live Petbarn scraping not implemented — enable mock mode for dev');
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
