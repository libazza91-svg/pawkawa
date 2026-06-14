/**
 * Price Connector Tests — PetCircle + Petbarn
 *
 * Tests search, health check, mock data coverage, and edge cases.
 */

import { describe, it } from 'vitest';
import { PetCircleConnector, PETCIRCLE_MOCK_PRICES } from '../src/connectors/petcircle';
import { PetbarnConnector, PETBARN_MOCK_PRICES } from '../src/connectors/petbarn';

// ---------------------------------------------------------------
// PetCircle Connector
// ---------------------------------------------------------------

async function test_petcircle_health() {
  const connector = new PetCircleConnector();
  const health = await connector.healthCheck();
  console.log(`[PetCircle Health] available=${health.available}, latency=${health.latency_ms}ms`);
  // Note: mock keys may not match; test that healthCheck runs without throwing
}

async function test_petcircle_search_all_products() {
  const connector = new PetCircleConnector();
  const products = [
    { brand: 'Royal Canin', product_name: 'feline_kitten_dry', expectFound: true },
    { brand: 'Royal Canin', product_name: 'feline_adult_dry', expectFound: true },
    { brand: "Hill's", product_name: 'feline_kitten_dry', expectFound: true },
    { brand: 'Advance', product_name: 'feline_adult_dry', expectFound: true },
    { brand: 'Advance', product_name: 'canine_adult_dry', expectFound: true },
    { brand: 'Black Hawk', product_name: 'canine_adult_dry', expectFound: true },
  ];

  let found = 0;
  const notFound: string[] = [];
  const failures: string[] = [];

  for (const p of products) {
    const result = await connector.search(p);
    const actualFound = result !== null;
    if (actualFound !== p.expectFound) {
      failures.push(`${p.brand} — ${p.product_name}: expected ${p.expectFound}, got ${actualFound}`);
    } else if (actualFound) {
      found++;
    } else {
      notFound.push(`${p.brand} — ${p.product_name}`);
    }
  }

  if (failures.length > 0) {
    console.log(`[PetCircle Search] FAIL:`);
    failures.forEach(f => console.log(`  ${f}`));
    process.exitCode = 1;
  } else {
    console.log(`[PetCircle Search] PASS: ${found}/${products.length} matched`);
  }

  return { found, notFound, failures };
}

async function test_petcircle_search_edge_cases() {
  const connector = new PetCircleConnector();

  let allPass = true;

  // Empty query
  const r1 = await connector.search({ brand: '', product_name: '' });
  const pass1 = r1 === null;
  console.log(`[PetCircle Edge] Empty query → ${pass1 ? 'PASS (null)' : 'FAIL'}`);
  if (!pass1) allPass = false;

  // Special characters
  const r2 = await connector.search({ brand: "Hill's", product_name: 'feline_kitten_dry' });
  const pass2 = r2 !== null;
  console.log(`[PetCircle Edge] Hill's → ${pass2 ? 'PASS' : 'FAIL'}`);
  if (!pass2) allPass = false;

  // Case insensitive
  const r3 = await connector.search({ brand: 'ROYAL CANIN', product_name: 'FELINE_KITTEN_DRY' });
  const r3norm = await connector.search({ brand: 'Royal Canin', product_name: 'feline_kitten_dry' });
  const pass3 = r3 !== null && r3.price_aud === r3norm?.price_aud;
  console.log(`[PetCircle Edge] Case insensitive → ${pass3 ? 'PASS' : 'FAIL'}`);
  if (!pass3) allPass = false;

  if (!allPass) process.exitCode = 1;
}

// ---------------------------------------------------------------
// Petbarn Connector
// ---------------------------------------------------------------

async function test_petbarn_search_all_products() {
  const connector = new PetbarnConnector();
  const products = [
    { brand: 'Royal Canin', product_name: 'feline_kitten_dry', expectFound: true },
    { brand: 'Royal Canin', product_name: 'feline_adult_dry', expectFound: true },
    { brand: 'Royal Canin', product_name: 'feline_senior_dry', expectFound: true },
    { brand: 'Royal Canin', product_name: 'canine_puppy_dry', expectFound: true },
    { brand: 'Royal Canin', product_name: 'canine_adult_dry', expectFound: true },
    { brand: 'Royal Canin', product_name: 'canine_senior_dry', expectFound: true }, // Petbarn exclusive
    { brand: "Hill's", product_name: 'feline_kitten_dry', expectFound: true },
    { brand: "Hill's", product_name: 'feline_adult_dry', expectFound: true },
    { brand: 'Advance', product_name: 'feline_adult_dry', expectFound: true },
    { brand: 'Advance', product_name: 'canine_puppy_dry', expectFound: true },
    { brand: 'Advance', product_name: 'canine_adult_dry', expectFound: true },
    { brand: 'Black Hawk', product_name: 'feline_adult_dry', expectFound: true },
    { brand: 'Black Hawk', product_name: 'canine_adult_dry', expectFound: true },
    { brand: 'Ziwi Peak', product_name: 'feline_adult_dry', expectFound: true },
    { brand: 'NONEXISTENT', product_name: 'ghost_product', expectFound: false },
  ];

  let found = 0;
  let notFound = 0;
  const failures: string[] = [];

  for (const p of products) {
    const result = await connector.search(p);
    const actualFound = result !== null;
    if (actualFound !== p.expectFound) {
      failures.push(
        `${p.brand}/${p.product_name}: expected ${p.expectFound}, got ${actualFound}`
      );
    }
    if (actualFound) found++;
    else notFound++;
  }

  console.log(`[Petbarn Search] Found: ${found}, Not Found: ${notFound}`);
  if (found >= 15) {
    console.log('  PASS: >= 15 products matched');
  } else {
    console.log(`  FAIL: only ${found}/15 matched`);
    process.exitCode = 1;
  }

  return { found, notFound, failures };
}

async function test_petbarn_health() {
  const connector = new PetbarnConnector();
  const health = await connector.healthCheck();
  console.log(`[Petbarn Health] available=${health.available}, latency=${health.latency_ms}ms`);
}

// ---------------------------------------------------------------
// Run all
// ---------------------------------------------------------------

describe('Price Connector', () => {
  it('PetCircle health check', async () => { await test_petcircle_health(); });

  it('PetCircle search', async () => {
    await test_petcircle_search_all_products();
  });

  it('PetCircle edge cases', async () => { await test_petcircle_search_edge_cases(); });

  it('Petbarn health', async () => { await test_petbarn_health(); });

  it('Petbarn search', async () => {
    await test_petbarn_search_all_products();
  });
});
