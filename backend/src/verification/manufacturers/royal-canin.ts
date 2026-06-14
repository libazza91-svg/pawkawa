/**
 * Manufacturer Nutrition Data — Royal Canin
 *
 * Sourced from royalcanin.com/au — Official Guaranteed Analysis.
 * Values represent the AU/NZ market formulations.
 * All values are % for macronutrients, kcal/kg for metabolizable energy.
 */

export interface ManufacturerNutrition {
  brand: string;
  product_name: string;
  protein: number;
  fat: number;
  fiber: number;
  moisture: number;
  calories: number; // kcal/kg ME
  ingredients: string[];
  source_url: string;
  captured_at: string;
}

/** Royal Canin AU — Feline Dry */
export const RC_FELINE_KITTEN: ManufacturerNutrition = {
  brand: 'Royal Canin',
  product_name: 'Kitten Dry Cat Food',
  protein: 34.0, fat: 16.0, fiber: 3.8, moisture: 8.0, calories: 3940,
  ingredients: [
    'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
    'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
    'fish oil', 'minerals', 'soya oil', 'yeasts', 'fructo-oligo-saccharides',
    'hydrolysed yeast', 'marigold extract',
  ],
  source_url: 'https://www.royalcanin.com/au/cats/kitten/kitten-dry-cat-food',
  captured_at: '2026-06-13T10:00:00Z',
};

export const RC_FELINE_ADULT: ManufacturerNutrition = {
  brand: 'Royal Canin',
  product_name: 'Feline Adult Dry Cat Food',
  protein: 32.0, fat: 15.0, fiber: 4.2, moisture: 8.0, calories: 3870,
  ingredients: [
    'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
    'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
    'fish oil', 'minerals', 'soya oil', 'yeasts',
  ],
  source_url: 'https://www.royalcanin.com/au/cats/adult/feline-adult-dry-cat-food',
  captured_at: '2026-06-13T10:00:00Z',
};

export const RC_FELINE_SENIOR: ManufacturerNutrition = {
  brand: 'Royal Canin',
  product_name: 'Ageing 12+ Dry Cat Food',
  protein: 28.0, fat: 12.0, fiber: 5.0, moisture: 8.0, calories: 3720,
  ingredients: [
    'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
    'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
    'fish oil', 'minerals', 'soya oil', 'yeasts', 'glucosamine',
  ],
  source_url: 'https://www.royalcanin.com/au/cats/senior/ageing-12-dry-cat-food',
  captured_at: '2026-06-13T10:00:00Z',
};

export const RC_FELINE_STERILISED: ManufacturerNutrition = {
  brand: 'Royal Canin',
  product_name: 'Sterilised 37 Dry Cat Food',
  protein: 37.0, fat: 12.0, fiber: 6.2, moisture: 8.0, calories: 3500,
  ingredients: [
    'dehydrated poultry protein', 'maize', 'wheat', 'vegetable protein isolate',
    'vegetable fibres', 'animal fats', 'maize gluten', 'beet pulp',
    'fish oil', 'minerals', 'psyllium', 'fructo-oligo-saccharides',
  ],
  source_url: 'https://www.royalcanin.com/au/cats/sterilised/sterilised-37-dry-cat-food',
  captured_at: '2026-06-13T10:00:00Z',
};

/** Royal Canin AU — Canine Dry */
export const RC_CANINE_PUPPY: ManufacturerNutrition = {
  brand: 'Royal Canin',
  product_name: 'Medium Puppy Dry Dog Food',
  protein: 32.0, fat: 20.0, fiber: 2.5, moisture: 9.5, calories: 3980,
  ingredients: [
    'dehydrated poultry protein', 'maize', 'wheat', 'animal fats',
    'maize gluten', 'beet pulp', 'vegetable protein isolate', 'fish oil',
    'minerals', 'soya oil', 'yeasts', 'fructo-oligo-saccharides',
  ],
  source_url: 'https://www.royalcanin.com/au/dogs/puppy/medium-puppy-dry-dog-food',
  captured_at: '2026-06-13T10:00:00Z',
};

export const RC_CANINE_ADULT: ManufacturerNutrition = {
  brand: 'Royal Canin',
  product_name: 'Medium Adult Dry Dog Food',
  protein: 25.0, fat: 14.0, fiber: 3.8, moisture: 9.5, calories: 3780,
  ingredients: [
    'dehydrated poultry protein', 'maize', 'wheat', 'animal fats',
    'maize gluten', 'beet pulp', 'vegetable protein isolate', 'fish oil',
    'minerals', 'soya oil', 'yeasts',
  ],
  source_url: 'https://www.royalcanin.com/au/dogs/adult/medium-adult-dry-dog-food',
  captured_at: '2026-06-13T10:00:00Z',
};

export const RC_CANINE_SENIOR: ManufacturerNutrition = {
  brand: 'Royal Canin',
  product_name: 'Medium Ageing 10+ Dry Dog Food',
  protein: 23.0, fat: 14.0, fiber: 4.0, moisture: 9.5, calories: 3650,
  ingredients: [
    'dehydrated poultry protein', 'maize', 'wheat', 'animal fats',
    'maize gluten', 'beet pulp', 'vegetable protein isolate', 'fish oil',
    'minerals', 'soya oil', 'yeasts', 'glucosamine', 'chondroitin',
  ],
  source_url: 'https://www.royalcanin.com/au/dogs/senior/medium-ageing-10-dry-dog-food',
  captured_at: '2026-06-13T10:00:00Z',
};

/** Map product key → ManufacturerNutrition */
export const ROYAL_CANIN_DATA: Record<string, ManufacturerNutrition> = {
  rc_feline_kitten:      RC_FELINE_KITTEN,
  rc_feline_adult:       RC_FELINE_ADULT,
  rc_feline_senior:      RC_FELINE_SENIOR,
  rc_feline_sterilised:  RC_FELINE_STERILISED,
  rc_canine_puppy:       RC_CANINE_PUPPY,
  rc_canine_adult:       RC_CANINE_ADULT,
  rc_canine_senior:      RC_CANINE_SENIOR,
};
