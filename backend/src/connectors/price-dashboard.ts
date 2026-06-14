/**
 * Price Layer Dashboard metrics.
 *
 * Extends the existing GET /api/metrics/data-quality endpoint
 * with price-specific metrics:
 *   - price_coverage (products with ≥1 price / total products)
 *   - verified_price_pct (verified prices / total prices)
 *   - average_price_variance (% difference between sources)
 *   - price_conflict_count (review_required prices)
 *
 * Weighted into overall_quality_score:
 *   price component = (price_coverage × 0.3 + verified_price_pct × 0.4
 *                      + normalization_pct × 0.3) × (1 − avg_variance/100)
 */

export interface PriceMetrics {
  /** Total number of products in catalog */
  totalProducts: number;
  /** Products with at least one price record */
  productsWithPrices: number;
  /** Price coverage % */
  priceCoverage: number;
  /** Total price records across all sources */
  totalPriceRecords: number;
  /** Verified price records (cross-source within 5%) */
  verifiedPrices: number;
  /** Verified price % */
  verifiedPricePct: number;
  /** Review-required (variance > 5%) */
  reviewRequiredPrices: number;
  /** Unverified (single source only) */
  unverifiedPrices: number;
  /** Average price variance across dual-source products */
  averagePriceVariance: number;
  /** Price conflict count (= review_required) */
  priceConflictCount: number;
  /** Products with normalized unit_price_per_kg */
  normalizedProducts: number;
  /** Normalization coverage % */
  normalizationPct: number;
  /** Market availability breakdown */
  marketAvailability: {
    active: number;
    limited: number;
    discontinued: number;
  };
  /** Component score for overall_quality_score (0-1) */
  priceComponentScore: number;
}

/**
 * Compute price metrics from verification results + raw DB counts.
 *
 * Parameters:
 * @param totalProducts - total products in catalog
 * @param verificationSummary - from PriceVerifier.verifyBatch().summary
 * @param priceRecords - list of price records with normalization status
 */
export function computePriceMetrics(params: {
  totalProducts: number;
  verificationSummary: {
    total: number;
    verified: number;
    reviewRequired: number;
    unverified: number;
    activeMarkets: number;
    limitedMarkets: number;
    averageVariance: number;
  };
  totalPriceRecords: number;
  normalizedCount: number;
  marketAvailability: {
    active: number;
    limited: number;
    discontinued: number;
  };
}): PriceMetrics {
  const {
    totalProducts,
    verificationSummary,
    totalPriceRecords,
    normalizedCount,
    marketAvailability,
  } = params;

  const productsWithPrices = verificationSummary.total;
  const priceCoverage =
    totalProducts > 0
      ? Math.round((productsWithPrices / totalProducts) * 10000) / 100
      : 0;

  const verifiedPricePct =
    totalPriceRecords > 0
      ? Math.round((verificationSummary.verified / totalPriceRecords) * 10000) / 100
      : 0;

  const normalizationPct =
    totalPriceRecords > 0
      ? Math.round((normalizedCount / totalPriceRecords) * 10000) / 100
      : 0;

  const avgVariance = verificationSummary.averageVariance;

  // Price component score formula:
  // (coverage × 0.30 + verified_pct × 0.40 + normalization_pct × 0.30)
  // × (1 − avg_variance/100)
  const baseScore =
    (priceCoverage / 100) * 0.3 +
    (verifiedPricePct / 100) * 0.4 +
    (normalizationPct / 100) * 0.3;

  const variancePenalty = 1 - Math.min(avgVariance / 100, 1);
  const priceComponentScore = Math.round(baseScore * variancePenalty * 10000) / 10000;

  return {
    totalProducts,
    productsWithPrices,
    priceCoverage,
    totalPriceRecords,
    verifiedPrices: verificationSummary.verified,
    verifiedPricePct,
    reviewRequiredPrices: verificationSummary.reviewRequired,
    unverifiedPrices: verificationSummary.unverified,
    averagePriceVariance: verificationSummary.averageVariance,
    priceConflictCount: verificationSummary.reviewRequired,
    normalizedProducts: normalizedCount,
    normalizationPct,
    marketAvailability,
    priceComponentScore,
  };
}

/**
 * Generate the JSON payload for merging into the existing
 * GET /api/metrics/data-quality response.
 */
export function generateDashboardPayload(metrics: PriceMetrics) {
  return {
    price_metrics: {
      price_coverage: metrics.priceCoverage,
      price_coverage_formatted: `${metrics.priceCoverage}%`,
      verified_price_pct: metrics.verifiedPricePct,
      verified_price_pct_formatted: `${metrics.verifiedPricePct}%`,
      average_price_variance: metrics.averagePriceVariance,
      price_conflict_count: metrics.priceConflictCount,
      normalization_pct: metrics.normalizationPct,
      normalization_pct_formatted: `${metrics.normalizationPct}%`,
      market_availability: {
        active: metrics.marketAvailability.active,
        active_pct:
          metrics.totalProducts > 0
            ? Math.round((metrics.marketAvailability.active / metrics.totalProducts) * 10000) / 100
            : 0,
        limited: metrics.marketAvailability.limited,
        limited_pct:
          metrics.totalProducts > 0
            ? Math.round((metrics.marketAvailability.limited / metrics.totalProducts) * 10000) / 100
            : 0,
        discontinued: metrics.marketAvailability.discontinued,
      },
      price_component_score: metrics.priceComponentScore,
    },

    // Updated overall_quality_score formula
    // nutrition×0.25 + price×0.20 + verified×0.20 + normalization×0.20 + confidence×0.15
    overall_quality_score_update: {
      description:
        'price×0.20 component now reflects real verified pricing data from PetCircle + Petbarn',
      price_weight: 0.20,
      price_component_contribution: Math.round(metrics.priceComponentScore * 0.20 * 10000) / 10000,
    },

    generated_at: new Date().toISOString(),
  };
}
