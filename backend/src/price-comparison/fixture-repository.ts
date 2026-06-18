import { currencyForMarket } from './markets';
import { canonicalProducts, fixtureRetailOffers } from './fixture-data';
import { findCanonicalProductInCatalog, PriceComparisonRepository } from './repository';
import { CanonicalProduct, MarketRegion, RetailOffer } from './types';

export class FixturePriceComparisonRepository implements PriceComparisonRepository {
  async listCanonicalProducts(): Promise<CanonicalProduct[]> {
    return canonicalProducts;
  }

  async findCanonicalProduct(slug: string): Promise<CanonicalProduct | null> {
    return findCanonicalProductInCatalog(canonicalProducts, slug);
  }

  async listOffersForMarket(market: MarketRegion): Promise<RetailOffer[]> {
    const currency = currencyForMarket(market);
    return fixtureRetailOffers.filter((offer) => offer.market === market && offer.currency === currency);
  }

  async listOffersForProduct(slug: string, market: MarketRegion): Promise<RetailOffer[]> {
    const offers = await this.listOffersForMarket(market);
    return offers.filter((offer) => offer.product_slug === slug);
  }
}

export const fixturePriceComparisonRepository = new FixturePriceComparisonRepository();
