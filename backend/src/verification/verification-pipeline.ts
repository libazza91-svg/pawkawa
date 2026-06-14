/**
 * Verification Pipeline — Sprint 1.3C-P2
 *
 * Full pipeline:
 *   1. Load seed nutrition data (existing DB products)
 *   2. Load manufacturer official nutrition
 *   3. Load retailer nutrition (PetCircle + Petbarn)
 *   4. Run multi-source verification engine
 *   5. Build verification summary
 *   6. Output verified_product_profiles.json + summary to filesystem
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  verifyAllProducts,
  buildVerificationSummary,
  SeedNutrition,
} from './product-verifier';
import { VerifiedProductProfile } from './verified-profile';

// ============================================================
// Seed Data: 20 products × nutrition + ingredients
// (Mirrors existing DB seed. In production this reads from Drizzle.)
// ============================================================

const SEED_DATA: Record<string, SeedNutrition> = {
  // Royal Canin Feline
  rc_feline_kitten: {
    protein: 34.0, fat: 16.0, fiber: 3.8, moisture: 8.0, calories: 3940,
    ingredients: [
      'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
      'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
      'fish oil', 'minerals', 'soya oil', 'yeasts', 'fructo-oligo-saccharides',
      'hydrolysed yeast', 'marigold extract',
    ],
  },
  rc_feline_adult: {
    protein: 32.0, fat: 15.0, fiber: 4.2, moisture: 8.0, calories: 3870,
    ingredients: [
      'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
      'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
      'fish oil', 'minerals', 'soya oil', 'yeasts',
    ],
  },
  rc_feline_senior: {
    protein: 28.0, fat: 12.0, fiber: 5.0, moisture: 8.0, calories: 3720,
    ingredients: [
      'dehydrated poultry protein', 'rice', 'maize', 'vegetable protein isolate',
      'animal fats', 'maize gluten', 'vegetable fibres', 'beet pulp',
      'fish oil', 'minerals', 'soya oil', 'yeasts', 'glucosamine',
    ],
  },
  rc_feline_sterilised: {
    protein: 37.0, fat: 12.0, fiber: 6.2, moisture: 8.0, calories: 3500,
    ingredients: [
      'dehydrated poultry protein', 'maize', 'wheat', 'vegetable protein isolate',
      'vegetable fibres', 'animal fats', 'maize gluten', 'beet pulp',
      'fish oil', 'minerals', 'psyllium', 'fructo-oligo-saccharides',
    ],
  },
  // Royal Canin Canine
  rc_canine_puppy: {
    protein: 32.0, fat: 20.0, fiber: 2.5, moisture: 9.5, calories: 3980,
    ingredients: [
      'dehydrated poultry protein', 'maize', 'wheat', 'animal fats',
      'maize gluten', 'beet pulp', 'vegetable protein isolate', 'fish oil',
      'minerals', 'soya oil', 'yeasts', 'fructo-oligo-saccharides',
    ],
  },
  rc_canine_adult: {
    protein: 25.0, fat: 14.0, fiber: 3.8, moisture: 9.5, calories: 3780,
    ingredients: [
      'dehydrated poultry protein', 'maize', 'wheat', 'animal fats',
      'maize gluten', 'beet pulp', 'vegetable protein isolate', 'fish oil',
      'minerals', 'soya oil', 'yeasts',
    ],
  },
  rc_canine_senior: {
    protein: 23.0, fat: 14.0, fiber: 4.0, moisture: 9.5, calories: 3650,
    ingredients: [
      'dehydrated poultry protein', 'maize', 'wheat', 'animal fats',
      'maize gluten', 'beet pulp', 'vegetable protein isolate', 'fish oil',
      'minerals', 'soya oil', 'yeasts', 'glucosamine', 'chondroitin',
    ],
  },
  // Hill's Feline
  hills_feline_kitten: {
    protein: 38.0, fat: 22.0, fiber: 3.0, moisture: 8.0, calories: 4035,
    ingredients: [
      'chicken', 'brown rice', 'wheat gluten', 'chicken fat',
      'whole grain wheat', 'cracked pearled barley', 'dried beet pulp',
      'chicken liver flavour', 'fish oil', 'soybean oil',
      'lactic acid', 'calcium carbonate', 'potassium chloride',
      'vitamins', 'minerals', 'taurine',
    ],
  },
  hills_feline_adult: {
    protein: 34.0, fat: 20.0, fiber: 3.5, moisture: 8.0, calories: 3955,
    ingredients: [
      'chicken', 'brown rice', 'wheat gluten', 'chicken fat',
      'whole grain wheat', 'corn gluten meal', 'dried beet pulp',
      'chicken liver flavour', 'fish oil', 'soybean oil',
      'calcium carbonate', 'potassium chloride', 'vitamins', 'minerals', 'taurine',
    ],
  },
  hills_feline_senior: {
    protein: 31.0, fat: 18.0, fiber: 4.0, moisture: 8.0, calories: 3820,
    ingredients: [
      'chicken', 'brown rice', 'wheat gluten', 'chicken fat',
      'whole grain wheat', 'corn gluten meal', 'dried beet pulp',
      'fish oil', 'soybean oil', 'calcium carbonate',
      'potassium chloride', 'vitamins', 'minerals', 'taurine',
    ],
  },
  // Hill's Canine
  hills_canine_puppy: {
    protein: 28.0, fat: 17.0, fiber: 2.5, moisture: 10.0, calories: 3845,
    ingredients: [
      'chicken meal', 'whole grain wheat', 'cracked pearled barley',
      'whole grain sorghum', 'whole grain corn', 'chicken fat',
      'corn gluten meal', 'chicken liver flavour', 'dried beet pulp',
      'soybean oil', 'fish oil', 'vitamins', 'minerals',
    ],
  },
  hills_canine_adult: {
    protein: 25.0, fat: 15.0, fiber: 3.0, moisture: 10.0, calories: 3725,
    ingredients: [
      'chicken meal', 'whole grain wheat', 'cracked pearled barley',
      'whole grain sorghum', 'whole grain corn', 'chicken fat',
      'corn gluten meal', 'chicken liver flavour', 'dried beet pulp',
      'soybean oil', 'flaxseed', 'vitamins', 'minerals',
    ],
  },
  // Advance
  advance_feline_adult: {
    protein: 36.0, fat: 16.0, fiber: 3.0, moisture: 10.0, calories: 3750,
    ingredients: [
      'chicken meal', 'rice', 'maize gluten', 'chicken fat',
      'sorghum', 'dried beet pulp', 'natural flavour',
      'fish oil', 'sunflower oil', 'potassium chloride',
      'salt', 'vitamins', 'minerals', 'taurine',
    ],
  },
  advance_canine_puppy: {
    protein: 30.0, fat: 18.0, fiber: 2.5, moisture: 10.5, calories: 3850,
    ingredients: [
      'chicken meal', 'rice', 'maize gluten', 'chicken fat',
      'sorghum', 'dried beet pulp', 'fish oil',
      'sunflower oil', 'potassium chloride', 'salt',
      'vitamins', 'minerals', 'natural antioxidants',
    ],
  },
  advance_canine_adult: {
    protein: 26.0, fat: 14.0, fiber: 3.0, moisture: 10.5, calories: 3650,
    ingredients: [
      'chicken meal', 'rice', 'maize gluten', 'chicken fat',
      'sorghum', 'dried beet pulp', 'fish oil',
      'sunflower oil', 'potassium chloride', 'salt',
      'vitamins', 'minerals',
    ],
  },
  advance_canine_senior: {
    protein: 22.0, fat: 12.0, fiber: 4.0, moisture: 10.5, calories: 3400,
    ingredients: [
      'chicken meal', 'rice', 'maize gluten', 'chicken fat',
      'sorghum', 'dried beet pulp', 'fish oil',
      'sunflower oil', 'glucosamine', 'chondroitin',
      'potassium chloride', 'salt', 'vitamins', 'minerals',
    ],
  },
  // Black Hawk
  bh_feline_adult: {
    protein: 32.0, fat: 14.0, fiber: 5.0, moisture: 10.0, calories: 3600,
    ingredients: [
      'chicken meal', 'rice', 'maize', 'chicken fat',
      'vegetable protein', 'beet pulp', 'natural flavour',
      'fish oil', 'sunflower oil', 'chickpeas',
      'yucca schidigera extract', 'rosemary extract',
      'vitamins', 'minerals', 'taurine',
    ],
  },
  bh_canine_adult: {
    protein: 24.0, fat: 14.0, fiber: 4.0, moisture: 10.0, calories: 3550,
    ingredients: [
      'lamb meal', 'rice', 'maize', 'chicken fat',
      'vegetable protein', 'beet pulp', 'natural flavour',
      'fish oil', 'sunflower oil', 'chickpeas',
      'yucca schidigera extract', 'rosemary extract',
      'glucosamine', 'chondroitin', 'vitamins', 'minerals',
    ],
  },
  // Ziwi Peak
  ziwi_feline_adult: {
    protein: 44.0, fat: 24.0, fiber: 2.0, moisture: 14.0, calories: 4800,
    ingredients: [
      'mackerel', 'lamb', 'lamb heart', 'lamb tripe',
      'lamb liver', 'lamb lung', 'new zealand green mussel',
      'lamb kidney', 'lamb bone', 'lecithin',
      'inulin', 'dried kelp', 'vitamins', 'minerals',
      'salt', 'taurine',
    ],
  },
  ziwi_canine_adult: {
    protein: 38.0, fat: 28.0, fiber: 3.0, moisture: 14.0, calories: 5200,
    ingredients: [
      'lamb', 'lamb heart', 'lamb tripe', 'lamb liver',
      'lamb kidney', 'lamb lung', 'new zealand green mussel',
      'lamb bone', 'lecithin', 'inulin',
      'dried kelp', 'vitamins', 'minerals', 'salt',
    ],
  },
};

// ============================================================
// Pipeline
// ============================================================

const OUTPUT_DIR = path.resolve(__dirname, '../../../data');

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function main(): void {
  console.log('Sprint 1.3C-P2: Multi-Source Product Verification Layer\n');

  // 1. Verify all 20 products
  const profiles = verifyAllProducts(SEED_DATA);
  console.log(`Verified ${profiles.length} product(s)\n`);

  // 2. Build summary
  const summary = buildVerificationSummary(profiles);

  // 3. Output verified_product_profiles.json
  ensureOutputDir();
  const profilesPath = path.join(OUTPUT_DIR, 'verified_product_profiles.json');
  fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
  console.log(`Profiles written to: ${profilesPath}`);

  // 4. Output verification_summary.json
  const summaryPath = path.join(OUTPUT_DIR, 'verification_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Summary  written to: ${summaryPath}\n`);

  // 5. Print summary
  console.log('=== VERIFICATION SUMMARY ===');
  console.log(`Total Products:        ${summary.total_products}`);
  console.log(`Verified:              ${summary.verified}`);
  console.log(`Partial:               ${summary.partial}`);
  console.log(`Conflict:              ${summary.conflict}`);
  console.log(`Average Confidence:     ${summary.average_overall_confidence}`);
  console.log(`Total Conflicts:        ${summary.total_conflicts}`);
  console.log('\nTier Distribution:');
  console.log(`  GOLD:   ${summary.tier_distribution.GOLD}`);
  console.log(`  SILVER: ${summary.tier_distribution.SILVER}`);
  console.log(`  BRONZE: ${summary.tier_distribution.BRONZE}`);
  console.log(`  UNVERIFIED: ${summary.tier_distribution.UNVERIFIED}`);
  console.log('\nField Coverage (verified+):');
  console.log(`  Protein:     ${summary.field_coverage.protein}/${summary.total_products}`);
  console.log(`  Fat:         ${summary.field_coverage.fat}/${summary.total_products}`);
  console.log(`  Fiber:       ${summary.field_coverage.fiber}/${summary.total_products}`);
  console.log(`  Moisture:    ${summary.field_coverage.moisture}/${summary.total_products}`);
  console.log(`  Calories:    ${summary.field_coverage.calories}/${summary.total_products}`);
  console.log(`  Ingredients: ${summary.field_coverage.ingredients}/${summary.total_products}`);
}

main();
