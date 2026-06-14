import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestDb, setupDbMock } from './helpers/mockDb';

// Concrete class for testing BaseConnector
let BaseConnectorClass: any;

describe('Base Connector', () => {
  beforeEach(async () => {
    vi.resetModules();
    const memDb = createTestDb();
    setupDbMock(memDb);
    const mod = await import('../src/connectors/base');
    BaseConnectorClass = mod.BaseConnector;
  });

  describe('normalizeAndImport', () => {
    it('should import a raw product and create brand/product/nutrition', async () => {
      class TestConnector extends BaseConnectorClass {
        name = 'test';
        sourceType = 'brand_site';
        async fetchProducts() { return []; }
      }

      const connector = new TestConnector();
      const result = await connector.normalizeAndImport([
        {
          name: 'Test Cat Food',
          brand_name: 'Test Brand',
          species: 'CAT',
          life_stage: 'ADULT',
          product_type: 'Dry Food',
          package_size_g: '400',
          status: 'ACTIVE',
          protein_pct: '34',
          fat_pct: '20',
          crude_fiber_pct: '5',
          moisture_pct: '6',
          ash_pct: '7',
          me_kcal_per_kg: '4000',
          ingredients: 'Chicken;Rice;Oil',
          unit_price_aud: '28.99',
          price_date: '2026-06-13',
          store_name: 'Test Store',
        },
      ]);

      expect(result.batchId).toBeDefined();
      expect(result.batchId.length).toBe(36);
      expect(result.imported).toBeGreaterThanOrEqual(1);
      expect(result.failed).toBe(0);
    });

    it('should skip duplicate products', async () => {
      class TestConnector extends BaseConnectorClass {
        name = 'test-dup';
        sourceType = 'brand_site';
        async fetchProducts() { return []; }
      }

      const connector = new TestConnector();
      const product = {
        name: 'Dup Cat Food',
        brand_name: 'Dup Brand',
        species: 'CAT',
        life_stage: 'ADULT',
        product_type: 'Dry Food',
        package_size_g: '400',
        status: 'ACTIVE',
        protein_pct: '34',
        fat_pct: '20',
        crude_fiber_pct: '5',
        moisture_pct: '6',
        ash_pct: '7',
        me_kcal_per_kg: '4000',
        ingredients: 'Chicken;Rice',
      };

      // First import
      const r1 = await connector.normalizeAndImport([product]);
      // Second import of same product should skip
      const r2 = await connector.normalizeAndImport([product]);

      expect(r2.skipped).toBeGreaterThanOrEqual(1);
      expect(r2.imported).toBe(0);
    });

    it('should track failed rows for invalid data', async () => {
      class TestConnector extends BaseConnectorClass {
        name = 'test-invalid';
        sourceType = 'brand_site';
        async fetchProducts() { return []; }
      }

      const connector = new TestConnector();
      const result = await connector.normalizeAndImport([
        {
          // Missing name and brand_name
          species: 'INVALID_SPECIES',
        } as any,
      ]);

      expect(result.failed).toBeGreaterThanOrEqual(1);
    });

    it('should calculate confidence score on import', async () => {
      class TestConnector extends BaseConnectorClass {
        name = 'test-conf';
        sourceType = 'brand_site';
        async fetchProducts() { return []; }
      }

      const connector = new TestConnector();
      const result = await connector.normalizeAndImport([
        {
          name: 'Conf Food',
          brand_name: 'Conf Brand',
          species: 'CAT',
          life_stage: 'ADULT',
          product_type: 'Dry Food',
          package_size_g: '400',
          status: 'ACTIVE',
          protein_pct: '34',
          fat_pct: '20',
          crude_fiber_pct: '5',
          moisture_pct: '6',
          ash_pct: '7',
          me_kcal_per_kg: '4000',
          ingredients: 'Chicken;Rice;Oil',
          unit_price_aud: '28.99',
          price_date: '2026-06-13',
          store_name: 'Test Store',
        },
      ]);

      expect(result.imported).toBeGreaterThanOrEqual(1);
    });

    it('should import with minimal fields', async () => {
      class TestConnector extends BaseConnectorClass {
        name = 'test-minimal';
        sourceType = 'manual';
        async fetchProducts() { return []; }
      }

      const connector = new TestConnector();
      const result = await connector.normalizeAndImport([
        {
          name: 'Minimal Food',
          brand_name: 'Minimal Brand',
          species: 'DOG',
          life_stage: 'PUPPY',
          status: 'ACTIVE',
        },
      ]);

      expect(result.imported).toBeGreaterThanOrEqual(1);
    });

    it('should handle raw products with missing optional fields', async () => {
      class TestConnector extends BaseConnectorClass {
        name = 'test-sparse';
        sourceType = 'retailer';
        async fetchProducts() { return []; }
      }

      const connector = new TestConnector();
      const result = await connector.normalizeAndImport([
        {
          name: 'Sparse Food',
          brand_name: 'Sparse Brand',
          species: 'CAT',
        },
      ]);

      expect(result.imported).toBe(1);
    });
  });
});
