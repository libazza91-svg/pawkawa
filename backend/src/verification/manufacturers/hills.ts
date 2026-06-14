/**
 * Manufacturer Nutrition Data — Hill's Science Diet
 *
 * Sourced from hillspet.com.au — Official Guaranteed Analysis.
 */

import { ManufacturerNutrition } from './royal-canin';

export const HILLS_FELINE_KITTEN: ManufacturerNutrition = {
  brand: "Hill's",
  product_name: 'Science Diet Kitten Dry Cat Food',
  protein: 38.0, fat: 22.0, fiber: 3.0, moisture: 8.0, calories: 4035,
  ingredients: [
    'chicken', 'brown rice', 'wheat gluten', 'chicken fat',
    'whole grain wheat', 'cracked pearled barley', 'dried beet pulp',
    'chicken liver flavour', 'fish oil', 'soybean oil',
    'lactic acid', 'calcium carbonate', 'potassium chloride',
    'vitamins', 'minerals', 'taurine',
  ],
  source_url: 'https://www.hillspet.com.au/cat-food/sd-feline-kitten-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const HILLS_FELINE_ADULT: ManufacturerNutrition = {
  brand: "Hill's",
  product_name: 'Science Diet Adult Dry Cat Food',
  protein: 34.0, fat: 20.0, fiber: 3.5, moisture: 8.0, calories: 3955,
  ingredients: [
    'chicken', 'brown rice', 'wheat gluten', 'chicken fat',
    'whole grain wheat', 'corn gluten meal', 'dried beet pulp',
    'chicken liver flavour', 'fish oil', 'soybean oil',
    'calcium carbonate', 'potassium chloride', 'vitamins', 'minerals', 'taurine',
  ],
  source_url: 'https://www.hillspet.com.au/cat-food/sd-feline-adult-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const HILLS_FELINE_SENIOR: ManufacturerNutrition = {
  brand: "Hill's",
  product_name: 'Science Diet Senior 11+ Dry Cat Food',
  protein: 31.0, fat: 18.0, fiber: 4.0, moisture: 8.0, calories: 3820,
  ingredients: [
    'chicken', 'brown rice', 'wheat gluten', 'chicken fat',
    'whole grain wheat', 'corn gluten meal', 'dried beet pulp',
    'fish oil', 'soybean oil', 'calcium carbonate',
    'potassium chloride', 'vitamins', 'minerals', 'taurine',
  ],
  source_url: 'https://www.hillspet.com.au/cat-food/sd-feline-senior-11-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const HILLS_CANINE_PUPPY: ManufacturerNutrition = {
  brand: "Hill's",
  product_name: 'Science Diet Puppy Dry Dog Food',
  protein: 28.0, fat: 17.0, fiber: 2.5, moisture: 10.0, calories: 3845,
  ingredients: [
    'chicken meal', 'whole grain wheat', 'cracked pearled barley',
    'whole grain sorghum', 'whole grain corn', 'chicken fat',
    'corn gluten meal', 'chicken liver flavour', 'dried beet pulp',
    'soybean oil', 'fish oil', 'vitamins', 'minerals',
  ],
  source_url: 'https://www.hillspet.com.au/dog-food/sd-puppy-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const HILLS_CANINE_ADULT: ManufacturerNutrition = {
  brand: "Hill's",
  product_name: 'Science Diet Adult Dry Dog Food',
  protein: 25.0, fat: 15.0, fiber: 3.0, moisture: 10.0, calories: 3725,
  ingredients: [
    'chicken meal', 'whole grain wheat', 'cracked pearled barley',
    'whole grain sorghum', 'whole grain corn', 'chicken fat',
    'corn gluten meal', 'chicken liver flavour', 'dried beet pulp',
    'soybean oil', 'flaxseed', 'vitamins', 'minerals',
  ],
  source_url: 'https://www.hillspet.com.au/dog-food/sd-adult-dry',
  captured_at: '2026-06-13T10:00:00Z',
};

export const HILLS_DATA: Record<string, ManufacturerNutrition> = {
  hills_feline_kitten:  HILLS_FELINE_KITTEN,
  hills_feline_adult:   HILLS_FELINE_ADULT,
  hills_feline_senior:  HILLS_FELINE_SENIOR,
  hills_canine_puppy:   HILLS_CANINE_PUPPY,
  hills_canine_adult:   HILLS_CANINE_ADULT,
};
