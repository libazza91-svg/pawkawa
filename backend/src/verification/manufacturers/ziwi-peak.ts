/**
 * Manufacturer Nutrition Data — Ziwi Peak
 * Sourced from ziwipeak.com — Air-Dried recipes.
 * Ziwi uses air-dried format → significantly different moisture profile vs dry kibble.
 */

import { ManufacturerNutrition } from './royal-canin';

export const ZIWI_FELINE_ADULT: ManufacturerNutrition = {
  brand: 'Ziwi Peak',
  product_name: 'Air-Dried Mackerel & Lamb Cat Recipe',
  protein: 44.0, fat: 24.0, fiber: 2.0, moisture: 14.0, calories: 4800,
  ingredients: [
    'mackerel', 'lamb', 'lamb heart', 'lamb tripe',
    'lamb liver', 'lamb lung', 'new zealand green mussel',
    'lamb kidney', 'lamb bone', 'lecithin',
    'inulin', 'dried kelp', 'vitamins', 'minerals',
    'salt', 'taurine',
  ],
  source_url: 'https://www.ziwipeak.com/cat/air-dried-mackerel-lamb',
  captured_at: '2026-06-13T10:00:00Z',
};

export const ZIWI_CANINE_ADULT: ManufacturerNutrition = {
  brand: 'Ziwi Peak',
  product_name: 'Air-Dried Lamb Dog Recipe',
  protein: 38.0, fat: 28.0, fiber: 3.0, moisture: 14.0, calories: 5200,
  ingredients: [
    'lamb', 'lamb heart', 'lamb tripe', 'lamb liver',
    'lamb kidney', 'lamb lung', 'new zealand green mussel',
    'lamb bone', 'lecithin', 'inulin',
    'dried kelp', 'vitamins', 'minerals', 'salt',
  ],
  source_url: 'https://www.ziwipeak.com/dog/air-dried-lamb',
  captured_at: '2026-06-13T10:00:00Z',
};

export const ZIWI_DATA: Record<string, ManufacturerNutrition> = {
  ziwi_feline_adult:  ZIWI_FELINE_ADULT,
  ziwi_canine_adult:  ZIWI_CANINE_ADULT,
};
