import { Rule } from '../types';

/**
 * Nutrition threshold rules extracted from the original
 * generateProductInsight function in product-insight-engine.ts.
 * 
 * These rules determine strength/consideration flags based on
 * macronutrient thresholds (protein, fat, fiber).
 */
export const nutritionRules: Rule[] = [
  {
    id: 'NUT_HIGH_PROTEIN',
    category: 'nutrition',
    condition: 'protein >= 36 %',
    action: 'flag as "High Protein" strength',
    weight: 5,
    reason: 'Protein at or above 36% qualifies as high protein, beneficial for active pets and growth.',
  },
  {
    id: 'NUT_BALANCED_PROTEIN',
    category: 'nutrition',
    condition: 'protein >= 30 % and < 36 %',
    action: 'flag as "Balanced Protein" strength',
    weight: 3,
    reason: 'Protein between 30–35.9% meets maintenance needs for most adult pets.',
  },
  {
    id: 'NUT_HIGH_FAT',
    category: 'nutrition',
    condition: 'fat >= 28 %',
    action: 'flag as "High Fat" consideration',
    weight: -5,
    reason: 'Fat at or above 28% may be unsuitable for weight management, GI-sensitive, or sedentary pets.',
  },
  {
    id: 'NUT_MODERATE_FAT',
    category: 'nutrition',
    condition: 'fat >= 18 % and < 28 %',
    action: 'acceptable fat range (no flag)',
    weight: 0,
    reason: 'Fat between 18–27.9% is a moderate range suitable for most adult pets.',
  },
  {
    id: 'NUT_LOW_FAT',
    category: 'nutrition',
    condition: 'fat < 18 %',
    action: 'flag as "Low Fat" strength',
    weight: 3,
    reason: 'Fat below 18% is suitable for weight control, senior, or GI-sensitive profiles.',
  },
  {
    id: 'NUT_HIGH_FIBER',
    category: 'nutrition',
    condition: 'fiber >= 5 %',
    action: 'flag as "High Fiber" consideration',
    weight: -2,
    reason: 'Fiber above 5% may help weight management but can reduce palatability or nutrient density.',
  },
];
