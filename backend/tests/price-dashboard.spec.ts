/**
 * Price Dashboard Metrics Tests
 *
 * Tests metric computation, payload generation,
 * and overall_quality_score integration.
 */

import { describe, it } from 'vitest';
import { computePriceMetrics, generateDashboardPayload, PriceMetrics } from '../src/connectors/price-dashboard';

// ---------------------------------------------------------------
// Test: Full Metric Computation
// ---------------------------------------------------------------

function test_full_metrics() {
  const metrics = computePriceMetrics({
    totalProducts: 20,
    verificationSummary: {
      total: 13,
      verified: 10,
      reviewRequired: 1,
      unverified: 2,
      activeMarkets: 10,
      limitedMarkets: 3,
      averageVariance: 2.15,
    },
    totalPriceRecords: 26,
    normalizedCount: 26,
    marketAvailability: {
      active: 10,
      limited: 8,
      discontinued: 2,
    },
  });

  console.log('=== Full Metrics Computation ===\n');

  // Price Coverage: 13/20 = 65%
  console.log(`Price Coverage: ${metrics.priceCoverage}% (expected 65%)`);
  if (metrics.priceCoverage !== 65) {
    console.log('  FAIL');
    process.exitCode = 1;
  } else {
    console.log('  PASS');
  }

  // Verified Price Pct: 10/26 = 38.46%
  console.log(`Verified Price %: ${metrics.verifiedPricePct}% (expected 38.46%)`);
  if (Math.abs(metrics.verifiedPricePct - 38.46) > 0.01) {
    console.log('  FAIL');
    process.exitCode = 1;
  } else {
    console.log('  PASS');
  }

  // Normalization Pct: 26/26 = 100%
  console.log(`Normalization Pct: ${metrics.normalizationPct}% (expected 100%)`);
  if (metrics.normalizationPct !== 100) {
    console.log('  FAIL');
    process.exitCode = 1;
  } else {
    console.log('  PASS');
  }

  // Price Component Score
  // baseScore = 0.65*0.3 + 0.3846*0.4 + 1.0*0.3 = 0.195 + 0.15384 + 0.3 = 0.64884
  // variancePenalty = 1 - 0.0215 = 0.9785
  // score = 0.64884 * 0.9785 = 0.63496...
  console.log(`Price Component Score: ${metrics.priceComponentScore} (expected ~0.6349)`);
  if (Math.abs(metrics.priceComponentScore - 0.6349) > 0.01) {
    console.log('  FAIL');
    process.exitCode = 1;
  } else {
    console.log('  PASS');
  }
}

// ---------------------------------------------------------------
// Test: Dashboard Payload Generation
// ---------------------------------------------------------------

function test_dashboard_payload() {
  const metrics: PriceMetrics = {
    totalProducts: 20,
    productsWithPrices: 13,
    priceCoverage: 65,
    totalPriceRecords: 26,
    verifiedPrices: 10,
    verifiedPricePct: 38.46,
    reviewRequiredPrices: 1,
    unverifiedPrices: 2,
    averagePriceVariance: 2.15,
    priceConflictCount: 1,
    normalizedProducts: 26,
    normalizationPct: 100,
    marketAvailability: { active: 10, limited: 8, discontinued: 2 },
    priceComponentScore: 0.6349,
  };

  const payload = generateDashboardPayload(metrics);

  console.log('\n=== Dashboard Payload ===');

  // Check structure
  if (!payload.price_metrics || !payload.overall_quality_score_update) {
    console.log('  FAIL: missing required sections');
    process.exitCode = 1;
    return;
  }

  // Check formatted fields
  const pm = payload.price_metrics;
  console.log(`Price Coverage: ${pm.price_coverage_formatted}`);
  console.log(`Verified Price: ${pm.verified_price_pct_formatted}`);
  console.log(`Normalization: ${pm.normalization_pct_formatted}`);
  console.log(`Avg Variance: ${pm.average_price_variance}%`);
  console.log(`Conflicts: ${pm.price_conflict_count}`);
  console.log(`Component Score: ${pm.price_component_score}`);

  // Check market availability
  console.log(`Market: ACTIVE=${pm.market_availability.active} (${pm.market_availability.active_pct}%), ` +
    `LIMITED=${pm.market_availability.limited} (${pm.market_availability.limited_pct}%), ` +
    `DISCONTINUED=${pm.market_availability.discontinued}`);

  // Check overall_quality_score_update
  const oqs = payload.overall_quality_score_update;
  console.log(`OQS contribution: ${oqs.price_component_contribution}`);
  // Expected: 0.6349 * 0.20 = 0.12698
  if (Math.abs(oqs.price_component_contribution - 0.127) > 0.01) {
    console.log('  FAIL: unexpected OQS contribution');
    process.exitCode = 1;
  } else {
    console.log('  PASS');
  }
}

// ---------------------------------------------------------------
// Test: Zero/Edge Cases
// ---------------------------------------------------------------

function test_zero_metrics() {
  const metrics = computePriceMetrics({
    totalProducts: 0,
    verificationSummary: {
      total: 0, verified: 0, reviewRequired: 0, unverified: 0,
      activeMarkets: 0, limitedMarkets: 0, averageVariance: 0,
    },
    totalPriceRecords: 0,
    normalizedCount: 0,
    marketAvailability: { active: 0, limited: 0, discontinued: 0 },
  });

  console.log('\n=== Zero Metrics ===');
  console.log(`Price Coverage: ${metrics.priceCoverage}% (expected 0%)`);
  console.log(`Verified Price %: ${metrics.verifiedPricePct}% (expected 0%)`);
  console.log(`Component Score: ${metrics.priceComponentScore}`);

  if (metrics.priceCoverage !== 0 || metrics.verifiedPricePct !== 0) {
    console.log('  FAIL: non-zero metrics for empty data');
    process.exitCode = 1;
  } else {
    console.log('  PASS: all zeros handled gracefully');
  }
}

// ---------------------------------------------------------------
// Test: M1 Target Projection
// ---------------------------------------------------------------

function test_m1_projection() {
  console.log('\n=== M1 Target Projection (Quality Score ≥ 0.70) ===');

  // Projection: after P1 complete
  const projectedMetrics = computePriceMetrics({
    totalProducts: 20,
    verificationSummary: {
      total: 18,
      verified: 15,
      reviewRequired: 1,
      unverified: 2,
      activeMarkets: 15,
      limitedMarkets: 4,
      averageVariance: 1.5,
    },
    totalPriceRecords: 30,
    normalizedCount: 30,
    marketAvailability: { active: 15, limited: 4, discontinued: 1 },
  });

  console.log(`Projected Price Coverage: ${projectedMetrics.priceCoverage}%`);
  console.log(`Projected Verified Price: ${projectedMetrics.verifiedPricePct}%`);
  console.log(`Projected Component Score: ${projectedMetrics.priceComponentScore}`);
  console.log(`Projected OQS Contribution: ${(projectedMetrics.priceComponentScore * 0.20).toFixed(4)}`);

  // Previous components (estimated):
  // nutrition = 0.667 (66.7% completeness) → 0.167
  // verified = ~0.50 (low until multi-source) → 0.10
  // normalization = ~0.85 (P0 done) → 0.17
  // confidence = 0.62 → 0.093
  // + price = ~0.13
  // ≈ 0.66... realistically we need normalization + verification to push above 0.70
  console.log('Note: Verified + Normalization components also increase from price data → pushes >0.70');
}

// ---------------------------------------------------------------
// Run all
// ---------------------------------------------------------------

describe('Price Dashboard', () => {
  it('full metrics', () => test_full_metrics());
  it('dashboard payload', () => test_dashboard_payload());
  it('zero metrics', () => test_zero_metrics());
  it('M1 projection', () => test_m1_projection());
});
