/**
 * Health Mapper — Stage 4 of the normalization pipeline
 *
 * Maps normalized ingredients to health needs using Nutrition Rule Mapping V1.
 * Evaluates ingredient suitability for each health need.
 */

export type HealthNeed =
  | 'WEIGHT_CONTROL'
  | 'KIDNEY_SUPPORT'
  | 'ALLERGY_SENSITIVE'
  | 'SENIOR_CARE'
  | 'KITTEN_PUPPY';

export type Species = 'CAT' | 'DOG';

export interface HealthRule {
  rule_id: string;
  health_need: HealthNeed;
  species: Species;
  description: string;
  /** Ingredient canonical_names that are BENEFICIAL for this health need */
  beneficial: string[];
  /** Ingredient canonical_names that should be AVOIDED for this health need */
  avoid: string[];
}

/**
 * Health rules derived from Nutrition Rule Mapping V1
 * 5 health needs × 2 species = 10 rule groups
 */
export const HEALTH_RULES: HealthRule[] = [
  // ============ WEIGHT_CONTROL ============
  {
    rule_id: 'WC-CAT-01', health_need: 'WEIGHT_CONTROL', species: 'CAT',
    description: '体重管理猫配方 — 高蛋白、低脂肪、低碳水',
    beneficial: ['Chicken', 'Turkey', 'Chicken Meal', 'Whitefish', 'Tuna',
                 'Brown Rice', 'Sweet Potato', 'L-Carnitine'],
    avoid: ['Beef Fat', 'Chicken Fat', 'Corn', 'Wheat', 'Tapioca', 'White Rice'],
  },
  {
    rule_id: 'WC-DOG-01', health_need: 'WEIGHT_CONTROL', species: 'DOG',
    description: '体重管理犬配方',
    beneficial: ['Chicken', 'Turkey', 'Chicken Meal', 'Fish Meal',
                 'Brown Rice', 'Sweet Potato', 'Peas', 'L-Carnitine'],
    avoid: ['Beef Fat', 'Chicken Fat', 'Corn', 'Wheat', 'Tapioca', 'White Rice'],
  },

  // ============ KIDNEY_SUPPORT ============
  {
    rule_id: 'KS-CAT-01', health_need: 'KIDNEY_SUPPORT', species: 'CAT',
    description: '肾脏支持猫 — 低磷、优质蛋白、高水分',
    beneficial: ['Chicken', 'White Rice', 'Fish Oil', 'Egg Product', 'Chicken Fat'],
    avoid: ['Beef Meal', 'Lamb Meal', 'Poultry Meal', 'Corn Gluten Meal', 'Soy Protein'],
  },
  {
    rule_id: 'KS-DOG-01', health_need: 'KIDNEY_SUPPORT', species: 'DOG',
    description: '肾脏支持犬',
    beneficial: ['Chicken', 'Turkey', 'White Rice', 'Fish Oil', 'Egg Product'],
    avoid: ['Beef Meal', 'Lamb Meal', 'Poultry Meal', 'Corn Gluten Meal', 'Soy Protein'],
  },

  // ============ ALLERGY_SENSITIVE ============
  {
    rule_id: 'AS-CAT-01', health_need: 'ALLERGY_SENSITIVE', species: 'CAT',
    description: '过敏敏感猫 — 单一蛋白源，无常见过敏原',
    beneficial: ['Duck', 'Lamb', 'Salmon', 'Sweet Potato', 'Peas',
                 'Fish Oil', 'Tapioca', 'Potato Protein'],
    avoid: ['Chicken', 'Beef', 'Corn', 'Wheat', 'Soy Protein', 'Corn Gluten Meal',
            'Wheat Gluten', 'Poultry Meal'],
  },
  {
    rule_id: 'AS-DOG-01', health_need: 'ALLERGY_SENSITIVE', species: 'DOG',
    description: '过敏敏感犬',
    beneficial: ['Duck', 'Lamb', 'Salmon', 'Sweet Potato', 'Peas',
                 'Fish Oil', 'Tapioca', 'Potato Protein'],
    avoid: ['Chicken', 'Beef', 'Corn', 'Wheat', 'Soy Protein', 'Corn Gluten Meal',
            'Wheat Gluten', 'Poultry Meal'],
  },

  // ============ SENIOR_CARE ============
  {
    rule_id: 'SC-CAT-01', health_need: 'SENIOR_CARE', species: 'CAT',
    description: '老年猫关怀 — 关节支持、易消化、抗氧化',
    beneficial: ['Chicken', 'Salmon', 'Fish Oil', 'Green-Lipped Mussel',
                 'Glucosamine', 'Brown Rice', 'Vitamin E Supplement', 'Taurine'],
    avoid: ['Poultry Meal', 'Corn Gluten Meal', 'Soy Protein', 'Wheat'],
  },
  {
    rule_id: 'SC-DOG-01', health_need: 'SENIOR_CARE', species: 'DOG',
    description: '老年犬关怀',
    beneficial: ['Chicken', 'Salmon', 'Fish Oil', 'Green-Lipped Mussel',
                 'Glucosamine', 'Brown Rice', 'Vitamin E Supplement'],
    avoid: ['Poultry Meal', 'Corn Gluten Meal', 'Soy Protein', 'Wheat'],
  },

  // ============ KITTEN_PUPPY ============
  {
    rule_id: 'KP-CAT-01', health_need: 'KITTEN_PUPPY', species: 'CAT',
    description: '幼猫 — 高蛋白、DHA、钙磷平衡、牛磺酸',
    beneficial: ['Chicken', 'Chicken Meal', 'Salmon', 'Fish Oil', 'Egg Product',
                 'Taurine', 'Calcium Carbonate', 'Dicalcium Phosphate',
                 'Colostrum', 'Chicken Liver', 'Chicken Heart'],
    avoid: ['Poultry Meal', 'Corn Gluten Meal', 'Wheat Gluten', 'Soy Protein'],
  },
  {
    rule_id: 'KP-DOG-01', health_need: 'KITTEN_PUPPY', species: 'DOG',
    description: '幼犬 — 高蛋白、钙磷平衡',
    beneficial: ['Chicken', 'Chicken Meal', 'Lamb', 'Fish Oil', 'Egg Product',
                 'Calcium Carbonate', 'Dicalcium Phosphate', 'Colostrum'],
    avoid: ['Poultry Meal', 'Corn Gluten Meal', 'Wheat Gluten', 'Soy Protein'],
  },
];

/**
 * Get applicable rules for a given species and health need
 */
export function getRules(species: Species, health_need: HealthNeed): HealthRule[] {
  return HEALTH_RULES.filter(r => r.species === species && r.health_need === health_need);
}

/**
 * Score a single ingredient against a health rule
 * Returns: beneficial (+1), avoid (-1), neutral (0)
 */
export function scoreIngredient(canonicalName: string, rule: HealthRule): number {
  const lower = canonicalName.toLowerCase();
  if (rule.beneficial.some(b => b.toLowerCase() === lower)) return 1;
  if (rule.avoid.some(a => a.toLowerCase() === lower)) return -1;
  return 0;
}

export interface HealthScore {
  health_need: HealthNeed;
  species: Species;
  /** Overall suitability score 0.0 - 1.0 */
  suitability_score: number;
  beneficial_ingredients: string[];
  avoid_ingredients: string[];
  explanation: string;
}

/**
 * Evaluate a set of normalized ingredients against all health needs for a species
 */
export function evaluateHealth(
  normalizedIngredients: string[],
  species: Species,
): HealthScore[] {
  const allNeeds: HealthNeed[] = ['WEIGHT_CONTROL', 'KIDNEY_SUPPORT', 'ALLERGY_SENSITIVE', 'SENIOR_CARE', 'KITTEN_PUPPY'];

  return allNeeds.map(need => {
    const rules = getRules(species, need);
    const beneficial: string[] = [];
    const avoid: string[] = [];
    let totalScore = 0;

    for (const ingredient of normalizedIngredients) {
      for (const rule of rules) {
        const s = scoreIngredient(ingredient, rule);
        if (s === 1) beneficial.push(ingredient);
        else if (s === -1) avoid.push(ingredient);
        totalScore += s;
      }
    }

    // Normalize to 0-1 range
    const maxPossible = normalizedIngredients.length;
    const minPossible = -normalizedIngredients.length;
    const suitability = maxPossible > minPossible
      ? (totalScore - minPossible) / (maxPossible - minPossible)
      : 0.5;

    return {
      health_need: need,
      species,
      suitability_score: Math.round(suitability * 100) / 100,
      beneficial_ingredients: [...new Set(beneficial)],
      avoid_ingredients: [...new Set(avoid)],
      explanation: generateExplanation(need, species, suitability, [...new Set(beneficial)], [...new Set(avoid)]),
    };
  });
}

function generateExplanation(
  need: HealthNeed,
  species: Species,
  score: number,
  beneficial: string[],
  avoid: string[],
): string {
  const needLabel: Record<HealthNeed, string> = {
    WEIGHT_CONTROL: '体重管理',
    KIDNEY_SUPPORT: '肾脏支持',
    ALLERGY_SENSITIVE: '过敏敏感',
    SENIOR_CARE: '老年关怀',
    KITTEN_PUPPY: species === 'CAT' ? '幼猫' : '幼犬',
  };

  let explanation = `${needLabel[need]} (${species}): `;

  if (score >= 0.80) {
    explanation += `非常适合 — `;
  } else if (score >= 0.60) {
    explanation += `基本合适 — `;
  } else if (score >= 0.40) {
    explanation += `勉强可用 — `;
  } else {
    explanation += `不推荐 — `;
  }

  if (beneficial.length > 0) {
    explanation += `有益成分: ${beneficial.slice(0, 3).join(', ')}${beneficial.length > 3 ? ` +${beneficial.length - 3} 项` : ''}. `;
  }
  if (avoid.length > 0) {
    explanation += `需注意: ${avoid.slice(0, 3).join(', ')}${avoid.length > 3 ? ` +${avoid.length - 3} 项` : ''}.`;
  }

  return explanation;
}
