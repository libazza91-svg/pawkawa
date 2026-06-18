import { generateProductIntelligenceV1 } from '../rules/suitability/suitability-engine';
import { ProductInsight, VerifiedProduct } from './types';
import { findVerifiedProductByIdOrSlug, verifiedProducts } from '../verified-products/catalog';

export { verifiedProducts };

export function findVerifiedProduct(idOrSlug: string): VerifiedProduct | undefined {
  return findVerifiedProductByIdOrSlug(idOrSlug);
}

export function generateProductInsight(product: VerifiedProduct): ProductInsight {
  return generateProductIntelligenceV1(product);
}
