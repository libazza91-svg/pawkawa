import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { verifiedProductsRouter } from '../src/routes/verified-products';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/verified-products', verifiedProductsRouter);
  return app;
}

describe('Verified Product API V1', () => {
  const app = createApp();

  it('returns frontend-ready list item shape', async () => {
    const res = await request(app).get('/api/verified-products');
    expect(res.status).toBe(200);
    expect(res.body.data.items[0]).toEqual(
      expect.objectContaining({
        product_id: expect.any(String),
        slug: expect.any(String),
        product_name: expect.any(String),
        brand_name: expect.any(String),
        species: expect.any(String),
        life_stage: expect.any(String),
        market_availability: expect.any(String),
        trust_grade: expect.any(String),
        confidence: expect.any(Number),
        quick_verdict: expect.any(String),
        strengths: expect.any(Array),
        best_for: expect.any(Array),
        considerations: expect.any(Array),
        price_from: expect.any(Number),
        unit_price_per_kg: expect.any(Number),
        primary_image_url: expect.any(String),
        source_count: expect.any(Number),
      }),
    );
  });

  it('supports pagination first page', async () => {
    const res = await request(app).get('/api/verified-products?page=1&pageSize=2');
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.pagination).toEqual({ page: 1, pageSize: 2, total: expect.any(Number) });
  });

  it('supports pagination second page', async () => {
    const res = await request(app).get('/api/verified-products?page=2&pageSize=2');
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.pagination.page).toBe(2);
  });

  it('filters by species', async () => {
    const res = await request(app).get('/api/verified-products?species=CAT');
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items.every((item: { species: string }) => item.species === 'CAT')).toBe(true);
  });

  it('filters by life_stage', async () => {
    const res = await request(app).get('/api/verified-products?life_stage=ADULT');
    expect(res.body.data.items.every((item: { life_stage: string }) => item.life_stage === 'ADULT')).toBe(true);
  });

  it('filters by trust_grade', async () => {
    const res = await request(app).get('/api/verified-products?trust_grade=GOLD');
    expect(res.body.data.items.every((item: { trust_grade: string }) => item.trust_grade === 'GOLD')).toBe(true);
  });

  it('filters by market_availability', async () => {
    const res = await request(app).get('/api/verified-products?market_availability=LIMITED');
    expect(res.body.data.items.every((item: { market_availability: string }) => item.market_availability === 'LIMITED')).toBe(true);
  });

  it('scores products when filtered by need_code', async () => {
    const res = await request(app).get('/api/verified-products?need_code=SENSITIVE_STOMACH');
    expect(res.body.data.items[0]).toHaveProperty('suitability_score');
    expect(res.body.data.items[0]).toHaveProperty('suitability_grade');
  });

  it('sorts by confidence by default', async () => {
    const res = await request(app).get('/api/verified-products');
    const confidences = res.body.data.items.map((item: { confidence: number }) => item.confidence);
    expect(confidences).toEqual([...confidences].sort((a, b) => b - a));
  });

  it('sorts by price_per_kg ascending', async () => {
    const res = await request(app).get('/api/verified-products?sort=price_per_kg');
    const prices = res.body.data.items.map((item: { unit_price_per_kg: number }) => item.unit_price_per_kg);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('sorts by suitability_score descending when requested', async () => {
    const res = await request(app).get('/api/verified-products?need_code=WEIGHT_CONTROL&sort=suitability_score');
    const scores = res.body.data.items.map((item: { suitability_score: number }) => item.suitability_score ?? 0);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('returns product detail by slug', async () => {
    const res = await request(app).get('/api/verified-products/black-hawk-indoor-chicken-rice');
    expect(res.status).toBe(200);
    expect(res.body.data.identity.slug).toBe('black-hawk-indoor-chicken-rice');
    expect(res.body.data.quick_verdict).toContain('Indoor Chicken & Rice');
  });

  it('returns 404 for missing product detail', async () => {
    const res = await request(app).get('/api/verified-products/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('includes suitability results in detail', async () => {
    const res = await request(app).get('/api/verified-products/black-hawk-indoor-chicken-rice');
    expect(res.body.data.suitability_results.length).toBeGreaterThan(0);
    expect(res.body.data.suitability_results[0]).toHaveProperty('grade');
  });

  it('includes evidence refs in detail', async () => {
    const res = await request(app).get('/api/verified-products/black-hawk-indoor-chicken-rice');
    expect(res.body.data.evidence_refs.length).toBeGreaterThan(0);
  });

  it('includes image metadata in detail', async () => {
    const res = await request(app).get('/api/verified-products/black-hawk-indoor-chicken-rice');
    expect(res.body.data.image_metadata[0]).toHaveProperty('image_url');
    expect(res.body.data.image_metadata[0]).toHaveProperty('source_url');
  });

  it('includes grouped retail offers in detail', async () => {
    const res = await request(app).get('/api/verified-products/black-hawk-indoor-chicken-rice');
    expect(res.body.data.retail_offers[0]).toEqual(expect.objectContaining({ retailer: expect.any(String), unit_price_per_kg: expect.any(Number) }));
  });

  it('includes disclaimer flags in detail', async () => {
    const res = await request(app).get('/api/verified-products/black-hawk-indoor-chicken-rice');
    expect(res.body.data.disclaimer_flags).toHaveProperty('disclaimer_required');
    expect(res.body.data.disclaimer_flags).toHaveProperty('medical_caution');
  });

  it('keeps raw nutrition as a secondary section in detail payload', async () => {
    const res = await request(app).get('/api/verified-products/black-hawk-indoor-chicken-rice');
    expect(res.body.data.nutrition_profile).toEqual(expect.objectContaining({ protein: expect.any(Number), fat: expect.any(Number) }));
  });

  it('returns compare-ready shape', async () => {
    const res = await request(app).get('/api/verified-products/black-hawk-indoor-chicken-rice/compare-ready');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        product_id: expect.any(String),
        slug: 'black-hawk-indoor-chicken-rice',
        product_name: expect.any(String),
        brand_name: expect.any(String),
        trust_grade: expect.any(String),
        confidence: expect.any(Number),
        protein: expect.any(Number),
        fat: expect.any(Number),
        fiber: expect.any(Number),
        calories: expect.any(Number),
        price_per_kg: expect.any(Number),
        suitability_summary: expect.any(Object),
      }),
    );
  });

  it('returns compare-ready suitability when need_code is provided', async () => {
    const res = await request(app).get('/api/verified-products/black-hawk-indoor-chicken-rice/compare-ready?need_code=SENSITIVE_STOMACH');
    expect(res.body.data.suitability_summary.score).toEqual(expect.any(Number));
    expect(res.body.data.suitability_summary.grade).toEqual(expect.any(String));
  });

  it('returns 404 for missing compare-ready product', async () => {
    const res = await request(app).get('/api/verified-products/nope/compare-ready');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('does not require frontend-side interpretation for cards', async () => {
    const res = await request(app).get('/api/verified-products?species=CAT&need_code=INDOOR_CAT');
    const item = res.body.data.items[0];
    expect(item.quick_verdict.length).toBeGreaterThan(20);
    expect(item.strengths.length + item.best_for.length + item.considerations.length).toBeGreaterThan(0);
  });
});
