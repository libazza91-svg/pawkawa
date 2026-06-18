import { CanonicalProduct, MarketRegion, RetailOffer } from './types';

export interface PriceComparisonRepository {
  listCanonicalProducts(): Promise<CanonicalProduct[]>;
  findCanonicalProduct(slug: string): Promise<CanonicalProduct | null>;
  listOffersForMarket(market: MarketRegion): Promise<RetailOffer[]>;
  listOffersForProduct(slug: string, market: MarketRegion): Promise<RetailOffer[]>;
}

export function findCanonicalProductInCatalog(catalog: CanonicalProduct[], slug: string): CanonicalProduct | null {
  return catalog.find((product) => product.slug === slug || product.product_id === slug) ?? null;
}
