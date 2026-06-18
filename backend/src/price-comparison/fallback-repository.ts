import { PriceComparisonRepository } from './repository';
import { CanonicalProduct, MarketRegion, RetailOffer } from './types';

function fixtureFallbackEnabled(): boolean {
  if (process.env.PRICE_COMPARISON_FIXTURE_FALLBACK === 'true') return true;
  if (process.env.PRICE_COMPARISON_FIXTURE_FALLBACK === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export class FallbackPriceComparisonRepository implements PriceComparisonRepository {
  constructor(
    private readonly primary: PriceComparisonRepository,
    private readonly fallback: PriceComparisonRepository,
  ) {}

  async listCanonicalProducts(): Promise<CanonicalProduct[]> {
    return this.primary.listCanonicalProducts();
  }

  async findCanonicalProduct(slug: string): Promise<CanonicalProduct | null> {
    return this.primary.findCanonicalProduct(slug);
  }

  async listOffersForMarket(market: MarketRegion): Promise<RetailOffer[]> {
    return this.withFallback(
      () => this.primary.listOffersForMarket(market),
      () => this.fallback.listOffersForMarket(market),
      `market ${market}`,
    );
  }

  async listOffersForProduct(slug: string, market: MarketRegion): Promise<RetailOffer[]> {
    return this.withFallback(
      () => this.primary.listOffersForProduct(slug, market),
      () => this.fallback.listOffersForProduct(slug, market),
      `product ${slug} in ${market}`,
    );
  }

  private async withFallback(
    primaryRead: () => Promise<RetailOffer[]>,
    fallbackRead: () => Promise<RetailOffer[]>,
    label: string,
  ): Promise<RetailOffer[]> {
    try {
      const rows = await primaryRead();
      if (rows.length > 0 || !fixtureFallbackEnabled()) return rows;
      console.warn(`[price-comparison] DB returned no offers for ${label}; using fixture fallback.`);
      return fallbackRead();
    } catch (error) {
      if (!fixtureFallbackEnabled()) throw error;
      console.warn(`[price-comparison] DB read failed for ${label}; using fixture fallback.`, error);
      return fallbackRead();
    }
  }
}
