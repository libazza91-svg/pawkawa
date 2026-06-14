/**
 * Price Verifier — Phase 4
 *
 * Cross-references prices from multiple sources (PetCircle + Petbarn)
 * to determine verification status.
 *
 * Rules:
 *   - If difference ≤ 5% of the lower price → verified
 *   - If difference > 5% → review_required
 *   - Single source → unverified
 *
 * Output suitable for:
 *   - product_prices.verification_status
 *   - product_prices.verified_against_price_id
 *   - market_availability updates
 */

import { PriceResult } from './base-price-connector';

export interface VerificationResult {
  /** The product index/key being verified */
  productKey: string;
  /** Full verification outcome */
  status: 'verified' | 'review_required' | 'unverified';
  /** Sources compared */
  sources: {
    petcircle: PriceResult | null;
    petbarn: PriceResult | null;
  };
  /** Price difference as absolute value */
  absoluteDifference: number;
  /** Price difference as percentage of lower price */
  percentDifference: number;
  /** The lower price between the two sources */
  referencePrice: number;
  /** Which source has the lower price */
  lowerSource: string | null;
  /** If verified, which price_id is the verifying source */
  verifyingSource: string | null;
  /** Reason string for dashboard / logging */
  reason: string;
  /** Market availability derived from verification */
  marketAvailability: 'ACTIVE' | 'LIMITED' | 'DISCONTINUED';
}

export interface VerificationConfig {
  /** Percentage threshold for price variance to be considered "verified" */
  verificationThreshold: number; // decimal, e.g. 0.05 = 5%
  /** Minimum number of sources required for verification */
  minSourcesForVerification: number;
}

export interface BatchVerificationResult {
  results: VerificationResult[];
  summary: {
    total: number;
    verified: number;
    reviewRequired: number;
    unverified: number;
    activeMarkets: number;
    limitedMarkets: number;
    averageVariance: number;
  };
}

const DEFAULT_CONFIG: VerificationConfig = {
  verificationThreshold: 0.05,
  minSourcesForVerification: 2,
};

export class PriceVerifier {
  private config: VerificationConfig;

  constructor(config?: Partial<VerificationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Verify a single product's prices across two sources.
   */
  verify(
    productKey: string,
    petcircle: PriceResult | null,
    petbarn: PriceResult | null
  ): VerificationResult {
    const sources = { petcircle, petbarn };
    const availableSources = [petcircle, petbarn].filter(Boolean) as PriceResult[];

    // Single source → unverified
    if (availableSources.length < this.config.minSourcesForVerification) {
      return {
        productKey,
        status: 'unverified',
        sources,
        absoluteDifference: 0,
        percentDifference: 0,
        referencePrice: 0,
        lowerSource: null,
        verifyingSource: null,
        reason: `Only ${availableSources.length} source(s) available, need ≥${this.config.minSourcesForVerification}`,
        marketAvailability: availableSources.length === 1 ? 'LIMITED' : 'DISCONTINUED',
      };
    }

    // Both sources available — compare unit_price_per_kg
    const pcUnitPrice = petcircle!.unit_price_per_kg;
    const pbUnitPrice = petbarn!.unit_price_per_kg;

    const lowerPrice = Math.min(pcUnitPrice, pbUnitPrice);
    const higherPrice = Math.max(pcUnitPrice, pbUnitPrice);
    const absoluteDiff = Math.abs(higherPrice - lowerPrice);
    const percentDiff = lowerPrice > 0
      ? Math.round((absoluteDiff / lowerPrice) * 10000) / 100 // to 2 decimal places
      : 0;

    const lowerSource = pcUnitPrice <= pbUnitPrice ? 'PetCircle' : 'Petbarn';
    const withinThreshold = percentDiff <= this.config.verificationThreshold * 100;

    const status = withinThreshold ? 'verified' : 'review_required';
    const verifyingSource = withinThreshold
      ? (lowerSource === 'PetCircle' ? 'Petbarn' : 'PetCircle')
      : null;

    const reason = withinThreshold
      ? `Price variance ${percentDiff}% within ${this.config.verificationThreshold * 100}% threshold`
      : `Price variance ${percentDiff}% exceeds ${this.config.verificationThreshold * 100}% threshold — manual review required`;

    return {
      productKey,
      status,
      sources,
      absoluteDifference: Math.round(absoluteDiff * 100) / 100,
      percentDifference: percentDiff,
      referencePrice: lowerPrice,
      lowerSource,
      verifyingSource,
      reason,
      marketAvailability: status === 'verified' ? 'ACTIVE' : 'LIMITED',
    };
  }

  /**
   * Batch verify multiple products.
   * Expects Map<productKey, { petcircle, petbarn }>
   */
  verifyBatch(
    productPrices: Map<
      string,
      { petcircle: PriceResult | null; petbarn: PriceResult | null }
    >
  ): BatchVerificationResult {
    const results: VerificationResult[] = [];
    const summary = {
      total: 0,
      verified: 0,
      reviewRequired: 0,
      unverified: 0,
      activeMarkets: 0,
      limitedMarkets: 0,
      averageVariance: 0,
    };

    for (const [key, prices] of productPrices.entries()) {
      const result = this.verify(key, prices.petcircle, prices.petbarn);
      results.push(result);

      summary.total++;
      if (result.status === 'verified') summary.verified++;
      else if (result.status === 'review_required') summary.reviewRequired++;
      else summary.unverified++;

      if (result.marketAvailability === 'ACTIVE') summary.activeMarkets++;
      else if (result.marketAvailability === 'LIMITED') summary.limitedMarkets++;
    }

    // Average variance across verified + review_required results
    const vars = results
      .filter(r => r.status !== 'unverified' && r.percentDifference > 0)
      .map(r => r.percentDifference);
    summary.averageVariance =
      vars.length > 0
        ? Math.round((vars.reduce((a, b) => a + b, 0) / vars.length) * 100) / 100
        : 0;

    return { results, summary };
  }
}
