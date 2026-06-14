import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateProductInsight, verifiedProducts } from '../src/intelligence/product-insight-engine';
import { buildHealthConstraints, buildRecommendationContext } from '../src/intelligence/recommendation-context-engine';
import { scoreProductSuitability } from '../src/intelligence/suitability-engine';
import { getRecoveryKnowledgeTopics } from '../src/intelligence/recovery-knowledge-base';
import { intelligenceRouter } from '../src/routes/intelligence';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/intelligence', intelligenceRouter);
  return app;
}

describe('Pet Intelligence Layer', () => {
  describe('product insight engine', () => {
    it('generates API-ready insight for every verified product', () => {
      const insights = verifiedProducts.map(generateProductInsight);
      expect(insights).toHaveLength(verifiedProducts.length);
      for (const insight of insights) {
        expect(insight.quick_verdict.length).toBeGreaterThan(20);
        expect(Array.isArray(insight.strengths)).toBe(true);
        expect(Array.isArray(insight.considerations)).toBe(true);
        expect(Array.isArray(insight.best_for)).toBe(true);
        expect(Array.isArray(insight.avoid_if)).toBe(true);
      }
    });

    it('flags high protein, premium price and high fat for Ziwi Peak', () => {
      const product = verifiedProducts.find((item) => item.id === 'ziwi-peak-mackerel-lamb')!;
      const insight = generateProductInsight(product);
      expect(insight.strengths).toContain('High Protein');
      expect(insight.strengths).toContain('Strong Source Verification');
      expect(insight.considerations).toContain('Above Average Price');
      expect(insight.considerations).toContain('High Fat');
      expect(insight.avoid_if).toContain('Fat Restriction Recommended');
    });

    it('flags value and watch-list ingredients where applicable', () => {
      const product = verifiedProducts.find((item) => item.id === 'ivory-coat-lamb-brown-rice')!;
      const insight = generateProductInsight(product);
      expect(insight.strengths).toContain('Good Everyday Value');
      expect(insight.considerations).toContain('Limited Verification Depth');
      expect(insight.considerations).toContain('Contains Watch-List Ingredients');
    });
  });

  describe('recommendation context engine', () => {
    it('builds GI-sensitive Ragdoll context without medical recommendation language', () => {
      const result = buildRecommendationContext({
        species: 'CAT',
        age_years: 3,
        breed: 'RAGDOLL',
        health_conditions: ['GI_SENSITIVE'],
      });

      expect(result.constraints.map((constraint) => constraint.code)).toEqual(
        expect.arrayContaining(['RAGDOLL_HCM_RISK', 'PREFER_DIGESTIBLE_GI_FOOD', 'AVOID_HIGH_FAT_GI'])
      );
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.warnings.join(' ')).toContain('comparison only');
      expect(result.warnings.join(' ')).not.toContain('recommended treatment');
    });

    it('penalizes high fat products for GI-sensitive profiles', () => {
      const constraints = buildHealthConstraints({ species: 'CAT', age_years: 3, health_conditions: ['GI_SENSITIVE'] });
      const highFat = verifiedProducts.find((item) => item.id === 'ziwi-peak-mackerel-lamb')!;
      const lowerFat = verifiedProducts.find((item) => item.id === 'black-hawk-indoor-chicken-rice')!;
      const highFatScore = scoreProductSuitability(highFat, constraints);
      const lowerFatScore = scoreProductSuitability(lowerFat, constraints);

      expect(highFatScore.cautions).toContain('High fat for GI-sensitive profile');
      expect(lowerFatScore.reasons).toContain('Sensitive stomach fit');
      expect(lowerFatScore.suitability_score).toBeGreaterThan(highFatScore.suitability_score);
    });

    it('adds prescription and post-surgery constraints when provided', () => {
      const result = buildRecommendationContext({
        species: 'DOG',
        age_years: 7,
        health_conditions: ['POST_SURGERY'],
        vet_prescription_required: true,
      });

      expect(result.constraints.map((constraint) => constraint.code)).toEqual(
        expect.arrayContaining(['PRESCRIPTION_REQUIRED', 'RECOVERY_PLAN_FIRST', 'PREFER_CALORIE_DENSE_RECOVERY'])
      );
      expect(result.recommendations.every((item) => item.cautions.includes('Prescription diet may override retail-food suitability'))).toBe(true);
    });
  });

  describe('recovery knowledge base', () => {
    it('keeps recovery nutrition separate from retail recommendations', () => {
      const topics = getRecoveryKnowledgeTopics();
      expect(topics.length).toBeGreaterThanOrEqual(4);
      expect(topics.find((topic) => topic.id === 'gastrointestinal_upset_recovery')?.avoid).toContain('Fatty leftovers');
      expect(topics.every((topic) => topic.source_labels.length > 0)).toBe(true);
    });
  });

  describe('intelligence API', () => {
    it('GET /api/intelligence/product/:id returns V1 insight shape', async () => {
      const response = await request(createApp()).get('/api/intelligence/product/black-hawk-indoor-chicken-rice');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.quick_verdict).toContain('Indoor Chicken & Rice');
      expect(response.body.data.best_for).toContain('Sensitive Stomach');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('trust_grade');
      expect(response.body.data.considerations.length).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/intelligence/product/:id returns 404 for unknown products', async () => {
      const response = await request(createApp()).get('/api/intelligence/product/unknown-product');
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('POST /api/intelligence/context returns constraints, recommendations and warnings', async () => {
      const response = await request(createApp())
        .post('/api/intelligence/context')
        .send({ species: 'CAT', age_years: 3, breed: 'RAGDOLL', health_conditions: ['GI_SENSITIVE'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.constraints.map((constraint: { code: string }) => constraint.code)).toContain('RAGDOLL_HCM_RISK');
      expect(response.body.data.recommendations[0]).toHaveProperty('suitability_score');
      expect(response.body.data.warnings.join(' ')).toContain('veterinary guidance');
    });

    it('POST /api/intelligence/context validates input', async () => {
      const response = await request(createApp()).post('/api/intelligence/context').send({ species: 'CAT', age_years: -1 });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
    });

    it('GET /api/intelligence/recovery returns backend-owned recovery topics', async () => {
      const response = await request(createApp()).get('/api/intelligence/recovery');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(4);
      expect(response.body.data[0]).toHaveProperty('owner_summary');
    });
  });
});
