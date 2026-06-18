import { describe, expect, it } from 'vitest';
import {
  buildNeedProfile,
  buildProductDecisionSummary,
  buildProductEvidence,
  gradeSuitabilityScore,
  listNeedProfiles,
  scoreProductForNeed,
  NeedProfileCode,
} from '../src/domain';
import { verifiedProducts } from '../src/verified-products/catalog';

const forbiddenMedicalClaims = [
  /treats gastritis/i,
  /cures stomach issues/i,
  /helps recover from surgery/i,
  /recommended for disease/i,
  /prevents heart disease/i,
];

function allOutputStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allOutputStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(allOutputStrings);
  return [];
}

describe('Decision Model V1', () => {
  describe('NeedProfile definitions', () => {
    const expectedCodes: NeedProfileCode[] = [
      'INDOOR_CAT',
      'SENSITIVE_STOMACH',
      'WEIGHT_CONTROL',
      'SENIOR_SUPPORT',
      'RECOVERY_SUPPORT',
      'KITTEN_GROWTH',
      'EVERYDAY_ADULT',
    ];

    it.each(expectedCodes)('defines %s as a CAT-only profile', (code) => {
      const profile = buildNeedProfile(code);
      expect(profile.code).toBe(code);
      expect(profile.species).toBe('CAT');
      expect(profile.constraints.length).toBeGreaterThan(0);
      expect(profile.label.length).toBeGreaterThan(2);
      expect(profile.user_facing_summary.length).toBeGreaterThan(10);
    });

    it('defines exactly the seven MVP need profiles', () => {
      expect(listNeedProfiles().map((profile) => profile.code).sort()).toEqual([...expectedCodes].sort());
    });

    it('keeps recovery support vet-first', () => {
      const profile = buildNeedProfile('RECOVERY_SUPPORT');
      expect(profile.caution_level).toBe('HIGH');
      expect(profile.requires_vet_disclaimer).toBe(true);
      expect(profile.user_facing_summary).toContain('veterinary guidance');
    });

    it('does not define dog profiles', () => {
      const codes = listNeedProfiles().map((profile) => profile.code);
      expect(codes.some((code) => code.includes('DOG') || code.includes('PUPPY'))).toBe(false);
    });
  });

  describe('SuitabilityResult scoring', () => {
    it.each([
      [95, 'EXCELLENT'],
      [89, 'GOOD'],
      [74, 'FAIR'],
      [54, 'POOR'],
    ] as const)('maps %s to %s', (score, grade) => {
      expect(gradeSuitabilityScore(score)).toBe(grade);
    });

    it('scores sensitive stomach products with matched reasons and evidence refs', () => {
      const product = verifiedProducts.find((item) => item.id === 'black-hawk-indoor-chicken-rice')!;
      const result = scoreProductForNeed(product, buildNeedProfile('SENSITIVE_STOMACH'));

      expect(result.need_code).toBe('SENSITIVE_STOMACH');
      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(result.grade).toMatch(/EXCELLENT|GOOD/);
      expect(result.matched_reasons.join(' ')).toContain('sensitive digestion');
      expect(result.evidence_refs.length).toBeGreaterThan(0);
      expect(result.disclaimer_required).toBe(true);
    });

    it('penalizes high fat for sensitive stomach comparison', () => {
      const product = verifiedProducts.find((item) => item.id === 'ziwi-peak-mackerel-lamb')!;
      const result = scoreProductForNeed(product, buildNeedProfile('SENSITIVE_STOMACH'));

      expect(result.caution_reasons.join(' ')).toContain('Moderate fat');
      expect(result.disclaimer_required).toBe(true);
    });

    it('scores weight control fit higher for lower-fat weight-control food', () => {
      const lowFat = verifiedProducts.find((item) => item.id === 'royal-canin-sterilised-37')!;
      const highFat = verifiedProducts.find((item) => item.id === 'feline-natural-lamb-feast')!;
      const need = buildNeedProfile('WEIGHT_CONTROL');

      expect(scoreProductForNeed(lowFat, need).score).toBeGreaterThan(scoreProductForNeed(highFat, need).score);
    });

    it('scores kitten growth fit for all-life-stage high-protein products', () => {
      const product = verifiedProducts.find((item) => item.id === 'feline-natural-lamb-feast')!;
      const result = scoreProductForNeed(product, buildNeedProfile('KITTEN_GROWTH'));

      expect(result.matched_reasons.join(' ')).toContain('All life stages');
      expect(result.matched_reasons.join(' ')).toContain('Higher protein');
    });

    it('records missing data instead of hiding it', () => {
      const product = { ...verifiedProducts[0], nutrition: { ...verifiedProducts[0].nutrition, fiber: undefined as unknown as number } };
      const result = scoreProductForNeed(product, buildNeedProfile('WEIGHT_CONTROL'));

      expect(result.missing_data).toContain('nutrition.fiber');
    });

    it('returns POOR for cat-only need when product species is not CAT', () => {
      const dogProduct = verifiedProducts.find((item) => item.species === 'DOG')!;
      const result = scoreProductForNeed(dogProduct, buildNeedProfile('INDOOR_CAT'));

      expect(result.grade).toBe('POOR');
      expect(result.caution_reasons.join(' ')).toContain('Species mismatch');
    });
  });

  describe('Evidence layer', () => {
    it('generates evidence for key product fields', () => {
      const evidence = buildProductEvidence(verifiedProducts[0]);
      expect(evidence.map((item) => item.field)).toEqual(
        expect.arrayContaining(['confidence', 'nutrition.protein', 'nutrition.fat', 'life_stage', 'unit_price_aud_per_kg']),
      );
    });

    it('generates stable evidence refs on suitability results', () => {
      const result = scoreProductForNeed(verifiedProducts[0], buildNeedProfile('EVERYDAY_ADULT'));
      expect(result.evidence_refs[0]).toHaveProperty('evidence_id');
      expect(result.evidence_refs[0]).toHaveProperty('field');
      expect(result.evidence_refs[0]).toHaveProperty('source_name');
    });

    it('adds evidence refs to product decision summaries', () => {
      const summary = buildProductDecisionSummary(verifiedProducts[0]);
      expect(summary.evidence_refs.length).toBeGreaterThan(0);
      expect(summary.suitability.length).toBeGreaterThan(0);
    });
  });

  describe('Medical safety boundary', () => {
    it('does not emit forbidden treatment claims from need profiles', () => {
      const text = allOutputStrings(listNeedProfiles()).join(' ');
      for (const forbidden of forbiddenMedicalClaims) {
        expect(text).not.toMatch(forbidden);
      }
    });

    it('does not emit forbidden treatment claims from suitability results', () => {
      const outputs = listNeedProfiles().flatMap((profile) =>
        verifiedProducts.filter((product) => product.species === 'CAT').map((product) => scoreProductForNeed(product, profile)),
      );
      const text = allOutputStrings(outputs).join(' ');
      for (const forbidden of forbiddenMedicalClaims) {
        expect(text).not.toMatch(forbidden);
      }
    });

    it('does not emit forbidden treatment claims from product summaries', () => {
      const text = allOutputStrings(verifiedProducts.map((product) => buildProductDecisionSummary(product))).join(' ');
      for (const forbidden of forbiddenMedicalClaims) {
        expect(text).not.toMatch(forbidden);
      }
    });
  });
});
