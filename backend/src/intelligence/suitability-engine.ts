import { generateProductInsight } from './product-insight-engine';
import { RecommendationConstraint, SuitabilityRecommendation, VerifiedProduct } from './types';

export function scoreProductSuitability(product: VerifiedProduct, constraints: RecommendationConstraint[]): SuitabilityRecommendation {
  const insight = generateProductInsight(product);
  let score = product.confidence;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const text = `${product.name} ${product.brand} ${product.suitability_tags.join(' ')} ${product.ingredients_normalized.join(' ')}`.toLowerCase();

  if (constraints.some((constraint) => constraint.code === 'PRESCRIPTION_REQUIRED')) {
    score -= 35;
    cautions.push('Prescription diet may override retail-food suitability');
  }

  if (constraints.some((constraint) => constraint.code === 'PREFER_DIGESTIBLE_GI_FOOD')) {
    if (text.includes('sensitive') || text.includes('digest') || insight.best_for.includes('Sensitive Stomach')) {
      score += 14;
      reasons.push('Sensitive stomach fit');
    }
  }

  if (constraints.some((constraint) => constraint.code === 'AVOID_HIGH_FAT_GI') && product.nutrition.fat >= 25) {
    score -= 18;
    cautions.push('High fat for GI-sensitive profile');
  }

  if (constraints.some((constraint) => constraint.code === 'CONSIDER_NOVEL_OR_HYDROLYZED')) {
    cautions.push('Confirm novel/hydrolyzed diet need with veterinarian');
  }

  if (product.confidence >= 90) reasons.push('High-confidence verified data');
  if (product.unit_price_aud_per_kg > 100) cautions.push('Premium unit price');
  if (product.controversial_ingredients.length > 0) cautions.push('Contains watch-list ingredients');

  return {
    product_id: product.id,
    product_slug: product.slug,
    product_name: product.name,
    suitability_score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    cautions,
  };
}
