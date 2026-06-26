import { and, eq } from 'drizzle-orm';
import { db as defaultDb } from '../db/client';
import { manualOfferOverrides as manualOfferOverridesTable } from '../db/schema/manual_offer_overrides';
import { retailOffers as retailOffersTable } from '../db/schema/retail_offers';
import { currencyForMarket } from './markets';
import { canonicalProducts } from './fixture-data';
import { isSafePublicManualOverride, manualOverrideEffectivePrice, manualOverridePublicMetadata } from './manual-overrides';
import { findCanonicalProductInCatalog, PriceComparisonRepository } from './repository';
import { CanonicalProduct, CurrencyCode, MarketRegion, PromotionType, RetailOffer, StockStatus } from './types';

type DbClient = typeof defaultDb;
type RetailOfferRow = typeof retailOffersTable.$inferSelect;
type ManualOverrideRow = typeof manualOfferOverridesTable.$inferSelect;
type PgLikeError = { code?: string };

function numberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberOrZero(value: unknown): number {
  return numberOrUndefined(value) ?? 0;
}

function isoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function asStockStatus(value: string): StockStatus {
  if (value === 'IN_STOCK' || value === 'LOW_STOCK' || value === 'OUT_OF_STOCK' || value === 'UNKNOWN') return value;
  return 'UNKNOWN';
}

function asPromotionType(value: string | null): PromotionType | undefined {
  if (
    value === 'SALE' ||
    value === 'MEMBER_PRICE' ||
    value === 'COUPON' ||
    value === 'MULTIBUY' ||
    value === 'FREE_SHIPPING' ||
    value === 'OTHER'
  ) {
    return value;
  }
  return undefined;
}

function isMissingRelationError(error: unknown): error is PgLikeError {
  return typeof error === 'object' && error !== null && 'code' in error && (error as PgLikeError).code === '42P01';
}

function hydrateRetailOffer(row: RetailOfferRow, product: CanonicalProduct): RetailOffer {
  return {
    product_id: product.product_id,
    product_slug: row.product_slug,
    product_name: product.product_name,
    brand_name: product.brand_name,
    retailer_name: row.retailer_name,
    retailer_slug: row.retailer_slug,
    market: row.market as MarketRegion,
    currency: row.currency as CurrencyCode,
    product_url: row.product_url,
    pack_size_g: row.pack_size_g,
    base_price: numberOrZero(row.base_price),
    sale_price: numberOrUndefined(row.sale_price),
    member_price: numberOrUndefined(row.member_price),
    coupon_price: numberOrUndefined(row.coupon_price),
    conditional_best_price: numberOrUndefined(row.conditional_best_price),
    conditional_price_reason: row.conditional_price_reason ?? undefined,
    effective_price: numberOrZero(row.effective_price),
    unit_price_per_kg: numberOrZero(row.unit_price_per_kg),
    stock_status: asStockStatus(row.stock_status),
    promotion_text: row.promotion_text ?? undefined,
    promotion_type: asPromotionType(row.promotion_type),
    coupon_code: row.coupon_code ?? undefined,
    minimum_spend: numberOrUndefined(row.minimum_spend),
    shipping_threshold: numberOrUndefined(row.shipping_threshold),
    last_checked_at: isoString(row.last_checked_at),
    primary_image_url: product.primary_image_url,
    metadata: (row.metadata ?? undefined) as Record<string, unknown> | undefined,
  };
}

function totalPackSizeG(row: ManualOverrideRow): number {
  return row.total_pack_size_g ?? row.pack_size_g;
}

function hydrateManualOverride(row: ManualOverrideRow, product: CanonicalProduct): RetailOffer | null {
  if (!isSafePublicManualOverride(row)) return null;
  const effectivePrice = manualOverrideEffectivePrice(row);
  if (effectivePrice === null || effectivePrice <= 0) return null;

  const totalPackSize = totalPackSizeG(row);
  return {
    product_id: product.product_id,
    product_slug: product.slug,
    product_name: product.product_name,
    brand_name: product.brand_name,
    retailer_name: row.retailer_name,
    retailer_slug: row.retailer_slug,
    market: row.market as MarketRegion,
    currency: row.currency as CurrencyCode,
    product_url: row.source_url,
    pack_size_g: totalPackSize,
    base_price: numberOrZero(row.base_price),
    sale_price: numberOrUndefined(row.sale_price),
    member_price: undefined,
    coupon_price: undefined,
    conditional_best_price: undefined,
    conditional_price_reason: undefined,
    effective_price: effectivePrice,
    unit_price_per_kg: (effectivePrice / totalPackSize) * 1000,
    stock_status: asStockStatus(row.stock_status),
    promotion_text: undefined,
    promotion_type: numberOrUndefined(row.sale_price) !== undefined ? 'SALE' : undefined,
    coupon_code: undefined,
    minimum_spend: undefined,
    shipping_threshold: undefined,
    last_checked_at: isoString(row.updated_at ?? row.created_at),
    primary_image_url: product.primary_image_url,
    metadata: manualOverridePublicMetadata(row),
  };
}

export class DbPriceComparisonRepository implements PriceComparisonRepository {
  constructor(private readonly db: DbClient = defaultDb) {}

  private async listPublicSafeManualOverrides(
    market: MarketRegion,
    currency: CurrencyCode,
    slug?: string,
  ): Promise<ManualOverrideRow[]> {
    try {
      const query = this.db
        .select()
        .from(manualOfferOverridesTable)
        .where(
          slug
            ? and(
                eq(manualOfferOverridesTable.product_slug, slug),
                eq(manualOfferOverridesTable.market, market),
                eq(manualOfferOverridesTable.currency, currency),
              )
            : and(eq(manualOfferOverridesTable.market, market), eq(manualOfferOverridesTable.currency, currency)),
        );
      return await query;
    } catch (error) {
      if (isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }
  }

  async listCanonicalProducts(): Promise<CanonicalProduct[]> {
    return canonicalProducts;
  }

  async findCanonicalProduct(slug: string): Promise<CanonicalProduct | null> {
    return findCanonicalProductInCatalog(canonicalProducts, slug);
  }

  async listOffersForMarket(market: MarketRegion): Promise<RetailOffer[]> {
    const currency = currencyForMarket(market);
    const [rows, overrides] = await Promise.all([
      this.db
        .select()
        .from(retailOffersTable)
        .where(and(eq(retailOffersTable.market, market), eq(retailOffersTable.currency, currency))),
      this.listPublicSafeManualOverrides(market, currency),
    ]);

    const retailOffers = rows.flatMap((row) => {
      const product = findCanonicalProductInCatalog(canonicalProducts, row.product_slug);
      return product ? [hydrateRetailOffer(row, product)] : [];
    });

    const manualOffers = overrides.flatMap((row) => {
      const slug = row.product_slug?.trim();
      if (!slug) return [];
      const product = findCanonicalProductInCatalog(canonicalProducts, slug);
      const offer = product ? hydrateManualOverride(row, product) : null;
      return offer ? [offer] : [];
    });

    return [...retailOffers, ...manualOffers];
  }

  async listOffersForProduct(slug: string, market: MarketRegion): Promise<RetailOffer[]> {
    const currency = currencyForMarket(market);
    const [rows, overrides] = await Promise.all([
      this.db
        .select()
        .from(retailOffersTable)
        .where(and(eq(retailOffersTable.product_slug, slug), eq(retailOffersTable.market, market), eq(retailOffersTable.currency, currency))),
      this.listPublicSafeManualOverrides(market, currency, slug),
    ]);

    const product = findCanonicalProductInCatalog(canonicalProducts, slug);
    if (!product) return [];

    const retailOffers = rows.map((row) => hydrateRetailOffer(row, product));
    const manualOffers = overrides.flatMap((row) => {
      const offer = hydrateManualOverride(row, product);
      return offer ? [offer] : [];
    });

    return [...retailOffers, ...manualOffers];
  }
}
