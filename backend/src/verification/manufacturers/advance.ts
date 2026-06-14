/**
 * Manufacturer Nutrition Data — Advance
 * Sourced from advancepet.com.au
 */

import { ManufacturerNutrition } from './royal-canin';

export const ADVANCE_FELINE_ADULT: ManufacturerNutrition = {
  brand: 'Advance',
  product_name: 'Adult Cat Chicken Dry Food',
  protein: 36.0, fat: 16.0, fiber: 3.0, moisture: 10.0, calories: 3750,
  ingredients: [
    'chicken meal', 'rice', 'maize gluten', 'chicken fat',
    'sorghum', 'dried beet pulp', 'natural flavour',
    'fish oil', 'sunflower oil', 'potassium chloride',
    'salt', 'vitamins', 'minerals', 'taurine',
  ],
  source_url: 'https://www.advancepet.com.au/cat/adult-chicken-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const ADVANCE_CANINE_PUPPY: ManufacturerNutrition = {
  brand: 'Advance',
  product_name: 'Puppy Chicken & Rice Dry Dog Food',
  protein: 30.0, fat: 18.0, fiber: 2.5, moisture: 10.5, calories: 3850,
  ingredients: [
    'chicken meal', 'rice', 'maize gluten', 'chicken fat',
    'sorghum', 'dried beet pulp', 'fish oil',
    'sunflower oil', 'potassium chloride', 'salt',
    'vitamins', 'minerals', 'natural antioxidants',
  ],
  source_url: 'https://www.advancepet.com.au/dog/puppy-chicken-rice-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const ADVANCE_CANINE_ADULT: ManufacturerNutrition = {
  brand: 'Advance',
  product_name: 'Adult Chicken & Rice Dry Dog Food',
  protein: 26.0, fat: 14.0, fiber: 3.0, moisture: 10.5, calories: 3650,
  ingredients: [
    'chicken meal', 'rice', 'maize gluten', 'chicken fat',
    'sorghum', 'dried beet pulp', 'fish oil',
    'sunflower oil', 'potassium chloride', 'salt',
    'vitamins', 'minerals',
  ],
  source_url: 'https://www.advancepet.com.au/dog/adult-chicken-rice-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const ADVANCE_CANINE_SENIOR: ManufacturerNutrition = {
  brand: 'Advance',
  product_name: 'Senior Chicken & Rice Dry Dog Food',
  protein: 22.0, fat: 12.0, fiber: 4.0, moisture: 10.5, calories: 3400,
  ingredients: [
    'chicken meal', 'rice', 'maize gluten', 'chicken fat',
    'sorghum', 'dried beet pulp', 'fish oil',
    'sunflower oil', 'glucosamine', 'chondroitin',
    'potassium chloride', 'salt', 'vitamins', 'minerals',
  ],
  source_url: 'https://www.advancepet.com.au/dog/senior-chicken-rice-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const ADVANCE_DATA: Record<string, ManufacturerNutrition> = {
  advance_feline_adult:   ADVANCE_FELINE_ADULT,
  advance_canine_puppy:   ADVANCE_CANINE_PUPPY,
  advance_canine_adult:   ADVANCE_CANINE_ADULT,
  advance_canine_senior:  ADVANCE_CANINE_SENIOR,
};
