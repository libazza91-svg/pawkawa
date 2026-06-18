import { NeedProfileCode } from '../domain';
import { LifeStage, MarketAvailability, Species, VerificationGrade } from '../intelligence/types';
import { findVerifiedProductByIdOrSlug, verifiedProducts } from './catalog';
import { serializeCompareReadyProduct, serializeVerifiedProductDetail, serializeVerifiedProductListItem } from './serializer';
import { CompareReadyProductResponse, VerifiedProductDetailResponse, VerifiedProductListItem, VerifiedProductListQuery } from './types';

function isNeedProfileCode(value: unknown): value is NeedProfileCode {
  return typeof value === 'string' && ['INDOOR_CAT', 'SENSITIVE_STOMACH', 'WEIGHT_CONTROL', 'SENIOR_SUPPORT', 'RECOVERY_SUPPORT', 'KITTEN_GROWTH', 'EVERYDAY_ADULT'].includes(value);
}

export function parseVerifiedProductListQuery(raw: Record<string, unknown>): VerifiedProductListQuery {
  const page = Math.max(1, Number(raw.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(raw.pageSize ?? 20) || 20));
  const needCode = isNeedProfileCode(raw.need_code) ? raw.need_code : undefined;

  return {
    page,
    pageSize,
    species: typeof raw.species === 'string' ? raw.species as Species : undefined,
    life_stage: typeof raw.life_stage === 'string' ? raw.life_stage as LifeStage : undefined,
    need_code: needCode,
    trust_grade: typeof raw.trust_grade === 'string' ? raw.trust_grade as VerificationGrade : undefined,
    market_availability: typeof raw.market_availability === 'string' ? raw.market_availability as MarketAvailability : undefined,
    sort: raw.sort === 'price_per_kg' || raw.sort === 'suitability_score' || raw.sort === 'confidence' ? raw.sort : undefined,
  };
}

export function listVerifiedProducts(query: VerifiedProductListQuery): {
  items: VerifiedProductListItem[];
  pagination: { page: number; pageSize: number; total: number };
} {
  let items = verifiedProducts.map((product) => serializeVerifiedProductListItem(product, query.need_code));

  if (query.species) items = items.filter((item) => item.species === query.species);
  if (query.life_stage) items = items.filter((item) => item.life_stage === query.life_stage);
  if (query.trust_grade) items = items.filter((item) => item.trust_grade === query.trust_grade);
  if (query.market_availability) items = items.filter((item) => item.market_availability === query.market_availability);

  if (query.sort === 'price_per_kg') {
    items = [...items].sort((a, b) => a.unit_price_per_kg - b.unit_price_per_kg);
  } else if (query.sort === 'suitability_score') {
    items = [...items].sort((a, b) => (b.suitability_score ?? 0) - (a.suitability_score ?? 0));
  } else {
    items = [...items].sort((a, b) => b.confidence - a.confidence);
  }

  const total = items.length;
  const offset = (query.page - 1) * query.pageSize;
  return {
    items: items.slice(offset, offset + query.pageSize),
    pagination: { page: query.page, pageSize: query.pageSize, total },
  };
}

export function getVerifiedProductDetail(slug: string): VerifiedProductDetailResponse | null {
  const product = findVerifiedProductByIdOrSlug(slug);
  return product ? serializeVerifiedProductDetail(product) : null;
}

export function getCompareReadyProduct(slug: string, needCode?: NeedProfileCode): CompareReadyProductResponse | null {
  const product = findVerifiedProductByIdOrSlug(slug);
  return product ? serializeCompareReadyProduct(product, needCode) : null;
}

export { verifiedProducts, findVerifiedProductByIdOrSlug };
