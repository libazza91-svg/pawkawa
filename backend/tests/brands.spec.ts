import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTestDb, seedProductsBrands, setupDbMock } from './helpers/mockDb';

describe('Brands API', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.resetModules();

    const memDb = createTestDb();
    seedProductsBrands(memDb);
    setupDbMock(memDb);

    const { default: testApp } = await import('../src/index');
    app = testApp;
  });

  describe('GET /api/brands — Brands List', () => {
    it('should return paginated brands list', async () => {
      const res = await request(app).get('/api/brands');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(4);
      expect(res.body.data.pagination).toEqual({ page: 1, pageSize: 20, total: 4 });
    });

    it('should support pagination', async () => {
      const res = await request(app).get('/api/brands?page=1&pageSize=2');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.pagination.pageSize).toBe(2);
      expect(res.body.data.pagination.total).toBe(4);
    });

    it('should support pagination page 2', async () => {
      const res = await request(app).get('/api/brands?page=2&pageSize=2');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.pagination.page).toBe(2);
    });

    it('should support country filter', async () => {
      const res = await request(app).get('/api/brands?country=NZ');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].name).toBe('Ziwi Peak');
    });
  });

  describe('GET /api/brands/:id — Brand Detail', () => {
    it('should return brand with products', async () => {
      const res = await request(app).get('/api/brands/1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.brand).toBeDefined();
      expect(res.body.data.brand.name).toBe('Royal Canin');
      expect(res.body.data.products).toHaveLength(2);
    });

    it('should return empty products array for brand with no products', async () => {
      const res = await request(app).get('/api/brands/4');
      expect(res.status).toBe(200);
      expect(res.body.data.brand.name).toBe('Black Hawk');
      expect(res.body.data.products).toEqual([]);
    });

    it('should return BRAND_NOT_FOUND for non-existent brand', async () => {
      const res = await request(app).get('/api/brands/999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BRAND_NOT_FOUND');
    });

    it('should reject non-numeric id', async () => {
      const res = await request(app).get('/api/brands/abc');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
    });
  });
});
