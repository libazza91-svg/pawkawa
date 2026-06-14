import { describe, it, expect } from 'vitest';
import { calcConfidenceScore, calcVerificationStatus, mergeConfidence } from '../src/connectors/confidence';

describe('Confidence Calculator', () => {
  describe('calcConfidenceScore', () => {
    it('should return 0.9 for brand_site with all fields filled', () => {
      const row: Record<string, unknown> = {
        name: 'Test',
        brand_name: 'Test Brand',
        species: 'CAT',
        life_stage: 'ADULT',
        protein_pct: 34,
        fat_pct: 20,
        crude_fiber_pct: 5,
        moisture_pct: 6,
        ingredients: 'Chicken; Rice',
        unit_price_aud: 25,
      };
      const score = calcConfidenceScore(row, 'brand_site');
      expect(score).toBe(0.9);
    });

    it('should return 0.7 for open_pet_food_facts with all fields', () => {
      const row: Record<string, unknown> = {
        name: 'Test',
        brand_name: 'Test Brand',
        species: 'CAT',
        life_stage: 'ADULT',
        protein_pct: 34,
        fat_pct: 20,
        crude_fiber_pct: 5,
        moisture_pct: 6,
        ingredients: 'Chicken',
        unit_price_aud: 25,
      };
      const score = calcConfidenceScore(row, 'open_pet_food_facts');
      expect(score).toBe(0.7);
    });

    it('should return 0.5 for retailer with all fields', () => {
      const row: Record<string, unknown> = {
        name: 'Test',
        brand_name: 'Test Brand',
        species: 'CAT',
        life_stage: 'ADULT',
        protein_pct: 34,
        fat_pct: 20,
        crude_fiber_pct: 5,
        moisture_pct: 6,
        ingredients: 'Chicken',
        unit_price_aud: 25,
      };
      const score = calcConfidenceScore(row, 'retailer');
      expect(score).toBe(0.5);
    });

    it('should return 0.3 for manual with all fields', () => {
      const row: Record<string, unknown> = {
        name: 'Test',
        brand_name: 'Test Brand',
        species: 'CAT',
        life_stage: 'ADULT',
        protein_pct: 34,
        fat_pct: 20,
        crude_fiber_pct: 5,
        moisture_pct: 6,
        ingredients: 'Chicken',
        unit_price_aud: 25,
      };
      const score = calcConfidenceScore(row, 'manual');
      expect(score).toBe(0.3);
    });

    it('should scale with field completeness', () => {
      // Only 5 out of 10 fields filled
      const row: Record<string, unknown> = {
        name: 'Test',
        brand_name: 'Test Brand',
        species: 'CAT',
        life_stage: 'ADULT',
        protein_pct: 34,
      };
      const score = calcConfidenceScore(row, 'brand_site');
      expect(score).toBe(0.45); // 0.9 * 5/10
    });

    it('should return 0 for empty row', () => {
      const row: Record<string, unknown> = {};
      const score = calcConfidenceScore(row, 'brand_site');
      expect(score).toBe(0);
    });

    it('should use default weight 0.3 for unknown source type', () => {
      const row: Record<string, unknown> = {
        name: 'Test',
        brand_name: 'Test',
        species: 'CAT',
        life_stage: 'ADULT',
        protein_pct: 34,
        fat_pct: 20,
        crude_fiber_pct: 5,
        moisture_pct: 6,
        ingredients: 'Chicken',
        unit_price_aud: 25,
      };
      const score = calcConfidenceScore(row, 'unknown_source');
      expect(score).toBe(0.3);
    });

    it('should round to 3 decimal places', () => {
      const row: Record<string, unknown> = {
        name: 'Test',
        brand_name: 'Test',
        species: 'CAT',
        life_stage: 'ADULT',
        protein_pct: 34,
        fat_pct: 20,
        crude_fiber_pct: 5,
      };
      // 7/10 = 0.7, * 0.9 = 0.63
      const score = calcConfidenceScore(row, 'brand_site');
      expect(score).toBe(0.63);
    });
  });

  describe('calcVerificationStatus', () => {
    it('should return UNVERIFIED for 0 sources', () => {
      expect(calcVerificationStatus(0)).toBe('UNVERIFIED');
    });

    it('should return SINGLE_SOURCE for 1 source', () => {
      expect(calcVerificationStatus(1)).toBe('SINGLE_SOURCE');
    });

    it('should return MULTI_SOURCE for 2 sources', () => {
      expect(calcVerificationStatus(2)).toBe('MULTI_SOURCE');
    });

    it('should return MULTI_SOURCE for 5 sources', () => {
      expect(calcVerificationStatus(5)).toBe('MULTI_SOURCE');
    });
  });

  describe('mergeConfidence', () => {
    it('should increment source_count', () => {
      const result = mergeConfidence(1, 'brand_site', 0.9, 0.7);
      expect(result.source_count).toBe(2);
    });

    it('should calculate weighted average', () => {
      // existing: 1 source, score 0.9. new: score 0.5
      // merged = (0.9 * 1 + 0.5) / 2 = 0.7
      const result = mergeConfidence(1, 'retailer', 0.9, 0.5);
      expect(result.confidence_score).toBe(0.7);
    });

    it('should return MULTI_SOURCE when source_count reaches 2', () => {
      const result = mergeConfidence(1, 'brand_site', 0.9, 0.9);
      expect(result.verification_status).toBe('MULTI_SOURCE');
    });

    it('should handle 0 existing sources', () => {
      const result = mergeConfidence(0, 'brand_site', 0, 0.9);
      expect(result.source_count).toBe(1);
      expect(result.confidence_score).toBe(0.9);
      expect(result.verification_status).toBe('SINGLE_SOURCE');
    });
  });
});
