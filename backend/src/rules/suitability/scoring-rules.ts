import { Rule } from '../types';

/**
 * Suitability scoring rules — bonus and penalty items applied
 * to a VerifiedProduct during suitability evaluation.
 * 
 * Extracted from scoreProductSuitability() in suitability-engine.ts
 * and generateProductInsight() in product-insight-engine.ts.
 * 
 * Positive weights = strength/bonus, negative weights = risk/penalty.
 */
export const suitabilityScoringRules: Rule[] = [
  // ── Verification-strength items ──
  {
    id: 'SUIT_STRONG_VERIFICATION',
    category: 'suitability',
    condition: 'confidence >= 90',
    action: 'bonus: Strong Source Verification',
    weight: 5,
    reason: 'High-confidence verified product data (>90) is a strong reliability signal.',
  },
  {
    id: 'SUIT_GOOD_VERIFICATION',
    category: 'suitability',
    condition: 'confidence >= 80 and < 90',
    action: 'bonus: Good Source Verification',
    weight: 3,
    reason: 'Moderately verified product data (80-89) provides adequate reliability.',
  },

  // ── Price-tier items ──
  {
    id: 'SUIT_VALUE_PRICE',
    category: 'suitability',
    condition: 'unit_price_aud_per_kg <= 25',
    action: 'bonus: Good Everyday Value',
    weight: 3,
    reason: 'Price at or below $25/kg is good value for everyday feeding.',
  },
  {
    id: 'SUIT_PREMIUM_PRICE',
    category: 'suitability',
    condition: 'unit_price_aud_per_kg > 80',
    action: 'penalty: Above Average Price',
    weight: -4,
    reason: 'Premium pricing (>$80/kg) may not suit all budgets.',
  },

  // ── Ingredient / market items ──
  {
    id: 'SUIT_CONTROVERSIAL_INGREDIENTS',
    category: 'suitability',
    condition: 'controversial_ingredients not empty',
    action: 'penalty: Contains Watch-List Ingredients',
    weight: -5,
    reason: 'Presence of controversial or watch-list ingredients may concern some owners.',
  },
  {
    id: 'SUIT_LIMITED_AVAILABILITY',
    category: 'suitability',
    condition: 'market_availability = LIMITED',
    action: 'penalty: Limited Availability',
    weight: -3,
    reason: 'Limited market availability may cause supply disruption.',
  },

  // ── Life-stage mismatch ──
  {
    id: 'SUIT_LIFE_STAGE_MISMATCH',
    category: 'suitability',
    condition: 'life_stage != ALL_LIFE_STAGES and does not match profile',
    action: 'penalty: Life Stage Mismatch',
    weight: -8,
    reason: 'Product not formulated for this pet\'s current life stage.',
  },

  // ── Suitability-tag alignment ──
  {
    id: 'SUIT_TAG_SENSITIVE_STOMACH',
    category: 'suitability',
    condition: 'suitability_tags includes Sensitive Stomach',
    action: 'bonus: Sensitive Stomach Formula',
    weight: 3,
    reason: 'Formulated for sensitive digestion, beneficial for GI-sensitive profiles.',
  },
  {
    id: 'SUIT_TAG_HIGH_PROTEIN',
    category: 'suitability',
    condition: 'suitability_tags includes High Protein',
    action: 'bonus: High Protein Formula',
    weight: 3,
    reason: 'High protein formula supports active pets and muscle maintenance.',
  },
  {
    id: 'SUIT_TAG_WEIGHT_CONTROL',
    category: 'suitability',
    condition: 'suitability_tags includes Weight Control',
    action: 'bonus: Weight Control Formula',
    weight: 2,
    reason: 'Weight control formula supports healthy body condition.',
  },

  // ── Warning-only (weight=0) items ──
  {
    id: 'SUIT_WARN_LIMITED_VERIFICATION',
    category: 'suitability',
    condition: 'confidence < 80',
    action: 'warning: Limited Verification Depth',
    weight: 0,
    reason: 'Lower verification depth may mean less reliable product data.',
  },
];
