import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTestDb, setupDbMock } from './helpers/mockDb';
import type { IMemoryDb } from 'pg-mem';

// ── Seed data for metrics tests ────────────────────────────────────
function seedMetricsData(memDb: IMemoryDb) {
  // Brands: 5 total
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (1, 'Royal Canin', 'FR')`);
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (2, 'Hill''s Science Diet', 'US')`);
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (3, 'Ziwi Peak', 'NZ')`);
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (4, 'Black Hawk', 'AU')`);
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (5, 'Unused Brand', 'DE')`);

  // Products: 8 total (4 brands used → brand 5 unused)
  // By species: 4 CAT, 4 DOG
  // By life_stage: 2 ADULT, 2 SENIOR, 1 KITTEN, 1 PUPPY, 2 ALL_LIFE_STAGES
  // By verification: 1 UNVERIFIED, 3 SINGLE_SOURCE, 3 MULTI_SOURCE, 1 MANUALLY_VERIFIED
  // Confidence: 0.1, 0.4, 0.55, 0.6, 0.75, 0.8, 0.85, 0.95
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage, verification_status, confidence_score) VALUES
    (1, 1, 'Royal Canin Kitten', 'CAT', 'KITTEN', 'MANUALLY_VERIFIED', 0.95)`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage, verification_status, confidence_score) VALUES
    (2, 1, 'Royal Canin Adult', 'CAT', 'ADULT', 'MULTI_SOURCE', 0.85)`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage, verification_status, confidence_score) VALUES
    (3, 2, 'Hill''s Puppy', 'DOG', 'PUPPY', 'MULTI_SOURCE', 0.80)`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage, verification_status, confidence_score) VALUES
    (4, 2, 'Hill''s Senior', 'DOG', 'SENIOR', 'MULTI_SOURCE', 0.75)`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage, verification_status, confidence_score) VALUES
    (5, 3, 'Ziwi Peak Cat', 'CAT', 'ALL_LIFE_STAGES', 'SINGLE_SOURCE', 0.60)`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage, verification_status, confidence_score) VALUES
    (6, 3, 'Ziwi Peak Dog', 'DOG', 'ALL_LIFE_STAGES', 'SINGLE_SOURCE', 0.55)`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage, verification_status, confidence_score) VALUES
    (7, 4, 'Black Hawk Adult Cat', 'CAT', 'ADULT', 'SINGLE_SOURCE', 0.40)`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage, verification_status, confidence_score) VALUES
    (8, 4, 'Black Hawk Senior Dog', 'DOG', 'SENIOR', 'UNVERIFIED', 0.10)`);

  // Product Nutrition: 6 products have nutrition, 2 don't (products 7, 8)
  memDb.public.none(`INSERT INTO product_nutrition (product_id, protein_pct, fat_pct, fiber_pct, moisture_pct, calories_kcal) VALUES
    (1, 34, 20, 7, 8, 4100)`);
  memDb.public.none(`INSERT INTO product_nutrition (product_id, protein_pct, fat_pct, moisture_pct) VALUES
    (2, 32, 15, 10)`);
  memDb.public.none(`INSERT INTO product_nutrition (product_id, protein_pct) VALUES
    (3, 28)`);
  memDb.public.none(`INSERT INTO product_nutrition (product_id, protein_pct, fat_pct, fiber_pct, moisture_pct, ash_pct, calories_kcal) VALUES
    (4, 25, 12, 4, 8, 7, 3500)`);
  memDb.public.none(`INSERT INTO product_nutrition (product_id, protein_pct, fat_pct, fiber_pct, crude_fiber_pct, moisture_pct, ash_pct, phosphorus_pct, calcium_pct, omega_3_pct, omega_6_pct, calories_kcal, me_kcal_per_kg) VALUES
    (5, 38, 22, 3, 3, 9, 8, 1.2, 1.5, 0.8, 2.5, 4200, 4200)`);
  memDb.public.none(`INSERT INTO product_nutrition (product_id, protein_pct) VALUES
    (6, 36)`);

  // Product Ingredients: 10 records, 8 unique normalized names, 8 of 10 with normalized_ingredient
  memDb.public.none(`INSERT INTO product_ingredients (id, product_id, raw_ingredient, normalized_ingredient, ingredient_order) VALUES
    (1, 1, 'Chicken Meal', 'Chicken Meal', 1)`);
  memDb.public.none(`INSERT INTO product_ingredients (id, product_id, raw_ingredient, normalized_ingredient, ingredient_order) VALUES
    (2, 1, 'Brown Rice', 'Brown Rice', 2)`);
  memDb.public.none(`INSERT INTO product_ingredients (id, product_id, raw_ingredient, normalized_ingredient, ingredient_order) VALUES
    (3, 2, 'Chicken', 'Chicken', 1)`);
  memDb.public.none(`INSERT INTO product_ingredients (id, product_id, raw_ingredient, normalized_ingredient, ingredient_order) VALUES
    (4, 2, 'Rice', 'Rice', 2)`);
  memDb.public.none(`INSERT INTO product_ingredients (id, product_id, raw_ingredient, normalized_ingredient, ingredient_order) VALUES
    (5, 3, 'Lamb Meal', 'Lamb Meal', 1)`);
  memDb.public.none(`INSERT INTO product_ingredients (id, product_id, raw_ingredient, normalized_ingredient, ingredient_order) VALUES
    (6, 3, 'Oats', 'Oats', 2)`);
  // Records without normalized_ingredient
  memDb.public.none(`INSERT INTO product_ingredients (id, product_id, raw_ingredient, ingredient_order) VALUES
    (7, 4, 'Unknown component X', 1)`);
  memDb.public.none(`INSERT INTO product_ingredients (id, product_id, raw_ingredient, ingredient_order) VALUES
    (8, 4, 'Unknown component Y', 2)`);
  memDb.public.none(`INSERT INTO product_ingredients (id, product_id, raw_ingredient, normalized_ingredient, ingredient_order) VALUES
    (9, 5, 'Beef', 'Beef', 1)`);
  memDb.public.none(`INSERT INTO product_ingredients (id, product_id, raw_ingredient, normalized_ingredient, ingredient_order) VALUES
    (10, 5, 'Chicken Meal', 'Chicken Meal', 2)`);

  // Product Prices: 6 records across 5 products; products 6, 7, 8 have no price
  memDb.public.none(`INSERT INTO product_prices (id, product_id, retailer, price_aud, pack_size, unit_price_aud_per_kg) VALUES
    (1, 1, 'PetCircle', 45.99, 2, 22.995)`);
  memDb.public.none(`INSERT INTO product_prices (id, product_id, retailer, price_aud, pack_size, unit_price_aud_per_kg) VALUES
    (2, 1, 'PetStock', 49.99, 2, 24.995)`);
  memDb.public.none(`INSERT INTO product_prices (id, product_id, retailer, price_aud, pack_size, unit_price_aud_per_kg) VALUES
    (3, 2, 'PetCircle', 39.99, 2, 19.995)`);
  memDb.public.none(`INSERT INTO product_prices (id, product_id, retailer, price_aud, pack_size, unit_price_aud_per_kg) VALUES
    (4, 3, 'PetStock', 55.00, 3, 18.333)`);
  memDb.public.none(`INSERT INTO product_prices (id, product_id, retailer, price_aud, pack_size, unit_price_aud_per_kg) VALUES
    (5, 4, 'PetCircle', 35.50, 2, 17.75)`);
  memDb.public.none(`INSERT INTO product_prices (id, product_id, retailer, price_aud, pack_size, unit_price_aud_per_kg) VALUES
    (6, 5, 'PetBarn', 65.00, 2.5, 26.00)`);

  // Import batches: 3 total, 2 completed
  memDb.public.none(`INSERT INTO import_batches (batch_id, source_type, rows_total, rows_success, rows_failed, status, completed_at) VALUES
    ('batch-001-xxxx', 'csv', 5, 5, 0, 'completed', '2026-06-10T10:00:00Z')`);
  memDb.public.none(`INSERT INTO import_batches (batch_id, source_type, rows_total, rows_success, rows_failed, status, completed_at) VALUES
    ('batch-002-xxxx', 'json', 10, 8, 2, 'completed', '2026-06-13T15:00:00Z')`);
  memDb.public.none(`INSERT INTO import_batches (batch_id, source_type, rows_total, rows_success, rows_failed, status) VALUES
    ('batch-003-xxxx', 'connector', 3, 0, 0, 'running')`);
}

describe('Metrics API', () => {
  let app: express.Express;

  describe('GET /api/metrics/data-quality — with seed data', () => {
    beforeEach(async () => {
      vi.resetModules();

      const memDb = createTestDb();
      seedMetricsData(memDb);
      setupDbMock(memDb);

      const { default: testApp } = await import('../src/index');
      app = testApp;
    });

    it('should return success with correct shape', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      // Check all top-level keys exist
      expect(data).toHaveProperty('brands');
      expect(data).toHaveProperty('products');
      expect(data).toHaveProperty('ingredients');
      expect(data).toHaveProperty('prices');
      expect(data).toHaveProperty('nutrition');
      expect(data).toHaveProperty('confidence');
      expect(data).toHaveProperty('imports');
    });

    it('should report correct brand counts', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const brands = res.body.data.brands;
      expect(brands.total).toBe(5); // 5 brands inserted
      expect(brands.verified).toBe(4); // 4 brands used in products
      expect(brands.verified_pct).toBe(80.0); // 4/5 * 100
    });

    it('should report correct product counts', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const prods = res.body.data.products;
      expect(prods.total).toBe(8);
      expect(prods.verified).toBe(7); // all except UNVERIFIED (product 8)
      expect(prods.verified_pct).toBe(87.5); // 7/8 * 100
    });

    it('should report correct species distribution', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const bySpecies = res.body.data.products.by_species;
      expect(bySpecies.CAT).toBe(4);
      expect(bySpecies.DOG).toBe(4);
    });

    it('should report correct life_stage distribution', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const byLifeStage = res.body.data.products.by_life_stage;
      expect(byLifeStage.ADULT).toBe(2);
      expect(byLifeStage.SENIOR).toBe(2);
      expect(byLifeStage.KITTEN).toBe(1);
      expect(byLifeStage.PUPPY).toBe(1);
      expect(byLifeStage.ALL_LIFE_STAGES).toBe(2);
    });

    it('should report correct ingredient stats including normalization metrics', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const ing = res.body.data.ingredients;
      expect(ing.total_ingredient_records).toBe(10);
      expect(ing.unique_ingredients).toBe(7); // Chicken Meal appears twice
      expect(ing.normalized_pct).toBe(80.0); // 8 of 10 have normalized_ingredient
      // A2: new normalization metrics
      expect(ing.raw_count).toBe(10);
      expect(ing.normalized_count).toBe(8);
      expect(ing.normalization_ratio).toBe(0.80);
    });

    it('should report correct price stats', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const prices = res.body.data.prices;
      expect(prices.total_price_records).toBe(6);
      expect(prices.products_with_prices).toBe(5);
      expect(prices.missing_price_pct).toBe(37.5); // 3 of 8 products missing
    });

    it('should report correct nutrition stats', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const nutrition = res.body.data.nutrition;
      expect(nutrition.products_with_nutrition).toBe(6);
      expect(nutrition.missing_nutrition_pct).toBe(25.0); // 2 of 8 missing
      // avg_field_completeness: see calculation below
      expect(nutrition.avg_field_completeness).toBeGreaterThan(0);
      expect(nutrition.avg_field_completeness).toBeLessThanOrEqual(1);
    });

    it('should compute avg_field_completeness between 0 and 1', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const completeness = res.body.data.nutrition.avg_field_completeness;
      // Product 1: 5/12, Product 2: 3/12, Product 3: 1/12,
      // Product 4: 6/12, Product 5: 12/12, Product 6: 1/12
      // Average = (5+3+1+6+12+1)/12/6 = 28/72 = 0.3889
      expect(completeness).toBeCloseTo(0.39, 1);
    });

    it('should report correct confidence stats with 3-tier distribution', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const conf = res.body.data.confidence;
      // avg: (0.95+0.85+0.80+0.75+0.60+0.55+0.40+0.10)/8 = 5.0/8 = 0.625
      expect(conf.avg_confidence_score).toBeCloseTo(0.63, 1);

      // 3-tier confidence_distribution
      const dist = conf.confidence_distribution;
      expect(dist.high).toBe(3);   // >= 0.8: 0.95, 0.85, 0.80
      expect(dist.medium).toBe(2); // >= 0.6 and < 0.8: 0.75, 0.60
      expect(dist.low).toBe(3);    // < 0.6: 0.55, 0.40, 0.10
    });

    it('should report correct verification_status breakdown', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const byStatus = res.body.data.confidence.by_verification_status;
      expect(byStatus.UNVERIFIED).toBe(1);
      expect(byStatus.SINGLE_SOURCE).toBe(3);
      expect(byStatus.MULTI_SOURCE).toBe(3);
      expect(byStatus.MANUALLY_VERIFIED).toBe(1);
    });

    it('should report correct import stats', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const imports = res.body.data.imports;
      expect(imports.total_batches).toBe(3);
      expect(imports.last_import).toBe('2026-06-13T15:00:00Z');
      expect(imports.total_rows_success).toBe(13); // 5 + 8
      expect(imports.total_rows_failed).toBe(2);  // 0 + 2
    });

    it('should compute overall_quality_score in 0-1 range', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const score = res.body.data.overall_quality_score;
      // nutrition_pct=0.75, price_pct=0.625, verified=0.875, norm=0.80, conf=0.625
      // 0.75*0.25 + 0.625*0.20 + 0.875*0.20 + 0.80*0.20 + 0.625*0.15 = 0.74125
      expect(score).toBe(0.74);
    });
  });

  describe('GET /api/metrics/data-quality — empty DB', () => {
    beforeEach(async () => {
      vi.resetModules();

      const memDb = createTestDb();
      // Don't seed any data — empty DB
      setupDbMock(memDb);

      const { default: testApp } = await import('../src/index');
      app = testApp;
    });

    it('should return all zeros for empty database', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.brands.total).toBe(0);
      expect(data.brands.verified).toBe(0);
      expect(data.brands.verified_pct).toBe(0);

      expect(data.products.total).toBe(0);
      expect(data.products.verified).toBe(0);
      expect(data.products.verified_pct).toBe(0);
      expect(data.products.by_species.CAT).toBe(0);
      expect(data.products.by_species.DOG).toBe(0);

      expect(data.ingredients.total_ingredient_records).toBe(0);
      expect(data.ingredients.unique_ingredients).toBe(0);
      expect(data.ingredients.normalized_pct).toBe(0);
      expect(data.ingredients.raw_count).toBe(0);
      expect(data.ingredients.normalized_count).toBe(0);
      expect(data.ingredients.normalization_ratio).toBe(0);

      expect(data.prices.total_price_records).toBe(0);
      expect(data.prices.products_with_prices).toBe(0);
      expect(data.prices.missing_price_pct).toBe(0);

      expect(data.nutrition.products_with_nutrition).toBe(0);
      expect(data.nutrition.missing_nutrition_pct).toBe(0);
      expect(data.nutrition.avg_field_completeness).toBe(0);

      expect(data.confidence.avg_confidence_score).toBe(0);

      expect(data.imports.total_batches).toBe(0);
      expect(data.imports.last_import).toBeNull();
      expect(data.imports.total_rows_success).toBe(0);
      expect(data.imports.total_rows_failed).toBe(0);

      expect(data.overall_quality_score).toBe(0);
    });

    it('should have correct confidence_distribution keys in confidence', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const dist = res.body.data.confidence.confidence_distribution;
      expect(dist).toHaveProperty('high');
      expect(dist).toHaveProperty('medium');
      expect(dist).toHaveProperty('low');
      expect(dist.high).toBe(0);
      expect(dist.medium).toBe(0);
      expect(dist.low).toBe(0);
    });

    it('should have all life_stage keys in by_life_stage', async () => {
      const res = await request(app).get('/api/metrics/data-quality');
      const byStage = res.body.data.products.by_life_stage;
      expect(byStage).toHaveProperty('ADULT');
      expect(byStage).toHaveProperty('SENIOR');
      expect(byStage).toHaveProperty('KITTEN');
      expect(byStage).toHaveProperty('PUPPY');
      expect(byStage).toHaveProperty('ALL_LIFE_STAGES');
    });
  });
});
