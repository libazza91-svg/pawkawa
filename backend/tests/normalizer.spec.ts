/**
 * Normalizer Tests — 4-Stage Pipeline
 */
import { describe, it, expect } from 'vitest';
import {
  preprocess,
  normalizeToken,
  normalizeIngredient,
  normalizeIngredients,
} from '../src/normalizer/engine';
import { evaluateHealth, getRules, scoreIngredient } from '../src/normalizer/health-mapper';
import { buildAliasIndex, INGREDIENT_DICTIONARY } from '../src/normalizer/ingredient-dictionary';
import { HEALTH_RULES } from '../src/normalizer/health-mapper';

// ============================================================
// Stage 1: Preprocessing
// ============================================================

describe('Stage 1: Preprocessing (R1-R10)', () => {
  it('R1: trims whitespace and lowercases', () => {
    expect(preprocess('  Chicken Meal  ')).toEqual(['chicken meal']);
  });

  it('R2: removes parenthetical modifiers', () => {
    expect(preprocess('Chicken (source of glucosamine)')).toEqual(['chicken']);
  });

  it('R3: keeps parenthetical percentages', () => {
    const result = preprocess('Chicken Meal (min. 4%)');
    expect(result).toContain('chicken meal (min. 4%)');
  });

  it('R4: splits comma-separated compounds', () => {
    const result = preprocess('Chicken, Rice, Vegetables');
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result).toContain('chicken');
    expect(result).toContain('rice');
  });

  it('R5: splits slash-separated terms', () => {
    const result = preprocess('Chicken/Lamb');
    expect(result).toContain('chicken');
    expect(result).toContain('lamb');
  });

  it('R6: removes brand prefixes', () => {
    expect(preprocess("Hill's Chicken")).toEqual(['chicken']);
  });

  it('R8: removes ordinal prefixes', () => {
    expect(preprocess('First Ingredient: Chicken')).toEqual(['chicken']);
  });

  it('R9: normalizes hyphens', () => {
    expect(preprocess('chicken-meal')).toEqual(['chicken meal']);
  });

  it('R10: rejects empty strings', () => {
    expect(preprocess('')).toEqual([]);
  });
});

// ============================================================
// Stage 2: Normalization — Exact Match
// ============================================================

describe('Stage 2: Normalization — Exact Match', () => {
  it('matches "Chicken" → Chicken', () => {
    const result = normalizeToken('chicken');
    expect(result.match_method).toBe('exact_match');
    expect(result.confidence).toBe(1.0);
    expect(result.entry!.canonical_name).toBe('Chicken');
  });

  it('matches "Chicken Meal" → Chicken Meal', () => {
    const result = normalizeToken('chicken meal');
    expect(result.match_method).toBe('exact_match');
    expect(result.entry!.canonical_name).toBe('Chicken Meal');
  });

  it('matches "Brewers Rice" → White Rice', () => {
    const result = normalizeToken('brewers rice');
    expect(result.match_method).toBe('exact_match');
    expect(result.entry!.canonical_name).toBe('White Rice');
  });

  it('matches "Maize Gluten Meal" → Corn Gluten Meal', () => {
    const result = normalizeToken('maize gluten meal');  // note: 'maize gluten meal' is in aliases for Corn Gluten Meal
    expect(result.entry!.canonical_name).toBe('Corn Gluten Meal');
  });

  it('matches "Whole Grain Corn" → Corn', () => {
    const result = normalizeToken('whole grain corn');
    expect(result.entry!.canonical_name).toBe('Corn');
  });

  it('matches seed data: all 36 unique ingredients', () => {
    const seedIngredients = [
      'beef', 'beef heart', 'beef kidney', 'beef liver', 'beet pulp',
      'brewers rice', 'brown rice', 'chicken', 'chicken fat', 'chicken heart',
      'chicken liver', 'chicken meal', 'chickpeas', 'chicory inulin', 'colostrum',
      'corn', 'corn gluten meal', 'fish meal', 'fish oil', 'glucosamine',
      'green-lipped mussel', 'kelp', 'lamb', 'lamb broth', 'lamb liver',
      'maize gluten meal', 'natural flavours', 'new zealand green mussel', 'peas',
      'rice', 'soybean meal', 'sweet potato', 'taurine',
      'vitamin e', 'whole grain corn', 'whole grain wheat',
    ];

    const result = normalizeIngredients(seedIngredients);
    expect(result.stats.total).toBe(36);
    // At least 30 of 36 should match (exact + fuzzy)
    expect(result.stats.exact_matches + result.stats.fuzzy_matches).toBeGreaterThanOrEqual(30);
    // Normalization ratio should be > 0.80
    expect(result.stats.normalization_ratio).toBeGreaterThan(0.80);
  });
});

// ============================================================
// Stage 2: Normalization — Fuzzy Match
// ============================================================

describe('Stage 2: Normalization — Fuzzy Match', () => {
  it('matches "natural flavours" (AU spelling) → Natural Flavors', () => {
    const result = normalizeToken('natural flavours');
    expect(result.match_method).toBe('exact_match');
    expect(result.entry!.canonical_name).toBe('Natural Flavors');
    expect(result.confidence).toBe(1.0);
  });

  it('matches "new zealand green mussel" → Green-Lipped Mussel', () => {
    const result = normalizeToken('new zealand green mussel');
    // This should match via fuzzy on "green mussel" or "new zealand"
    expect(result.entry).not.toBeNull();
    if (result.entry) {
      expect(result.entry.canonical_name).toBe('Green-Lipped Mussel');
    }
  });
});

// ============================================================
// Stage 3: Classification
// ============================================================

describe('Stage 3: Classification', () => {
  it('classifies Chicken as PROTEIN_SOURCE.ANIMAL, non-controversial', () => {
    const result = normalizeIngredient('Chicken');
    expect(result.category).toBe('PROTEIN_SOURCE.ANIMAL');
    expect(result.is_controversial).toBe(false);
  });

  it('classifies Corn as controversial', () => {
    const result = normalizeIngredient('Corn');
    expect(result.is_controversial).toBe(true);
  });

  it('flags controversial ingredients with warning', () => {
    const result = normalizeIngredient('Corn Gluten Meal');
    expect(result.warnings.some(w => w.includes('Controversial'))).toBe(true);
  });

  it('leaves unmatched ingredients with null category', () => {
    const result = normalizeIngredient('xyz_unknown_mystery_meat');
    expect(result.match_method).toBe('unmatched');
    expect(result.category).toBeNull();
  });
});

// ============================================================
// Stage 4: Health Mapping
// ============================================================

describe('Stage 4: Health Mapping', () => {
  it('evaluates WEIGHT_CONTROL for CAT with lean ingredients', () => {
    const ingredients = ['Chicken', 'Turkey', 'Sweet Potato', 'Brown Rice', 'Peas'];
    const scores = evaluateHealth(ingredients, 'CAT');
    const wc = scores.find(s => s.health_need === 'WEIGHT_CONTROL')!;
    expect(wc.suitability_score).toBeGreaterThan(0.70);
    expect(wc.beneficial_ingredients.length).toBeGreaterThan(0);
  });

  it('evaluates WEIGHT_CONTROL poorly with fatty/grain ingredients', () => {
    const ingredients = ['Corn', 'Wheat', 'Beef Fat', 'White Rice'];
    const scores = evaluateHealth(ingredients, 'CAT');
    const wc = scores.find(s => s.health_need === 'WEIGHT_CONTROL')!;
    expect(wc.suitability_score).toBeLessThan(0.60);
  });

  it('evaluates KITTEN_PUPPY for CAT with taurine and chicken liver', () => {
    const ingredients = ['Chicken', 'Chicken Meal', 'Taurine', 'Chicken Liver', 'Fish Oil'];
    const scores = evaluateHealth(ingredients, 'CAT');
    const kp = scores.find(s => s.health_need === 'KITTEN_PUPPY')!;
    expect(kp.suitability_score).toBeGreaterThan(0.70);
  });

  it('evaluates ALLERGY_SENSITIVE for CAT with duck/lamb (novel proteins)', () => {
    const ingredients = ['Duck', 'Lamb', 'Sweet Potato', 'Peas', 'Fish Oil'];
    const scores = evaluateHealth(ingredients, 'CAT');
    const as = scores.find(s => s.health_need === 'ALLERGY_SENSITIVE')!;
    expect(as.suitability_score).toBeGreaterThan(0.65);
  });

  it('flags Chicken as avoid for ALLERGY_SENSITIVE', () => {
    const ingredients = ['Chicken', 'Beef', 'Corn'];
    const scores = evaluateHealth(ingredients, 'CAT');
    const as = scores.find(s => s.health_need === 'ALLERGY_SENSITIVE')!;
    expect(as.avoid_ingredients).toContain('Chicken');
  });

  it('returns 5 health scores for any species', () => {
    const scores = evaluateHealth(['Chicken', 'Brown Rice'], 'DOG');
    expect(scores.length).toBe(5);
    for (const s of scores) {
      expect(s.suitability_score).toBeGreaterThanOrEqual(0);
      expect(s.suitability_score).toBeLessThanOrEqual(1);
    }
  });

  it('SENIOR_CARE: benefits from Green-Lipped Mussel + Glucosamine', () => {
    const ingredients = ['Chicken', 'Green-Lipped Mussel', 'Glucosamine', 'Fish Oil'];
    const scores = evaluateHealth(ingredients, 'DOG');
    const sc = scores.find(s => s.health_need === 'SENIOR_CARE')!;
    expect(sc.beneficial_ingredients).toContain('Green-Lipped Mussel');
    expect(sc.beneficial_ingredients).toContain('Glucosamine');
  });
});

// ============================================================
// Integration: Full Pipeline
// ============================================================

describe('Integration: Full Pipeline with seed data', () => {
  it('normalizes all 36 unique seed ingredients', () => {
    const seedRaw = [
      'Beef', 'Beef heart', 'Beef kidney', 'Beef liver', 'Beet pulp',
      'Brewers rice', 'Brown rice', 'Chicken', 'Chicken fat', 'Chicken heart',
      'Chicken liver', 'Chicken meal', 'Chickpeas', 'Chicory inulin', 'Colostrum',
      'Corn', 'Corn gluten meal', 'Fish meal', 'Fish oil', 'Glucosamine',
      'Green-lipped mussel', 'Kelp', 'Lamb', 'Lamb broth', 'Lamb liver',
      'Maize gluten meal', 'Natural flavours', 'New Zealand green mussel',
      'Peas', 'Rice', 'Soybean meal', 'Sweet potato', 'Taurine',
      'Vitamin E', 'Whole grain corn', 'Whole grain wheat',
    ];

    const result = normalizeIngredients(seedRaw);

    // Core assertions
    expect(result.stats.total).toBe(36);
    expect(result.stats.normalization_ratio).toBeGreaterThan(0.85);
    expect(result.stats.exact_matches).toBeGreaterThanOrEqual(28);

    // Controversial ingredients detection
    expect(result.stats.controversial_count).toBeGreaterThanOrEqual(3); // Corn, Soy Protein, Corn Gluten Meal, Wheat

    // Verify specific matches
    const chicken = result.ingredients.find(i => i.raw_text === 'Chicken')!;
    expect(chicken.match_method).toBe('exact_match');
    expect(chicken.normalized_term).toBe('Chicken');
    expect(chicken.category).toBe('PROTEIN_SOURCE.ANIMAL');
    expect(chicken.confidence).toBe(1.0);

    const maizeGluten = result.ingredients.find(i => i.raw_text === 'Maize gluten meal')!;
    expect(maizeGluten.normalized_term).toBe('Corn Gluten Meal');

    const naturalFlavours = result.ingredients.find(i => i.raw_text === 'Natural flavours')!;
    expect(naturalFlavours.normalized_term).toBe('Natural Flavors');

    const vitaminE = result.ingredients.find(i => i.raw_text === 'Vitamin E')!;
    expect(vitaminE.normalized_term).toBe('Vitamin E Supplement');
  });

  it('generates health evaluation for sample product', () => {
    // Simulate Royal Canin Kitten ingredients
    const kittenIngredients = [
      'Chicken', 'Chicken meal', 'Brown rice', 'Corn', 'Corn gluten meal',
      'Chicken fat', 'Fish oil', 'Natural Flavors', 'Taurine', 'Vitamin E Supplement',
    ];

    const scores = evaluateHealth(kittenIngredients, 'CAT');

    const kp = scores.find(s => s.health_need === 'KITTEN_PUPPY')!;
    // Has Chicken, Chicken meal, Fish oil, Taurine — good for kittens
    // But also has Corn and Corn Gluten Meal — flagged as avoid
    expect(kp.beneficial_ingredients.length).toBeGreaterThan(0);
    expect(kp.avoid_ingredients.length).toBeGreaterThan(0);
    expect(kp.suitability_score).toBeGreaterThan(0.40);

    const as = scores.find(s => s.health_need === 'ALLERGY_SENSITIVE')!;
    // Has Chicken, Corn, Corn Gluten Meal — all flagged as avoid for allergy
    expect(as.suitability_score).toBeLessThan(0.50);
  });
});

// ============================================================
// Dictionary Integrity
// ============================================================

describe('Ingredient Dictionary Integrity', () => {
  it('has no duplicate term_ids', () => {
    const ids = INGREDIENT_DICTIONARY.map((e: any) => e.term_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate canonical_names', () => {
    const names = INGREDIENT_DICTIONARY.map((e: any) => e.canonical_name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('alias index is built correctly', () => {
    const index = buildAliasIndex();
    expect(index.size).toBeGreaterThan(50);
    expect(index.get('chicken')!.canonical_name).toBe('Chicken');
    expect(index.get('brewers rice')!.canonical_name).toBe('White Rice');
  });

  it('covers all 5 health needs × 2 species = 10 rule groups', () => {
    expect(HEALTH_RULES.length).toBe(10);

    const needs = ['WEIGHT_CONTROL', 'KIDNEY_SUPPORT', 'ALLERGY_SENSITIVE', 'SENIOR_CARE', 'KITTEN_PUPPY'];
    const species: Array<'CAT' | 'DOG'> = ['CAT', 'DOG'];
    for (const n of needs) {
      for (const s of species) {
        const rules = HEALTH_RULES.filter((r: any) => r.health_need === n && r.species === s);
        expect(rules.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
