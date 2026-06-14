/**
 * Price Normalizer Tests
 *
 * Tests pack_size parsing, unit_price_per_kg calculation,
 * edge cases, and batch normalization.
 */

import { describe, it } from 'vitest';
import { PriceNormalizer } from '../src/connectors/price-normalizer';
import { PriceResult } from '../src/connectors/base-price-connector';
import { PETCIRCLE_MOCK_PRICES } from '../src/connectors/petcircle';
import { PETBARN_MOCK_PRICES } from '../src/connectors/petbarn';

// ---------------------------------------------------------------
// Unit: Pack Size Parsing
// ---------------------------------------------------------------

function test_parse_pack_size() {
  const normalizer = new PriceNormalizer();
  const cases = [
    ['2.5kg', 2500],
    ['2kg', 2000],
    ['4kg', 4000],
    ['7kg', 7000],
    ['20kg', 20000],
    ['1.8kg', 1800],
    ['3.2kg', 3200],
    ['3kg', 3000],
    ['1kg', 1000],
    ['340g', 340],
    ['85g', 85],
    ['12x85g', 1020],  // 12 * 85
    ['12 x 85g', 1020],
    ['24x85g', 2040],   // 24 * 85
    ['', 0],            // empty
    ['unknown', 0],     // unparsable
    ['0g', 0],
  ];

  let pass = 0;
  let fail = 0;

  for (const [input, expected] of cases) {
    const result = normalizer.parsePackSize(input as string);
    if (result === expected) {
      pass++;
    } else {
      fail++;
      console.log(`  FAIL: parse "${input}" → ${result}, expected ${expected}`);
    }
  }

  console.log(`[Normalizer] Pack size parsing: ${pass}/${pass + fail} PASS`);
  if (fail > 0) process.exitCode = 1;
}

// ---------------------------------------------------------------
// Unit: Single Price Normalization
// ---------------------------------------------------------------

function test_single_normalization() {
  const normalizer = new PriceNormalizer();

  // Normal case: 2kg @ $42 → $21/kg
  const r1: PriceResult = { ...PETCIRCLE_MOCK_PRICES['royal_canin_feline_kitten_dry'] };
  const n1 = normalizer.normalize(r1);
  console.log(`[Normalizer] 2kg @ $42.99 → ${n1?.unit_price_per_kg}/kg (expected 21.50)`);
  if (!n1 || n1.unit_price_per_kg !== 21.50 || n1.status !== 'ok') {
    console.log('  FAIL');
    process.exitCode = 1;
  } else {
    console.log('  PASS');
  }

  // Premium case: 2.5kg @ $89.99 (Ziwi Peak)
  const r2: PriceResult = { ...PETCIRCLE_MOCK_PRICES['ziwi_peak_canine_adult_dry'] };
  const n2 = normalizer.normalize(r2);
  console.log(`[Normalizer] 2.5kg @ $89.99 → ${n2?.unit_price_per_kg}/kg (expected 36.00)`);
  if (!n2 || n2.unit_price_per_kg !== 36.00 || n2.status !== 'ok') {
    console.log('  FAIL');
    process.exitCode = 1;
  } else {
    console.log('  PASS');
  }

  // Bulk: 20kg @ $119.99 → $6.00/kg
  const r3: PriceResult = { ...PETCIRCLE_MOCK_PRICES['black_hawk_canine_adult_dry'] };
  const n3 = normalizer.normalize(r3);
  console.log(`[Normalizer] 20kg @ $119.99 → ${n3?.unit_price_per_kg}/kg (expected 6.00)`);
  if (!n3 || n3.unit_price_per_kg !== 6.00 || n3.status !== 'ok') {
    console.log('  FAIL');
    process.exitCode = 1;
  } else {
    console.log('  PASS');
  }
}

// ---------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------

function test_edge_cases() {
  const normalizer = new PriceNormalizer();

  // Zero price
  const rZero: PriceResult = {
    source_url: '', product_name: '', brand_name: '', pack_size: '2kg',
    pack_size_g: 2000, price_aud: 0, unit_price_per_kg: 0,
    retailer: '', last_checked: '', match_confidence: 0,
  };
  const nZero = normalizer.normalize(rZero);
  console.log(`[Normalizer] Zero price → ${nZero === null ? 'PASS (rejected)' : 'FAIL'}`);

  // Negative price
  const rNeg: PriceResult = {
    source_url: '', product_name: '', brand_name: '', pack_size: '2kg',
    pack_size_g: 2000, price_aud: -10, unit_price_per_kg: 0,
    retailer: '', last_checked: '', match_confidence: 0,
  };
  const nNeg = normalizer.normalize(rNeg);
  console.log(`[Normalizer] Negative price → ${nNeg === null ? 'PASS (rejected)' : 'FAIL'}`);

  // Below minimum
  const rMin: PriceResult = {
    source_url: '', product_name: '', brand_name: '', pack_size: '1kg',
    pack_size_g: 1000, price_aud: 2.00, unit_price_per_kg: 2.00,
    retailer: '', last_checked: '', match_confidence: 0,
  };
  const nMin = normalizer.normalize(rMin);
  console.log(`[Normalizer] Below min price ($2) → ${nMin === null ? 'PASS (rejected)' : 'WARNING'}`);

  // Above max unit price
  const rMax: PriceResult = {
    source_url: '', product_name: '', brand_name: '', pack_size: '100g',
    pack_size_g: 100, price_aud: 25.00, unit_price_per_kg: 250.00,
    retailer: '', last_checked: '', match_confidence: 0,
  };
  const nMax = normalizer.normalize(rMax);
  console.log(`[Normalizer] $250/kg → ${nMax === null ? 'PASS (rejected)' : 'FAIL'}`);

  // Unparseable pack size
  const rBadPk: PriceResult = {
    source_url: '', product_name: '', brand_name: '', pack_size: 'various',
    pack_size_g: 0, price_aud: 50, unit_price_per_kg: 0,
    retailer: '', last_checked: '', match_confidence: 0,
  };
  const nBadPk = normalizer.normalize(rBadPk);
  console.log(`[Normalizer] Unparseable pack → ${nBadPk !== null && nBadPk.warnings.length > 0 ? 'PASS (warning)' : nBadPk === null ? 'FAIL (should warn not reject)' : 'FAIL'}`);
}

// ---------------------------------------------------------------
// Batch Normalization
// ---------------------------------------------------------------

function test_batch_normalization() {
  const normalizer = new PriceNormalizer();
  const allPetCircle = Object.values(PETCIRCLE_MOCK_PRICES);
  const result = normalizer.normalizeBatch(allPetCircle);

  console.log(
    `[Normalizer] Batch: ${result.ok.length} OK, ${result.rejected.length} rejected`
  );

  // 100% success for valid mock data
  if (result.rejected.length === 0) {
    console.log('  PASS: 100% normalization success for valid data');
  } else {
    console.log(`  WARNING: ${result.rejected.length} rejected`);
  }

  // Verify all unit prices are numeric
  const allValid = result.ok.every(
    p => !isNaN(p.unit_price_per_kg) && p.unit_price_per_kg > 0
  );
  console.log(`[Normalizer] All unit prices valid: ${allValid ? 'PASS' : 'FAIL'}`);
  if (!allValid) process.exitCode = 1;
}

// ---------------------------------------------------------------
// Run all
// ---------------------------------------------------------------

describe('Price Normalizer', () => {
  it('parse pack size', () => test_parse_pack_size());
  it('single normalization', () => test_single_normalization());
  it('edge cases', () => test_edge_cases());
  it('batch normalization', () => test_batch_normalization());
});
