/**
 * Manufacturer Nutrition Data — Black Hawk (Masterpet Australia)
 * Sourced from blackhawkpetcare.com.au
 */

import { ManufacturerNutrition } from './royal-canin';

export const BLACK_HAWK_FELINE_ADULT: ManufacturerNutrition = {
  brand: 'Black Hawk',
  product_name: 'Original Adult Cat Chicken Dry Food',
  protein: 32.0, fat: 14.0, fiber: 5.0, moisture: 10.0, calories: 3600,
  ingredients: [
    'chicken meal', 'rice', 'maize', 'chicken fat',
    'vegetable protein', 'beet pulp', 'natural flavour',
    'fish oil', 'sunflower oil', 'chickpeas',
    'yucca schidigera extract', 'rosemary extract',
    'vitamins', 'minerals', 'taurine',
  ],
  source_url: 'https://www.blackhawkpetcare.com.au/cat/original-adult-cat-chicken-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const BLACK_HAWK_CANINE_ADULT: ManufacturerNutrition = {
  brand: 'Black Hawk',
  product_name: 'Original Adult Dog Lamb & Rice Dry Food',
  protein: 24.0, fat: 14.0, fiber: 4.0, moisture: 10.0, calories: 3550,
  ingredients: [
    'lamb meal', 'rice', 'maize', 'chicken fat',
    'vegetable protein', 'beet pulp', 'natural flavour',
    'fish oil', 'sunflower oil', 'chickpeas',
    'yucca schidigera extract', 'rosemary extract',
    'glucosamine', 'chondroitin', 'vitamins', 'minerals',
  ],
  source_url: 'https://www.blackhawkpetcare.com.au/dog/original-adult-lamb-rice-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const BLACK_HAWK_DATA: Record<string, ManufacturerNutrition> = {
  bh_feline_adult:  BLACK_HAWK_FELINE_ADULT,
  bh_canine_adult:  BLACK_HAWK_CANINE_ADULT,
};
