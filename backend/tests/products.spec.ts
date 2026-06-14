import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTestDb, seedProductsBrands, setupDbMock } from './helpers/mockDb';

describe('Products API', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.resetModules();

    const memDb = createTestDb();
    seedProductsBrands(memDb);
    setupDbMock(memDb);

    const { default: testApp } = await import('../src/index');
    app = testApp;
  });

  describe('GET /api/products — Product Query', () => {
    it('should return paginated products list', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(5);
      expect(res.body.data.pagination).toEqual({ page: 1, pageSize: 20, total: 5 });
    });

    it('should support page and pageSize', async () => {
      const res = await request(app).get('/api/products?page=1&pageSize=2');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.pagination.pageSize).toBe(2);
      expect(res.body.data.pagination.total).toBe(5);
    });

    it('should support species filter (CAT)', async () => {
      const res = await request(app).get('/api/products?species=CAT');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items.every((p: any) => p.species === 'CAT')).toBe(true);
    });

    it('should auto-uppercase species filter', async () => {
      const res = await request(app).get('/api/products?species=cat');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
    });

    it('should support lifeStage filter', async () => {
      const res = await request(app).get('/api/products?lifeStage=PUPPY');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].life_stage).toBe('PUPPY');
    });

    it('should support brand ILIKE search', async () => {
      const res = await request(app).get('/api/products?brand=royal');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
    });

    it('should support combined filters', async () => {
      const res = await request(app).get('/api/products?species=DOG&lifeStage=SENIOR');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].name).toContain('Senior');
    });

    it('should return empty items for no matches', async () => {
      const res = await request(app).get('/api/products?species=CAT&lifeStage=PUPPY');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.pagination.total).toBe(0);
    });

    it('should include brand_name in response', async () => {
      const res = await request(app).get('/api/products?pageSize=1');
      expect(res.status).toBe(200);
      expect(res.body.data.items[0]).toHaveProperty('brand_name');
    });

    it('should reject invalid species enum', async () => {
      const res = await request(app).get('/api/products?species=CATS');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
      expect(res.body.error.message).toContain('CAT, DOG');
    });

    it('should reject invalid lifeStage enum', async () => {
      const res = await request(app).get('/api/products?lifeStage=INVALID');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
    });
  });

  describe('GET /api/products/search — Product Search', () => {
    it('should search products by name', async () => {
      const res = await request(app).get('/api/products/search?q=Kitten');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].name).toContain('Kitten');
    });

    it('should search products by brand name', async () => {
      const res = await request(app).get('/api/products/search?q=Hill');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
    });

    it('should return empty on no match', async () => {
      const res = await request(app).get('/api/products/search?q=XYZNotExist');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
    });

    it('should support pagination', async () => {
      const res = await request(app).get('/api/products/search?q=Royal&pageSize=1&page=1');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should reject empty query', async () => {
      const res = await request(app).get('/api/products/search?q=');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/products/:id — Product Detail', () => {
    it('should return full product detail', async () => {
      const res = await request(app).get('/api/products/1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product).toBeDefined();
      expect(res.body.data.product.name).toBe('Royal Canin Kitten');
    });

    it('should include nutrition', async () => {
      const res = await request(app).get('/api/products/1');
      expect(res.body.data.nutrition).toBeDefined();
      expect(res.body.data.nutrition.protein_pct).toBe(34);
    });

    it('should include ingredients sorted by order', async () => {
      const res = await request(app).get('/api/products/1');
      expect(res.body.data.ingredients).toHaveLength(2);
      expect(res.body.data.ingredients[0].ingredient_order).toBe(1);
      expect(res.body.data.ingredients[1].ingredient_order).toBe(2);
    });

    it('should include prices sorted by unit_price', async () => {
      const res = await request(app).get('/api/products/1');
      expect(res.body.data.prices).toHaveLength(2);
      if (res.body.data.prices.length >= 2) {
        expect(res.body.data.prices[0].unit_price_aud_per_kg).toBeLessThanOrEqual(
          res.body.data.prices[1].unit_price_aud_per_kg
        );
      }
    });

    it('should include sources', async () => {
      const res = await request(app).get('/api/products/1');
      expect(res.body.data.sources).toHaveLength(1);
    });

    it('should return PRODUCT_NOT_FOUND for non-existent product', async () => {
      const res = await request(app).get('/api/products/999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should reject non-numeric id', async () => {
      const res = await request(app).get('/api/products/abc');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
    });
  });
});
