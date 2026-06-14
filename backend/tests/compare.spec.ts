import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTestDb, seedProductsBrands, setupDbMock } from './helpers/mockDb';

describe('Compare API', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.resetModules();

    const memDb = createTestDb();
    seedProductsBrands(memDb);
    setupDbMock(memDb);

    const { default: testApp } = await import('../src/index');
    app = testApp;
  });

  describe('POST /api/compare', () => {
    it('compares 2-4 real products by numeric product_ids', async () => {
      const res = await request(app).post('/api/compare').send({ product_ids: [1, 2] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toHaveLength(2);
      expect(res.body.data.products[0]).toHaveProperty('slug');
      expect(res.body.data.comparison.nutritionTable.length).toBeGreaterThan(0);
      expect(res.body.data.comparison.ingredientSets).toHaveLength(2);
    });

    it('compares products by product_slugs', async () => {
      const res = await request(app)
        .post('/api/compare')
        .send({ product_slugs: ['royal-canin-kitten', 'royal-canin-adult-cat'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.map((item: { slug: string }) => item.slug)).toEqual(
        expect.arrayContaining(['royal-canin-kitten', 'royal-canin-adult-cat'])
      );
    });

    it('rejects invalid compare payloads', async () => {
      const res = await request(app).post('/api/compare').send({ product_ids: [1] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
    });
  });

  describe('POST /api/compare/recommend', () => {
    it('returns suitability scoring and rationale from the shared rules layer', async () => {
      const res = await request(app).post('/api/compare/recommend').send({
        product_slugs: ['royal-canin-kitten', 'royal-canin-adult-cat'],
        species: 'CAT',
        age_years: 3,
        breed: 'RAGDOLL',
        health_conditions: ['GI_SENSITIVE'],
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.constraints.map((item: { code: string }) => item.code)).toContain('RAGDOLL_HCM_RISK');
      expect(res.body.data.recommendations.length).toBe(2);
      expect(res.body.data.recommendations[0]).toHaveProperty('suitability_score');
      expect(res.body.data).toHaveProperty('disclaimer');
    });

    it('validates species on compare recommendation requests', async () => {
      const res = await request(app).post('/api/compare/recommend').send({
        product_ids: [1, 2],
        species: 'BIRD',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
    });
  });
});
