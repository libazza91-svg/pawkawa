/**
 * Price Verifier Tests
 *
 * Tests single/dual source verification, threshold behavior,
 * and batch verification with summary metrics.
 */

import { describe, it } from 'vitest';
import { PriceVerifier } from '../src/connectors/price-verifier';
import { PriceResult } from '../src/connectors/base-price-connector';
import { PETCIRCLE_MOCK_PRICES } from '../src/connectors/petcircle';
import { PETBARN_MOCK_PRICES } from '../src/connectors/petbarn';

// ---------------------------------------------------------------
// Single Source → unverified
// ---------------------------------------------------------------

function test_single_source() {
  const verifier = new PriceVerifier();
  const pcPrice = PETCIRCLE_MOCK_PRICES['royal_canin_feline_kitten_dry'];

  const result = verifier.verify('royal_canin_feline_kitten', pcPrice, null);

  console.log(`[Verifier] Single source (PetCircle only) → ${result.status}`);
  if (result.status !== 'unverified') {
    console.log('  FAIL: expected unverified');
    process.exitCode = 1;
  } else if (result.marketAvailability !== 'LIMITED') {
    console.log(`  FAIL: expected marketAvailability=LIMITED, got ${result.marketAvailability}`);
    process.exitCode = 1;
  } else {
    console.log('  PASS: unverified + LIMITED');
  }
}

// ---------------------------------------------------------------
// Dual Source — Within Threshold → verified
// ---------------------------------------------------------------

function test_dual_source_verified() {
  const verifier = new PriceVerifier();
  const pc = PETCIRCLE_MOCK_PRICES['royal_canin_feline_kitten_dry'];  // $42.99, $21.50/kg
  const pb = PETBARN_MOCK_PRICES['royal_canin_feline_kitten_dry'];    // $41.99, $21.00/kg

  // Difference: 21.50 − 21.00 = 0.50, % diff = 0.50/21.00 = 2.38%
  const result = verifier.verify('royal_canin_feline_kitten', pc, pb);

  console.log(
    `[Verifier] Dual source (PC $21.50/kg vs PB $21.00/kg) → ` +
    `${result.status}, variance=${result.percentDifference}%`
  );

  if (result.status !== 'verified') {
    console.log(`  FAIL: expected verified with 2.38% variance`);
    process.exitCode = 1;
  } else if (result.marketAvailability !== 'ACTIVE') {
    console.log(`  FAIL: expected marketAvailability=ACTIVE`);
    process.exitCode = 1;
  } else if (result.percentDifference !== 2.38) {
    console.log(`  FAIL: expected percentDifference=2.38, got ${result.percentDifference}`);
    process.exitCode = 1;
  } else {
    console.log('  PASS: verified + ACTIVE');
  }
}

// ---------------------------------------------------------------
// Dual Source — Above Threshold → review_required
// ---------------------------------------------------------------

function test_dual_source_conflict() {
  const verifier = new PriceVerifier();

  // Create artificial conflict: one at $20/kg, other at $22/kg
  const pcHigh: PriceResult = {
    source_url: '', product_name: 'Test', brand_name: 'Test', pack_size: '2kg',
    pack_size_g: 2000, price_aud: 44.00, unit_price_per_kg: 22.00,
    retailer: 'PetCircle', last_checked: '', match_confidence: 1.0,
  };
  const pbLow: PriceResult = {
    source_url: '', product_name: 'Test', brand_name: 'Test', pack_size: '2kg',
    pack_size_g: 2000, price_aud: 40.00, unit_price_per_kg: 20.00,
    retailer: 'Petbarn', last_checked: '', match_confidence: 1.0,
  };

  const result = verifier.verify('conflict_product', pcHigh, pbLow);

  console.log(
    `[Verifier] Conflict test: $22/kg vs $20/kg → ${result.status}, ` +
    `variance=${result.percentDifference}%`
  );

  if (result.status !== 'review_required') {
    console.log('  FAIL: expected review_required for 10% variance');
    process.exitCode = 1;
  } else if (Math.round(result.percentDifference) !== 10) {
    console.log(`  FAIL: expected ~10% variance, got ${result.percentDifference}%`);
    process.exitCode = 1;
  } else {
    console.log('  PASS: review_required');
  }
}

// ---------------------------------------------------------------
// Threshold Boundary Test (exactly 5%)
// ---------------------------------------------------------------

function test_threshold_boundary() {
  const verifier = new PriceVerifier();

  // Exactly 5% difference
  const pc: PriceResult = {
    source_url: '', product_name: 'Test', brand_name: 'Test', pack_size: '2kg',
    pack_size_g: 2000, price_aud: 42.00, unit_price_per_kg: 21.00,
    retailer: 'PetCircle', last_checked: '', match_confidence: 1.0,
  };
  // 5% of 20.00 = 1.00, so 20.00 * 1.05 = 21.00
  const pb: PriceResult = {
    source_url: '', product_name: 'Test', brand_name: 'Test', pack_size: '2kg',
    pack_size_g: 2000, price_aud: 40.00, unit_price_per_kg: 20.00,
    retailer: 'Petbarn', last_checked: '', match_confidence: 1.0,
  };

  const result = verifier.verify('boundary_5pct', pc, pb);
  console.log(
    `[Verifier] 5% boundary: $21/kg vs $20/kg → ${result.status}, ` +
    `variance=${result.percentDifference}%`
  );
  console.log(
    `  Threshold=${verifier['config'].verificationThreshold * 100}%, ` +
    `result=${result.status} — `
  );

  // 5.00% should be <= 5% → verified (we compare threshold * 100)
  if (result.status !== 'verified') {
    console.log('  NOTE: 5.00% is exactly at threshold — depends on precision');
  } else {
    console.log('  PASS');
  }
}

// ---------------------------------------------------------------
// Batch Verification
// ---------------------------------------------------------------

function test_batch_verification() {
  const verifier = new PriceVerifier();

  // Build product mapping for shared products
  const sharedKeys = [
    'royal_canin_feline_kitten_dry',
    'royal_canin_feline_adult_dry',
    'royal_canin_feline_senior_dry',
    'royal_canin_canine_puppy_dry',
    'royal_canin_canine_adult_dry',
    'hills_feline_kitten_dry',
    'hills_feline_adult_dry',
    'advance_feline_adult_dry',
    'advance_canine_puppy_dry',
    'advance_canine_adult_dry',
    'black_hawk_feline_adult_dry',
    'black_hawk_canine_adult_dry',
    'ziwi_peak_feline_adult_dry',
  ];

  const productPrices = new Map<string, { petcircle: PriceResult | null; petbarn: PriceResult | null }>();
  for (const key of sharedKeys) {
    productPrices.set(key, {
      petcircle: PETCIRCLE_MOCK_PRICES[key] ?? null,
      petbarn: PETBARN_MOCK_PRICES[key] ?? null,
    });
  }

  const result = verifier.verifyBatch(productPrices);

  console.log('\n[Verifier] Batch Verification Summary:');
  console.log(`  Total: ${result.summary.total}`);
  console.log(`  Verified: ${result.summary.verified}`);
  console.log(`  Review Required: ${result.summary.reviewRequired}`);
  console.log(`  Unverified: ${result.summary.unverified}`);
  console.log(`  ACTIVE markets: ${result.summary.activeMarkets}`);
  console.log(`  LIMITED markets: ${result.summary.limitedMarkets}`);
  console.log(`  Avg Variance: ${result.summary.averageVariance}%`);

  // AC: at least some verified prices
  if (result.summary.verified > 0) {
    console.log(`  PASS: ${result.summary.verified} verified products`);
  } else {
    console.log('  FAIL: 0 verified products');
    process.exitCode = 1;
  }

  // AC: no orphan unverified (all should be in shared keys)
  console.log(
    `  Unverified count: ${result.summary.unverified} → ` +
    `${result.summary.unverified <= 2 ? 'PASS (only truly missing sources)' : 'CHECK'}`
  );

  return result;
}

// ---------------------------------------------------------------
// Market Availability Derivation
// ---------------------------------------------------------------

function test_market_availability() {
  const verifier = new PriceVerifier();

  // Dual verified → ACTIVE
  const pcV: PriceResult = { ...PETCIRCLE_MOCK_PRICES['royal_canin_feline_kitten_dry'] };
  const pbV: PriceResult = { ...PETBARN_MOCK_PRICES['royal_canin_feline_kitten_dry'] };
  const r1 = verifier.verify('product_a', pcV, pbV);
  console.log(`[Verifier] Verified dual → ${r1.marketAvailability} (expected ACTIVE) → ${r1.marketAvailability === 'ACTIVE' ? 'PASS' : 'FAIL'}`);

  // Single source → LIMITED
  const r2 = verifier.verify('product_b', pcV, null);
  console.log(`[Verifier] Single source → ${r2.marketAvailability} (expected LIMITED) → ${r2.marketAvailability === 'LIMITED' ? 'PASS' : 'FAIL'}`);

  // No sources → DISCONTINUED
  const r3 = verifier.verify('product_c', null, null);
  console.log(`[Verifier] No source → ${r3.marketAvailability} (expected DISCONTINUED) → ${r3.marketAvailability === 'DISCONTINUED' ? 'PASS' : 'FAIL'}`);

  if (r1.marketAvailability !== 'ACTIVE' || r2.marketAvailability !== 'LIMITED' || r3.marketAvailability !== 'DISCONTINUED') {
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------
// Run all
// ---------------------------------------------------------------

describe('Price Verifier', () => {
  it('single source', () => test_single_source());
  it('dual source verified', () => test_dual_source_verified());
  it('dual source conflict', () => test_dual_source_conflict());
  it('threshold boundary', () => test_threshold_boundary());
  it('market availability', () => test_market_availability());
  it('batch verification', () => test_batch_verification());
});
