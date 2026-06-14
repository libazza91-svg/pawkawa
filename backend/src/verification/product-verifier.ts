/**
 * Product Verifier — Multi-Source Cross-Validation Engine
 *
 * For each product, compares:
 *   1. Seed data (from database)
 *   2. Manufacturer official nutrition (from manufacturer datasheets)
 *   3. Retailer listings (from PetCircle / Petbarn)
 *
 * Produces a VerifiedProductProfile with per-field confidence scores.
 */

import {
  VerifiedProductProfile,
  VerifiedField,
  VerifiedIngredientField,
  FieldConflict,
  SourceReading,
  VerificationSummary,
} from './verified-profile';
import { ManufacturerNutrition } from './manufacturers/royal-canin';
import { getRetailerNutrition, RetailerNutrition } from './manufacturers/retailer-sources';

// Pull manufacturer data
import {
  ROYAL_CANIN_DATA,
} from './manufacturers/royal-canin';
import { HILLS_DATA } from './manufacturers/hills';
import { ADVANCE_DATA } from './manufacturers/advance';
import { BLACK_HAWK_DATA } from './manufacturers/black-hawk';
import { ZIWI_DATA } from './manufacturers/ziwi-peak';

const ALL_MANUFACTURER_DATA: Record<string, ManufacturerNutrition> = {
  ...ROYAL_CANIN_DATA,
  ...HILLS_DATA,
  ...ADVANCE_DATA,
  ...BLACK_HAWK_DATA,
  ...ZIWI_DATA,
};

// Product key → product metadata (from seed data)
const PRODUCT_KEY_MAP: Record<string, {
  product_id: string; product_name: string; brand: string; species: 'CAT' | 'DOG';
}> = {
  rc_feline_kitten:     { product_id: 'rc_feline_kitten', product_name: 'Kitten Dry Cat Food', brand: 'Royal Canin', species: 'CAT' },
  rc_feline_adult:      { product_id: 'rc_feline_adult',  product_name: 'Feline Adult Dry Cat Food', brand: 'Royal Canin', species: 'CAT' },
  rc_feline_senior:     { product_id: 'rc_feline_senior', product_name: 'Ageing 12+ Dry Cat Food', brand: 'Royal Canin', species: 'CAT' },
  rc_feline_sterilised: { product_id: 'rc_feline_sterilised', product_name: 'Sterilised 37 Dry Cat Food', brand: 'Royal Canin', species: 'CAT' },
  rc_canine_puppy:      { product_id: 'rc_canine_puppy',  product_name: 'Medium Puppy Dry Dog Food', brand: 'Royal Canin', species: 'DOG' },
  rc_canine_adult:      { product_id: 'rc_canine_adult',  product_name: 'Medium Adult Dry Dog Food', brand: 'Royal Canin', species: 'DOG' },
  rc_canine_senior:     { product_id: 'rc_canine_senior', product_name: 'Medium Ageing 10+ Dry Dog Food', brand: 'Royal Canin', species: 'DOG' },
  hills_feline_kitten:  { product_id: 'hills_feline_kitten', product_name: 'Science Diet Kitten Dry Cat Food', brand: "Hill's", species: 'CAT' },
  hills_feline_adult:   { product_id: 'hills_feline_adult',  product_name: 'Science Diet Adult Dry Cat Food', brand: "Hill's", species: 'CAT' },
  hills_feline_senior:  { product_id: 'hills_feline_senior', product_name: 'Science Diet Senior 11+ Dry Cat Food', brand: "Hill's", species: 'CAT' },
  hills_canine_puppy:   { product_id: 'hills_canine_puppy',  product_name: 'Science Diet Puppy Dry Dog Food', brand: "Hill's", species: 'DOG' },
  hills_canine_adult:   { product_id: 'hills_canine_adult',  product_name: 'Science Diet Adult Dry Dog Food', brand: "Hill's", species: 'DOG' },
  advance_feline_adult: { product_id: 'advance_feline_adult', product_name: 'Adult Cat Chicken Dry Food', brand: 'Advance', species: 'CAT' },
  advance_canine_puppy: { product_id: 'advance_canine_puppy', product_name: 'Puppy Chicken & Rice Dry Dog Food', brand: 'Advance', species: 'DOG' },
  advance_canine_adult: { product_id: 'advance_canine_adult', product_name: 'Adult Chicken & Rice Dry Dog Food', brand: 'Advance', species: 'DOG' },
  advance_canine_senior:{ product_id: 'advance_canine_senior', product_name: 'Senior Chicken & Rice Dry Dog Food', brand: 'Advance', species: 'DOG' },
  bh_feline_adult:      { product_id: 'bh_feline_adult',      product_name: 'Original Adult Cat Chicken Dry Food', brand: 'Black Hawk', species: 'CAT' },
  bh_canine_adult:      { product_id: 'bh_canine_adult',      product_name: 'Original Adult Dog Lamb & Rice Dry Food', brand: 'Black Hawk', species: 'DOG' },
  ziwi_feline_adult:    { product_id: 'ziwi_feline_adult',    product_name: 'Air-Dried Mackerel & Lamb Cat Recipe', brand: 'Ziwi Peak', species: 'CAT' },
  ziwi_canine_adult:    { product_id: 'ziwi_canine_adult',    product_name: 'Air-Dried Lamb Dog Recipe', brand: 'Ziwi Peak', species: 'DOG' },
};

/** Seed data — the existing product nutrition values from the database */
export interface SeedNutrition {
  protein: number;
  fat: number;
  fiber: number;
  moisture: number;
  calories: number; // kcal/kg
  ingredients: string[];
}

/** Configuration for verification thresholds */
export interface VerificationConfig {
  /** Maximum % deviation for a field to be considered 'verified' */
  tolerance_pct: number;
  /** Minimum number of agreeing sources for GOLD tier */
  gold_min_sources: number;
  /** Minimum number of agreeing sources for SILVER tier */
  silver_min_sources: number;
  /** Minimum overlap % for ingredients to be 'verified' */
  ingredient_overlap_threshold: number;
}

const DEFAULT_CONFIG: VerificationConfig = {
  tolerance_pct: 5.0,
  gold_min_sources: 3,
  silver_min_sources: 2,
  ingredient_overlap_threshold: 60.0,
};

// ============================================================
// Core verification logic
// ============================================================

/**
 * Verify a single numeric field (protein/fat/fiber/moisture/calories).
 * Cross-references seed → manufacturer → retailers.
 */
export function verifyNumericField(
  fieldName: string,
  seedValue: number,
  mfrValue: number,
  retailerValues: { source: string; value: number }[],
  unit: string,
  config: VerificationConfig = DEFAULT_CONFIG,
): { field: VerifiedField; conflict: FieldConflict | null } {
  const sourceReadings: SourceReading[] = [];
  const cf: FieldConflict = {
    field: fieldName,
    seed_value: seedValue,
    manufacturer_value: mfrValue,
    retailer_values: [],
    severity: 'LOW',
    recommendation: '',
  };

  // Seed reading
  sourceReadings.push({
    source_name: 'seed_data', source_type: 'seed',
    value: seedValue, captured_at: '2026-01-01T00:00:00Z',
  });

  // Manufacturer reading
  if (mfrValue > 0) {
    sourceReadings.push({
      source_name: 'manufacturer_official', source_type: 'manufacturer',
      value: mfrValue, captured_at: '2026-06-13T10:00:00Z',
    });
  }

  // Retailer readings
  const retailerReadings: SourceReading[] = [];
  for (const rv of retailerValues) {
    retailerReadings.push({
      source_name: rv.source, source_type: 'retailer',
      value: rv.value, captured_at: '2026-06-13T10:00:00Z',
    });
    cf.retailer_values.push(rv);
  }
  sourceReadings.push(...retailerReadings);

  // Collect all values from non-seed sources
  const allRefValues: number[] = [];
  if (mfrValue > 0) allRefValues.push(mfrValue);
  for (const rv of retailerValues) allRefValues.push(rv.value);

  if (allRefValues.length === 0) {
    return {
      field: {
        value: seedValue, confidence: 0.0, sources: 0,
        source_values: sourceReadings, status: 'unverified',
        unit, tolerance: config.tolerance_pct,
      },
      conflict: null,
    };
  }

  // Clustered agreement: if most sources agree within tolerance, value = mode value
  // Simple approach: use average of all reference values that agree within tolerance of each other
  const sorted = [...allRefValues].sort((a, b) => a - b);
  const range = sorted[sorted.length - 1] - sorted[0];
  const toleranceAbs = (range / 2) <= (allRefValues[0] * config.tolerance_pct / 100);

  // Check seed vs references
  const seedDeviations = allRefValues.map(v => Math.abs(seedValue - v) / v * 100);
  const maxSeedDeviation = Math.max(...seedDeviations);
  const allWithinTolerance = seedDeviations.every(d => d <= config.tolerance_pct);

  // Determine the agreed-upon value (consensus of reference sources)
  let agreedValue: number;
  if (allRefValues.length === 1) {
    agreedValue = allRefValues[0];
  } else if (Math.max(...allRefValues) - Math.min(...allRefValues) <= allRefValues[0] * config.tolerance_pct / 100) {
    // All references agree → use average
    agreedValue = allRefValues.reduce((a, b) => a + b, 0) / allRefValues.length;
  } else {
    // References disagree → use manufacturer as authority
    agreedValue = mfrValue > 0 ? mfrValue : allRefValues[0];
  }

  // Compute confidence
  let confidence: number;
  let status: 'verified' | 'minor_variance' | 'conflict' | 'unverified';

  if (allWithinTolerance) {
    // Seed matches all references
    confidence = 0.90 + (allRefValues.length - 1) * 0.05;
    status = 'verified';
  } else if (maxSeedDeviation <= config.tolerance_pct * 2) {
    // Minor deviation
    confidence = 0.60 + (allRefValues.length - 1) * 0.05;
    status = 'minor_variance';
  } else {
    // Significant conflict
    confidence = 0.30 + (allRefValues.length - 1) * 0.05;
    status = 'conflict';
    cf.severity = maxSeedDeviation > config.tolerance_pct * 3 ? 'HIGH' : 'MEDIUM';
    cf.recommendation = `Seed value ${seedValue} differs from reference consensus ${agreedValue.toFixed(1)} by ${maxSeedDeviation.toFixed(1)}%. Review and update seed data.`;
  }

  confidence = Math.min(confidence, 1.0);

  return {
    field: {
      value: agreedValue,
      confidence,
      sources: allRefValues.length + 1, // +1 for seed
      source_values: sourceReadings,
      status,
      unit,
      tolerance: config.tolerance_pct,
    },
    conflict: allWithinTolerance ? null : cf,
  };
}

/**
 * Verify ingredient list across sources.
 * Uses normalized ingredient overlap percentage.
 */
export function verifyIngredients(
  seedIngredients: string[],
  mfrIngredients: string[],
  retailerIngredientLists: { source: string; ingredients: string[] }[],
  config: VerificationConfig = DEFAULT_CONFIG,
): { field: VerifiedIngredientField; conflicts: FieldConflict[] } {
  const normalise = (ingredients: string[]): Set<string> => {
    return new Set(ingredients.map(i => i.toLowerCase().trim()));
  };

  const seedSet = normalise(seedIngredients);
  const mfrSet = mfrIngredients.length > 0 ? normalise(mfrIngredients) : new Set<string>();

  const allSources = [
    { source_name: 'seed_data', ingredients: seedIngredients },
  ];
  if (mfrIngredients.length > 0) {
    allSources.push({ source_name: 'manufacturer_official', ingredients: mfrIngredients });
  }
  for (const r of retailerIngredientLists) {
    allSources.push({ source_name: r.source, ingredients: r.ingredients });
  }

  // Compute overlap of each non-seed source with seed
  let totalOverlap = 0;
  let sourceCount = 0;

  for (const s of allSources) {
    if (s.source_name === 'seed_data') continue;
    const sSet = normalise(s.ingredients);
    const intersection = new Set([...seedSet].filter(x => sSet.has(x)));
    const overlap = (intersection.size / Math.max(seedSet.size, 1)) * 100;
    totalOverlap += overlap;
    sourceCount++;
  }

  const avgOverlap = sourceCount > 0 ? totalOverlap / sourceCount : 0;

  let status: 'verified' | 'partial' | 'conflict' | 'unverified';
  if (avgOverlap >= config.ingredient_overlap_threshold) {
    status = sourceCount >= 2 ? 'verified' : 'partial';
  } else if (avgOverlap >= config.ingredient_overlap_threshold * 0.5) {
    status = 'partial';
  } else {
    status = 'conflict';
  }

  const conflicts: FieldConflict[] = [];
  if (avgOverlap < config.ingredient_overlap_threshold) {
    conflicts.push({
      field: 'ingredients',
      seed_value: seedIngredients.length,
      manufacturer_value: mfrIngredients.length,
      retailer_values: [],
      severity: avgOverlap < 30 ? 'HIGH' : 'MEDIUM',
      recommendation: `Ingredient overlap only ${avgOverlap.toFixed(1)}%. Review ingredient lists for completeness.`,
    });
  }

  return {
    field: {
      normalized_ingredients: mfrIngredients.length > 0 ? mfrIngredients : seedIngredients,
      agreeing_sources: avgOverlap >= config.ingredient_overlap_threshold ? sourceCount : 0,
      conflicting_sources: avgOverlap < config.ingredient_overlap_threshold ? sourceCount : 0,
      overlap_percentage: avgOverlap,
      status,
      source_ingredients: allSources,
    },
    conflicts,
  };
}

// ============================================================
// Full product verification
// ============================================================

export function verifyProduct(
  productKey: string,
  seed: SeedNutrition,
  config: VerificationConfig = DEFAULT_CONFIG,
): VerifiedProductProfile {
  const meta = PRODUCT_KEY_MAP[productKey];
  const mfr = ALL_MANUFACTURER_DATA[productKey];
  const retailers = getRetailerNutrition(productKey);

  const retailerNutrientMap: Record<string, { source: string; value: number }[]> = {
    protein: [], fat: [], fiber: [], moisture: [], calories: [],
  };
  const retailerIngredientLists: { source: string; ingredients: string[] }[] = [];

  for (const r of retailers) {
    retailerNutrientMap.protein.push({ source: r.retailer_name, value: r.protein });
    retailerNutrientMap.fat.push({ source: r.retailer_name, value: r.fat });
    retailerNutrientMap.fiber.push({ source: r.retailer_name, value: r.fiber });
    retailerNutrientMap.moisture.push({ source: r.retailer_name, value: r.moisture });
    retailerNutrientMap.calories.push({ source: r.retailer_name, value: r.calories });
    retailerIngredientLists.push({ source: r.retailer_name, ingredients: r.ingredients });
  }

  const nutrientFields: ['protein','fat','fiber','moisture','calories'] = ['protein','fat','fiber','moisture','calories'];
  const nutrientNames: Record<string, string> = {
    protein: 'protein', fat: 'fat', fiber: 'fiber', moisture: 'moisture', calories: 'calories',
  };
  const nutrientUnits: Record<string, string> = {
    protein: '%', fat: '%', fiber: '%', moisture: '%', calories: 'kcal/kg',
  };

  const fields: Record<string, VerifiedField> = {};
  const allConflicts: FieldConflict[] = [];

  for (const fn of nutrientFields) {
    const mfrValue = mfr ? mfr[fn] : 0;
    const { field, conflict } = verifyNumericField(
      fn, seed[fn] as number, mfrValue,
      retailerNutrientMap[fn] || [],
      nutrientUnits[fn],
      config,
    );
    (fields as any)[fn] = field;
    if (conflict) allConflicts.push(conflict);
  }

  // Verify ingredients
  const { field: ingField, conflicts: ingConflicts } = verifyIngredients(
    seed.ingredients,
    mfr?.ingredients || [],
    retailerIngredientLists,
    config,
  );
  (fields as any).ingredients = ingField;
  allConflicts.push(...ingConflicts);

  // Overall metrics
  const numericFields = [fields.protein, fields.fat, fields.fiber, fields.moisture, fields.calories];
  const overallConfidence = (
    numericFields.reduce((s, f) => s + f.confidence, 0) + ingField.overlap_percentage / 100
  ) / 6;

  const totalSources = new Set(
    numericFields.flatMap(f => f.source_values.map(sv => sv.source_name)),
  ).size;

  // Verification status
  let vStatus: 'verified' | 'partial' | 'conflict';
  if (allConflicts.length === 0 && numericFields.every(f => f.status === 'verified')) {
    vStatus = 'verified';
  } else if (allConflicts.filter(c => c.severity === 'HIGH').length > 0) {
    vStatus = 'conflict';
  } else {
    vStatus = 'partial';
  }

  // Tier
  let tier: 'GOLD' | 'SILVER' | 'BRONZE' | 'UNVERIFIED';
  const avgSources = Math.floor(numericFields.reduce((s, f) => s + f.sources, 0) / numericFields.length);
  if (overallConfidence >= 0.90 && avgSources >= 3) {
    tier = 'GOLD';
  } else if (overallConfidence >= 0.75 && avgSources >= 2) {
    tier = 'SILVER';
  } else if (overallConfidence >= 0.50) {
    tier = 'BRONZE';
  } else {
    tier = 'UNVERIFIED';
  }

  return {
    product_id: meta.product_id,
    brand: meta.brand,
    product_name: meta.product_name,
    species: meta.species,
    verified_at: '2026-06-13T10:00:00Z',
    fields: fields as unknown as VerifiedProductProfile['fields'],
    overall_confidence: Math.round(overallConfidence * 1000) / 1000,
    total_sources: totalSources,
    verification_status: vStatus,
    conflicts: allConflicts,
    tier,
  };
}

// ============================================================
// Batch verification
// ============================================================

export function verifyAllProducts(
  seedData: Record<string, SeedNutrition>,
  config: VerificationConfig = DEFAULT_CONFIG,
): VerifiedProductProfile[] {
  return Object.entries(seedData)
    .filter(([key]) => ALL_MANUFACTURER_DATA[key] !== undefined)
    .map(([key, seed]) => verifyProduct(key, seed, config));
}

// ============================================================
// Verification Summary (for dashboard)
// ============================================================

export function buildVerificationSummary(profiles: VerifiedProductProfile[]): VerificationSummary {
  const total = profiles.length;

  const fieldCoverage = {
    protein: profiles.filter(p => p.fields.protein.status !== 'unverified').length,
    fat:     profiles.filter(p => p.fields.fat.status !== 'unverified').length,
    fiber:   profiles.filter(p => p.fields.fiber.status !== 'unverified').length,
    moisture:profiles.filter(p => p.fields.moisture.status !== 'unverified').length,
    calories:profiles.filter(p => p.fields.calories.status !== 'unverified').length,
    ingredients: profiles.filter(p => p.fields.ingredients.status !== 'unverified').length,
  };

  return {
    total_products: total,
    verified: profiles.filter(p => p.verification_status === 'verified').length,
    partial:  profiles.filter(p => p.verification_status === 'partial').length,
    conflict: profiles.filter(p => p.verification_status === 'conflict').length,
    unverified: 0,
    field_coverage: fieldCoverage,
    tier_distribution: {
      GOLD: profiles.filter(p => p.tier === 'GOLD').length,
      SILVER: profiles.filter(p => p.tier === 'SILVER').length,
      BRONZE: profiles.filter(p => p.tier === 'BRONZE').length,
      UNVERIFIED: profiles.filter(p => p.tier === 'UNVERIFIED').length,
    },
    average_overall_confidence:
      profiles.length > 0
        ? Math.round(profiles.reduce((s, p) => s + p.overall_confidence, 0) / profiles.length * 1000) / 1000
        : 0,
    total_conflicts: profiles.reduce((s, p) => s + p.conflicts.length, 0),
  };
}
