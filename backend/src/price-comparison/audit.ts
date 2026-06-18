import { canonicalProducts } from './fixture-data';
import { CanonicalProduct, MarketRegion, StockStatus } from './types';

export type OfferCoverageStatus = 'NO_OFFERS' | 'LIMITED' | 'BASIC' | 'GOOD';
export type OfferSourceType =
  | 'petstock_ingestion_pilot_v1'
  | 'petbarn_ingestion_pilot_v1'
  | 'fixture'
  | 'seed'
  | 'demo'
  | 'unknown';
export type OfferCoverageWarning =
  | 'NO_OFFERS'
  | 'ONLY_ONE_RETAILER'
  | 'MISSING_LAST_CHECKED'
  | 'STALE_PRICE'
  | 'UNKNOWN_SOURCE'
  | 'NO_IN_STOCK_OFFER'
  | 'FIXTURE_ONLY';

export interface AuditRetailOfferRow {
  product_slug: string;
  retailer_slug: string;
  retailer_name: string;
  market: MarketRegion;
  currency: string;
  effective_price: number | null;
  stock_status: StockStatus | string;
  last_checked_at: Date | null | string;
  metadata?: Record<string, unknown> | null;
}

export interface ProductCoverageAudit {
  product_slug: string;
  product_name: string;
  brand: string;
  pack_size_g?: number;
  offer_count: number;
  retailer_count: number;
  retailers: string[];
  best_price?: number;
  best_retailer?: string;
  coverage_status: OfferCoverageStatus;
  last_checked?: string;
  source_types?: OfferSourceType[];
  homepage_candidate: boolean;
  warnings: OfferCoverageWarning[];
}

export interface OfferCoverageAuditSummary {
  canonical_products_total: number;
  products_with_any_offer: number;
  products_with_no_offer: number;
  products_with_1_retailer: number;
  products_with_2_or_more_retailers: number;
  products_with_real_ingestion_offer: number;
  products_with_fixture_only: number;
  products_with_mixed_source_types: number;
  petstock_offer_count: number;
  petbarn_offer_count: number;
  multi_retailer_product_count: number;
  stale_offer_count: number;
  missing_last_checked_count: number;
  homepage_candidate_count: number;
  source_metadata_available: boolean;
  unknown_source_count: number;
  source_breakdown: Record<OfferSourceType, number>;
  db_offer_count: number;
  real_ingestion_offer_count: number;
  fixture_offer_count: number;
  seed_offer_count: number;
  demo_offer_count: number;
}

export interface OfferCoverageAuditReport {
  generated_at: string;
  market: MarketRegion;
  summary: OfferCoverageAuditSummary;
  products: ProductCoverageAudit[];
}

const STALE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function asDate(value: Date | null | string | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function rawSourceValue(metadata?: Record<string, unknown> | null): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const source = metadata.source;
  return typeof source === 'string' && source.trim().length > 0 ? source.trim() : null;
}

export function classifyOfferSource(metadata?: Record<string, unknown> | null): OfferSourceType {
  const raw = rawSourceValue(metadata)?.toLowerCase();
  if (!raw) return 'unknown';
  if (raw === 'petstock_ingestion_pilot_v1') return 'petstock_ingestion_pilot_v1';
  if (raw === 'petbarn_ingestion_pilot_v1') return 'petbarn_ingestion_pilot_v1';
  if (raw === 'fixture_backfill_v1' || raw.includes('fixture')) return 'fixture';
  if (raw.includes('seed')) return 'seed';
  if (raw.includes('demo')) return 'demo';
  return 'unknown';
}

export function coverageStatusForRetailerCount(retailerCount: number): OfferCoverageStatus {
  if (retailerCount <= 0) return 'NO_OFFERS';
  if (retailerCount === 1) return 'LIMITED';
  if (retailerCount === 2) return 'BASIC';
  return 'GOOD';
}

function hasInStockOffer(offers: AuditRetailOfferRow[]): boolean {
  return offers.some((offer) => offer.stock_status !== 'OUT_OF_STOCK');
}

function bestBuyableOffer(offers: AuditRetailOfferRow[]): AuditRetailOfferRow | null {
  return (
    [...offers]
      .filter((offer) => offer.stock_status !== 'OUT_OF_STOCK' && offer.effective_price !== null)
      .sort((left, right) => (left.effective_price ?? Number.POSITIVE_INFINITY) - (right.effective_price ?? Number.POSITIVE_INFINITY))[0] ?? null
  );
}

function latestCheckedAt(offers: AuditRetailOfferRow[]): Date | null {
  return offers
    .map((offer) => asDate(offer.last_checked_at))
    .filter((value): value is Date => value !== null)
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
}

function isStale(value: Date | null, now: Date): boolean {
  if (!value) return false;
  return now.getTime() - value.getTime() > STALE_WINDOW_MS;
}

function productWarnings(
  offers: AuditRetailOfferRow[],
  retailerCount: number,
  sourceTypes: OfferSourceType[],
  now: Date,
): OfferCoverageWarning[] {
  const warnings = new Set<OfferCoverageWarning>();

  if (retailerCount === 0) warnings.add('NO_OFFERS');
  if (retailerCount === 1) warnings.add('ONLY_ONE_RETAILER');
  if (offers.length > 0 && !hasInStockOffer(offers)) warnings.add('NO_IN_STOCK_OFFER');
  if (offers.some((offer) => !asDate(offer.last_checked_at))) warnings.add('MISSING_LAST_CHECKED');
  if (offers.some((offer) => isStale(asDate(offer.last_checked_at), now))) warnings.add('STALE_PRICE');
  if (sourceTypes.includes('unknown')) warnings.add('UNKNOWN_SOURCE');
  if (sourceTypes.length > 0 && sourceTypes.every((sourceType) => sourceType === 'fixture')) warnings.add('FIXTURE_ONLY');

  return [...warnings];
}

function hasRealIngestionSource(sourceTypes: OfferSourceType[]): boolean {
  return sourceTypes.some((sourceType) => sourceType === 'petstock_ingestion_pilot_v1' || sourceType === 'petbarn_ingestion_pilot_v1');
}

export function buildOfferCoverageAuditReport(
  offers: AuditRetailOfferRow[],
  options: { market?: MarketRegion; now?: Date; catalog?: CanonicalProduct[] } = {},
): OfferCoverageAuditReport {
  const market = options.market ?? 'AU';
  const now = options.now ?? new Date();
  const catalog = options.catalog ?? canonicalProducts.filter((product) => product.species === 'CAT');

  const marketOffers = offers.filter((offer) => offer.market === market);
  const offersByProduct = new Map<string, AuditRetailOfferRow[]>();

  for (const offer of marketOffers) {
    const rows = offersByProduct.get(offer.product_slug) ?? [];
    rows.push(offer);
    offersByProduct.set(offer.product_slug, rows);
  }

  const products = catalog
    .map((product) => {
      const productOffers = offersByProduct.get(product.slug) ?? [];
      const retailerMap = new Map(productOffers.map((offer) => [offer.retailer_slug, offer.retailer_name]));
      const retailerCount = retailerMap.size;
      const coverageStatus = coverageStatusForRetailerCount(retailerCount);
      const bestOffer = bestBuyableOffer(productOffers);
      const sourceTypes = [...new Set(productOffers.map((offer) => classifyOfferSource(offer.metadata)))];
      const lastChecked = latestCheckedAt(productOffers);
      const homepageCandidate = productOffers.length > 0 && Boolean(bestOffer?.effective_price !== null && hasInStockOffer(productOffers));

      return {
        product_slug: product.slug,
        product_name: product.product_name,
        brand: product.brand_name,
        pack_size_g: product.pack_size_g,
        offer_count: productOffers.length,
        retailer_count: retailerCount,
        retailers: [...retailerMap.values()].sort(),
        best_price: bestOffer?.effective_price ?? undefined,
        best_retailer: bestOffer?.retailer_name ?? undefined,
        coverage_status: coverageStatus,
        last_checked: lastChecked?.toISOString(),
        source_types: sourceTypes.length > 0 ? sourceTypes.sort() : undefined,
        homepage_candidate: homepageCandidate,
        warnings: productWarnings(productOffers, retailerCount, sourceTypes, now),
      } satisfies ProductCoverageAudit;
    })
    .sort((left, right) => {
      if (right.homepage_candidate !== left.homepage_candidate) return Number(right.homepage_candidate) - Number(left.homepage_candidate);
      if (right.retailer_count !== left.retailer_count) return right.retailer_count - left.retailer_count;
      return left.product_slug.localeCompare(right.product_slug);
    });

  const sourceBreakdown: Record<OfferSourceType, number> = {
    petstock_ingestion_pilot_v1: 0,
    petbarn_ingestion_pilot_v1: 0,
    fixture: 0,
    seed: 0,
    demo: 0,
    unknown: 0,
  };

  let staleOfferCount = 0;
  let missingLastCheckedCount = 0;
  let sourceMetadataAvailable = false;

  for (const offer of marketOffers) {
    const sourceType = classifyOfferSource(offer.metadata);
    sourceBreakdown[sourceType] += 1;
    if (rawSourceValue(offer.metadata)) sourceMetadataAvailable = true;
    const checkedAt = asDate(offer.last_checked_at);
    if (!checkedAt) {
      missingLastCheckedCount += 1;
    } else if (isStale(checkedAt, now)) {
      staleOfferCount += 1;
    }
  }

  const summary: OfferCoverageAuditSummary = {
    canonical_products_total: catalog.length,
    products_with_any_offer: products.filter((product) => product.offer_count > 0).length,
    products_with_no_offer: products.filter((product) => product.offer_count === 0).length,
    products_with_1_retailer: products.filter((product) => product.retailer_count === 1).length,
    products_with_2_or_more_retailers: products.filter((product) => product.retailer_count >= 2).length,
    products_with_real_ingestion_offer: products.filter((product) => hasRealIngestionSource(product.source_types ?? [])).length,
    products_with_fixture_only: products.filter(
      (product) => (product.source_types ?? []).length > 0 && (product.source_types ?? []).every((sourceType) => sourceType === 'fixture'),
    ).length,
    products_with_mixed_source_types: products.filter((product) => (product.source_types ?? []).length > 1).length,
    petstock_offer_count: marketOffers.filter((offer) => offer.retailer_slug === 'petstock').length,
    petbarn_offer_count: marketOffers.filter((offer) => offer.retailer_slug === 'petbarn').length,
    multi_retailer_product_count: products.filter((product) => product.retailer_count >= 2).length,
    stale_offer_count: staleOfferCount,
    missing_last_checked_count: missingLastCheckedCount,
    homepage_candidate_count: products.filter((product) => product.homepage_candidate).length,
    source_metadata_available: sourceMetadataAvailable,
    unknown_source_count: sourceBreakdown.unknown,
    source_breakdown: sourceBreakdown,
    db_offer_count: marketOffers.length,
    real_ingestion_offer_count: sourceBreakdown.petstock_ingestion_pilot_v1 + sourceBreakdown.petbarn_ingestion_pilot_v1,
    fixture_offer_count: sourceBreakdown.fixture,
    seed_offer_count: sourceBreakdown.seed,
    demo_offer_count: sourceBreakdown.demo,
  };

  return {
    generated_at: now.toISOString(),
    market,
    summary,
    products,
  };
}
