import { PriceComparisonRepository } from './repository';
import { CanonicalProduct, MarketRegion, RetailOffer } from './types';

let warnedAboutFixtureFallback = false;

export function fixtureFallbackEnabled(): boolean {
  return process.env.PRICE_COMPARISON_FIXTURE_FALLBACK === 'true';
}

function warnIfUnsafeFixtureFallbackEnabled(): void {
  if (!fixtureFallbackEnabled() || warnedAboutFixtureFallback) return;
  const nodeEnv = process.env.NODE_ENV;
  const isSafeLocalContext = nodeEnv === 'test' || nodeEnv === 'development' || !nodeEnv;
  if (!isSafeLocalContext) {
    console.warn('WARNING: Fixture fallback is enabled. Do not use this mode for staging/public price results.');
    warnedAboutFixtureFallback = true;
  }
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
    warnIfUnsafeFixtureFallbackEnabled();
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
