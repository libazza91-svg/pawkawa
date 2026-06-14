/**
 * Price Pipeline Integration
 *
 * Orchestrates Phase 1-4 execution:
 *   1. PetCircle search → raw prices
 *   2. Petbarn search → raw prices
 *   3. Normalize all prices → standardized units
 *   4. Verify cross-source → verification status + market_availability
 *   5. Generate dashboard metrics
 *
 * Usage (Node.js):
 *   const pipeline = new PricePipeline();
 *   await pipeline.run(seedProducts);
 *
 * Usage (Python test — no runtime):
 *   from price_pipeline_test import run_pipeline_test
 *   run_pipeline_test()
 */

import { PetCircleConnector } from './petcircle';
import { PetbarnConnector } from './petbarn';
import { PriceNormalizer, NormalizedPrice } from './price-normalizer';
import { PriceVerifier, VerificationResult, BatchVerificationResult } from './price-verifier';
import { computePriceMetrics, generateDashboardPayload, PriceMetrics } from './price-dashboard';
import { PriceResult, SearchQuery } from './base-price-connector';

export interface SeedProduct {
  brand: string;
  product_name: string;
  species?: 'CAT' | 'DOG';
  productKey: string;
}

export interface PipelineResult {
  /** Raw search results per source */
  raw: {
    petcircle: Map<string, PriceResult | null>;
    petbarn: Map<string, PriceResult | null>;
  };
  /** Normalized prices (both sources merged) */
  normalized: {
    ok: NormalizedPrice[];
    rejected: { price: PriceResult; reason: string }[];
    coverage: number; // % of seed products with any price
  };
  /** Verification results */
  verification: BatchVerificationResult;
  /** Market availability per product */
  marketAvailability: Map<string, 'ACTIVE' | 'LIMITED' | 'DISCONTINUED'>;
  /** Dashboard metrics */
  metrics: PriceMetrics;
  /** Dashboard JSON payload */
  dashboardPayload: Record<string, any>;
  /** Summary text for reporting */
  summary: string;
}

export class PricePipeline {
  private petcircle: PetCircleConnector;
  private petbarn: PetbarnConnector;
  private normalizer: PriceNormalizer;
  private verifier: PriceVerifier;

  constructor() {
    this.petcircle = new PetCircleConnector();
    this.petbarn = new PetbarnConnector();
    this.normalizer = new PriceNormalizer();
    this.verifier = new PriceVerifier();
  }

  async run(seedProducts: SeedProduct[]): Promise<PipelineResult> {
    // ---- Phase 1 & 2: Scrape both retailers ----
    const pcResults = new Map<string, PriceResult | null>();
    const pbResults = new Map<string, PriceResult | null>();

    for (const product of seedProducts) {
      const query: SearchQuery = {
        brand: product.brand,
        product_name: product.product_name,
        species: product.species,
      };

      const pc = await this.petcircle.search(query);
      const pb = await this.petbarn.search(query);

      pcResults.set(product.productKey, pc);
      pbResults.set(product.productKey, pb);
    }

    // ---- Phase 3: Normalize ----
    const allRaw: PriceResult[] = [];
    let matchedCount = 0;

    for (const [key, pc] of pcResults) {
      if (pc) { allRaw.push(pc); matchedCount++; }
    }
    for (const [key, pb] of pbResults) {
      if (pb) allRaw.push(pb); // don't double-count matched products
    }

    const normalized = this.normalizer.normalizeBatch(allRaw);

    const coverage =
      seedProducts.length > 0
        ? Math.round((matchedCount / seedProducts.length) * 10000) / 100
        : 0;

    // ---- Phase 4: Verify ----
    const productPrices = new Map<string, { petcircle: PriceResult | null; petbarn: PriceResult | null }>();
    for (const product of seedProducts) {
      productPrices.set(product.productKey, {
        petcircle: pcResults.get(product.productKey) ?? null,
        petbarn: pbResults.get(product.productKey) ?? null,
      });
    }

    const verification = this.verifier.verifyBatch(productPrices);

    // Market availability map
    const marketAvailability = new Map<string, 'ACTIVE' | 'LIMITED' | 'DISCONTINUED'>();
    for (const result of verification.results) {
      marketAvailability.set(result.productKey, result.marketAvailability);
    }

    // ---- Phase 5: Dashboard ----
    const metrics = computePriceMetrics({
      totalProducts: seedProducts.length,
      verificationSummary: verification.summary,
      totalPriceRecords: allRaw.length,
      normalizedCount: normalized.ok.length,
      marketAvailability: {
        active: verification.summary.activeMarkets,
        limited: verification.summary.limitedMarkets,
        discontinued:
          seedProducts.length -
          verification.summary.activeMarkets -
          verification.summary.limitedMarkets,
      },
    });

    const dashboardPayload = generateDashboardPayload(metrics);

    // Summary
    const summary = [
      `Sprint 1.3C-P1 Price Data Acquisition — Pipeline Complete`,
      ``,
      `Seed Products: ${seedProducts.length}`,
      `Price Coverage: ${metrics.priceCoverage}%`,
      `Verified Prices: ${metrics.verifiedPricePct}%`,
      `Normalization: ${metrics.normalizationPct}%`,
      `Price Conflicts: ${metrics.priceConflictCount}`,
      `Market: ACTIVE=${metrics.marketAvailability.active} / LIMITED=${metrics.marketAvailability.limited} / DISCONTINUED=${metrics.marketAvailability.discontinued}`,
      `Price Component Score: ${metrics.priceComponentScore}`,
      ``,
      `Overall Quality Score Contribution: +${(metrics.priceComponentScore * 0.20).toFixed(4)}`,
      ``,
      `DoD Check:`,
      `  ✓ Price Completeness >= 70%: ${metrics.priceCoverage >= 70 ? 'PASS' : `NOT MET (${metrics.priceCoverage}%)`}`,
      `  ✓ Verified Price Coverage >= 60%: ${metrics.verifiedPricePct >= 60 ? 'PASS' : `NOT MET (${metrics.verifiedPricePct}%)`}`,
      `  ✓ Unit Price Normalization Complete: ${metrics.normalizationPct >= 100 ? 'PASS' : `NOT MET`}`,
      `  ✓ Dashboard Metrics Updated: PASS`,
    ].join('\n');

    return {
      raw: { petcircle: pcResults, petbarn: pbResults },
      normalized: { ...normalized, coverage },
      verification,
      marketAvailability,
      metrics,
      dashboardPayload,
      summary,
    };
  }
}

// ---------------------------------------------------------------
// Seed products — mirrors the 20 products from seeds/*.csv
// ---------------------------------------------------------------
export const SEED_PRODUCTS: SeedProduct[] = [
  // Feline (10)
  { brand: 'Royal Canin', product_name: 'feline_kitten_dry', species: 'CAT', productKey: 'rc_feline_kitten' },
  { brand: 'Royal Canin', product_name: 'feline_adult_dry', species: 'CAT', productKey: 'rc_feline_adult' },
  { brand: 'Royal Canin', product_name: 'feline_senior_dry', species: 'CAT', productKey: 'rc_feline_senior' },
  { brand: "Hill's", product_name: 'feline_kitten_dry', species: 'CAT', productKey: 'hills_feline_kitten' },
  { brand: "Hill's", product_name: 'feline_adult_dry', species: 'CAT', productKey: 'hills_feline_adult' },
  { brand: 'Advance', product_name: 'feline_adult_dry', species: 'CAT', productKey: 'advance_feline_adult' },
  { brand: 'Black Hawk', product_name: 'feline_adult_dry', species: 'CAT', productKey: 'bh_feline_adult' },
  { brand: 'Ziwi Peak', product_name: 'feline_adult_dry', species: 'CAT', productKey: 'ziwi_feline_adult' },
  { brand: 'Royal Canin', product_name: 'feline_sterilised_dry', species: 'CAT', productKey: 'rc_feline_sterilised' },
  { brand: "Hill's", product_name: 'feline_senior_dry', species: 'CAT', productKey: 'hills_feline_senior' },

  // Canine (10)
  { brand: 'Royal Canin', product_name: 'canine_puppy_dry', species: 'DOG', productKey: 'rc_canine_puppy' },
  { brand: 'Royal Canin', product_name: 'canine_adult_dry', species: 'DOG', productKey: 'rc_canine_adult' },
  { brand: 'Royal Canin', product_name: 'canine_senior_dry', species: 'DOG', productKey: 'rc_canine_senior' },
  { brand: "Hill's", product_name: 'canine_adult_dry', species: 'DOG', productKey: 'hills_canine_adult' },
  { brand: "Hill's", product_name: 'canine_puppy_dry', species: 'DOG', productKey: 'hills_canine_puppy' },
  { brand: 'Advance', product_name: 'canine_puppy_dry', species: 'DOG', productKey: 'advance_canine_puppy' },
  { brand: 'Advance', product_name: 'canine_adult_dry', species: 'DOG', productKey: 'advance_canine_adult' },
  { brand: 'Black Hawk', product_name: 'canine_adult_dry', species: 'DOG', productKey: 'bh_canine_adult' },
  { brand: 'Ziwi Peak', product_name: 'canine_adult_dry', species: 'DOG', productKey: 'ziwi_canine_adult' },
  { brand: 'Advance', product_name: 'canine_senior_dry', species: 'DOG', productKey: 'advance_canine_senior' },
];
