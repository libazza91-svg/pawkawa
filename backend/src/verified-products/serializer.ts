import { buildNeedProfile, buildProductDecisionSummary, buildProductEvidence, NeedProfileCode, scoreProductForNeed, SuitabilityResult } from '../domain';
import { VerifiedProduct } from '../intelligence/types';
import { CompareReadyProductResponse, VerifiedProductDetailResponse, VerifiedProductListItem } from './types';

const imageBySlug: Record<string, string> = {
  'ziwi-peak-air-dried-mackerel-lamb': 'https://placehold.co/640x800/f3ead9/5f6d57?text=Ziwi+Peak',
  'black-hawk-indoor-chicken-rice': 'https://placehold.co/640x800/efe8de/6a604f?text=Black+Hawk',
  'royal-canin-sterilised-37': 'https://placehold.co/640x800/f6ece2/9a6c4f?text=Royal+Canin',
  'feline-natural-freeze-dried-lamb-feast': 'https://placehold.co/640x800/f4ead8/8a7352?text=Feline+Natural',
};

export function getPrimaryImageUrl(product: VerifiedProduct): string {
  return imageBySlug[product.slug] ?? `https://placehold.co/640x800/f4ecdd/6b5e50?text=${encodeURIComponent(product.brand)}`;
}

export function getSuitabilityForNeed(product: VerifiedProduct, needCode?: NeedProfileCode): SuitabilityResult | undefined {
  if (!needCode) return undefined;
  return scoreProductForNeed(product, buildNeedProfile(needCode));
}

export function serializeVerifiedProductListItem(product: VerifiedProduct, needCode?: NeedProfileCode): VerifiedProductListItem {
  const summary = buildProductDecisionSummary(product);
  const suitability = getSuitabilityForNeed(product, needCode);

  return {
    product_id: product.id,
    slug: product.slug,
    product_name: product.name,
    brand_name: product.brand,
    species: product.species,
    life_stage: product.life_stage,
    market_availability: product.market_availability,
    trust_grade: product.verification_grade,
    confidence: product.confidence,
    quick_verdict: summary.quick_verdict,
    strengths: summary.strengths,
    best_for: summary.best_for,
    considerations: summary.considerations,
    price_from: product.unit_price_aud_per_kg,
    unit_price_per_kg: product.unit_price_aud_per_kg,
    primary_image_url: getPrimaryImageUrl(product),
    source_count: product.confidence >= 90 ? 5 : product.confidence >= 80 ? 3 : 1,
    suitability_score: suitability?.score,
    suitability_grade: suitability?.grade,
  };
}

export function serializeVerifiedProductDetail(product: VerifiedProduct): VerifiedProductDetailResponse {
  const evidence = buildProductEvidence(product);
  const summary = buildProductDecisionSummary(product, undefined, evidence);
  const disclaimerRequired = summary.suitability.some((result) => result.disclaimer_required);

  return {
    identity: {
      product_id: product.id,
      slug: product.slug,
      product_name: product.name,
      brand_name: product.brand,
      species: product.species,
      life_stage: product.life_stage,
      market_availability: product.market_availability,
    },
    quick_verdict: summary.quick_verdict,
    strengths: summary.strengths,
    considerations: summary.considerations,
    best_for: summary.best_for,
    avoid_if: summary.avoid_if,
    suitability_results: summary.suitability,
    nutrition_profile: product.nutrition,
    ingredient_profile: {
      normalized_ingredients: product.ingredients_normalized,
      controversial_ingredients: product.controversial_ingredients,
      suitability_tags: product.suitability_tags,
    },
    retail_offers: [
      {
        retailer: 'Verified catalog',
        price_aud: product.unit_price_aud_per_kg,
        unit_price_per_kg: product.unit_price_aud_per_kg,
        source_url: `https://pawkawa.local/products/${product.slug}`,
      },
    ],
    evidence_refs: summary.evidence_refs,
    confidence: product.confidence,
    trust_grade: product.verification_grade,
    market_availability: product.market_availability,
    image_metadata: [
      {
        image_url: getPrimaryImageUrl(product),
        source_url: `https://pawkawa.local/products/${product.slug}`,
        source_type: 'MANUAL',
        alt_text: `${product.brand} ${product.name}`,
      },
    ],
    disclaimer_flags: {
      disclaimer_required: disclaimerRequired,
      medical_caution: disclaimerRequired,
      text: disclaimerRequired ? summary.disclaimer : undefined,
    },
  };
}

export function serializeCompareReadyProduct(product: VerifiedProduct, needCode?: NeedProfileCode): CompareReadyProductResponse {
  const suitability = getSuitabilityForNeed(product, needCode);

  return {
    product_id: product.id,
    slug: product.slug,
    product_name: product.name,
    brand_name: product.brand,
    trust_grade: product.verification_grade,
    confidence: product.confidence,
    protein: product.nutrition.protein,
    fat: product.nutrition.fat,
    fiber: product.nutrition.fiber,
    calories: product.nutrition.calories,
    price_per_kg: product.unit_price_aud_per_kg,
    suitability_summary: {
      score: suitability?.score,
      grade: suitability?.grade,
      reasons: suitability?.matched_reasons ?? [],
      cautions: suitability?.caution_reasons ?? [],
    },
  };
}
