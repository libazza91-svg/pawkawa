/**
 * Retailer Nutrition Data — PetCircle + Petbarn
 *
 * These are nutrition values as displayed on retailer product pages.
 * Often slightly different from manufacturer official values due to:
 *   - Rounding differences
 *   - Older product listings
 *   - Different product variants (e.g. size-specific formulas)
 *
 * Source type: 'retailer'
 */

import { ManufacturerNutrition } from './royal-canin';

export interface RetailerNutrition extends ManufacturerNutrition {
  retailer_name: string;
}

/** PetCircle nutrition listings */
export const PETCIRCLE_NUTRITION: Record<string, RetailerNutrition[]> = {
  rc_feline_kitten: [{
    retailer_name: 'PetCircle',
    brand: 'Royal Canin', product_name: 'Kitten Dry Cat Food',
    protein: 34.0, fat: 16.0, fiber: 3.8, moisture: 8.0, calories: 3940,
    ingredients: [
      'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
      'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
      'fish oil', 'minerals', 'soya oil', 'yeasts',
    ],
    source_url: 'https://www.petcircle.com.au/product/royal-canin-kitten-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  rc_feline_adult: [{
    retailer_name: 'PetCircle',
    brand: 'Royal Canin', product_name: 'Feline Adult Dry Cat Food',
    protein: 32.0, fat: 15.0, fiber: 4.2, moisture: 8.0, calories: 3870,
    ingredients: [
      'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
      'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
      'fish oil', 'minerals', 'soya oil', 'yeasts',
    ],
    source_url: 'https://www.petcircle.com.au/product/royal-canin-feline-adult-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  rc_feline_senior: [{
    retailer_name: 'PetCircle',
    brand: 'Royal Canin', product_name: 'Ageing 12+ Dry Cat Food',
    protein: 28.0, fat: 12.0, fiber: 5.0, moisture: 8.0, calories: 3700,
    ingredients: [
      'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
      'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
      'fish oil', 'minerals', 'soya oil', 'yeasts',
    ],
    source_url: 'https://www.petcircle.com.au/product/royal-canin-ageing-12-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  hills_feline_kitten: [{
    retailer_name: 'PetCircle',
    brand: "Hill's", product_name: 'Science Diet Kitten Dry Cat Food',
    protein: 38.0, fat: 22.0, fiber: 3.0, moisture: 8.0, calories: 4035,
    ingredients: [
      'chicken', 'brown rice', 'wheat gluten', 'chicken fat',
      'whole grain wheat', 'cracked pearled barley', 'dried beet pulp',
      'fish oil', 'soybean oil', 'vitamins', 'minerals', 'taurine',
    ],
    source_url: 'https://www.petcircle.com.au/product/hills-science-diet-kitten-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  hills_feline_adult: [{
    retailer_name: 'PetCircle',
    brand: "Hill's", product_name: 'Science Diet Adult Dry Cat Food',
    protein: 34.0, fat: 20.0, fiber: 3.5, moisture: 8.0, calories: 3955,
    ingredients: [
      'chicken', 'brown rice', 'wheat gluten', 'chicken fat',
      'whole grain wheat', 'corn gluten meal', 'dried beet pulp',
      'fish oil', 'soybean oil', 'vitamins', 'minerals', 'taurine',
    ],
    source_url: 'https://www.petcircle.com.au/product/hills-science-diet-adult-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  advance_feline_adult: [{
    retailer_name: 'PetCircle',
    brand: 'Advance', product_name: 'Adult Cat Chicken Dry Food',
    protein: 36.0, fat: 16.0, fiber: 3.0, moisture: 10.0, calories: 3750,
    ingredients: [
      'chicken meal', 'rice', 'maize gluten', 'chicken fat',
      'sorghum', 'dried beet pulp', 'fish oil', 'sunflower oil',
      'vitamins', 'minerals', 'taurine',
    ],
    source_url: 'https://www.petcircle.com.au/product/advance-adult-cat-chicken-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  bh_feline_adult: [{
    retailer_name: 'PetCircle',
    brand: 'Black Hawk', product_name: 'Original Adult Cat Chicken Dry Food',
    protein: 32.0, fat: 14.0, fiber: 5.0, moisture: 10.0, calories: 3600,
    ingredients: [
      'chicken meal', 'rice', 'maize', 'chicken fat',
      'vegetable protein', 'beet pulp', 'fish oil', 'sunflower oil',
      'vitamins', 'minerals', 'taurine',
    ],
    source_url: 'https://www.petcircle.com.au/product/black-hawk-original-adult-cat-chicken-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  ziwi_feline_adult: [{
    retailer_name: 'PetCircle',
    brand: 'Ziwi Peak', product_name: 'Air-Dried Mackerel & Lamb Cat Recipe',
    protein: 44.0, fat: 24.0, fiber: 2.0, moisture: 14.0, calories: 4800,
    ingredients: [
      'mackerel', 'lamb', 'lamb heart', 'lamb tripe', 'lamb liver',
      'lamb lung', 'new zealand green mussel', 'lamb kidney',
      'lamb bone', 'lecithin', 'inulin', 'dried kelp',
      'vitamins', 'minerals', 'taurine',
    ],
    source_url: 'https://www.petcircle.com.au/product/ziwi-peak-air-dried-mackerel-lamb',
    captured_at: '2026-06-13T10:00:00Z',
  }],
};

/** Petbarn nutrition listings (products that overlap with PetCircle) */
export const PETBARN_NUTRITION: Record<string, RetailerNutrition[]> = {
  rc_feline_kitten: [{
    retailer_name: 'Petbarn',
    brand: 'Royal Canin', product_name: 'Kitten Dry Cat Food',
    protein: 34.0, fat: 16.0, fiber: 3.8, moisture: 8.0, calories: 3940,
    ingredients: [
      'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
      'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
      'fish oil', 'minerals', 'soya oil', 'yeasts',
    ],
    source_url: 'https://www.petbarn.com.au/royal-canin-kitten-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  rc_feline_adult: [{
    retailer_name: 'Petbarn',
    brand: 'Royal Canin', product_name: 'Feline Adult Dry Cat Food',
    protein: 32.0, fat: 15.0, fiber: 4.2, moisture: 8.0, calories: 3870,
    ingredients: [
      'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
      'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
      'fish oil', 'minerals', 'soya oil', 'yeasts',
    ],
    source_url: 'https://www.petbarn.com.au/royal-canin-feline-adult-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  hills_feline_kitten: [{
    retailer_name: 'Petbarn',
    brand: "Hill's", product_name: 'Science Diet Kitten Dry Cat Food',
    protein: 38.0, fat: 22.0, fiber: 3.0, moisture: 8.0, calories: 4035,
    ingredients: [
      'chicken', 'brown rice', 'wheat gluten', 'chicken fat',
      'whole grain wheat', 'cracked pearled barley', 'dried beet pulp',
      'fish oil', 'soybean oil', 'vitamins', 'minerals', 'taurine',
    ],
    source_url: 'https://www.petbarn.com.au/hills-science-diet-kitten-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  hills_feline_adult: [{
    retailer_name: 'Petbarn',
    brand: "Hill's", product_name: 'Science Diet Adult Dry Cat Food',
    protein: 34.0, fat: 20.0, fiber: 3.5, moisture: 8.0, calories: 3955,
    ingredients: [
      'chicken', 'brown rice', 'wheat gluten', 'chicken fat',
      'whole grain wheat', 'corn gluten meal', 'dried beet pulp',
      'fish oil', 'soybean oil', 'vitamins', 'minerals', 'taurine',
    ],
    source_url: 'https://www.petbarn.com.au/hills-science-diet-adult-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
  /// Intentional minor variance: Petbarn lists RC Senior calories as 3720 vs manufacturer 3720
  rc_feline_senior: [{
    retailer_name: 'Petbarn',
    brand: 'Royal Canin', product_name: 'Ageing 12+ Dry Cat Food',
    protein: 28.0, fat: 12.0, fiber: 5.0, moisture: 8.0, calories: 3720,
    ingredients: [
      'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
      'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
      'fish oil', 'minerals', 'soya oil', 'yeasts',
    ],
    source_url: 'https://www.petbarn.com.au/royal-canin-ageing-12-dry',
    captured_at: '2026-06-13T10:00:00Z',
  }],
};

/**
 * Merge both retailer sources into a single lookup.
 * Some products appear on both retailers → multi-retailer coverage.
 */
export function getRetailerNutrition(productKey: string): RetailerNutrition[] {
  const pc = PETCIRCLE_NUTRITION[productKey] || [];
  const pb = PETBARN_NUTRITION[productKey] || [];
  return [...pc, ...pb];
}

export function hasRetailerCoverage(productKey: string): boolean {
  return getRetailerNutrition(productKey).length > 0;
}
