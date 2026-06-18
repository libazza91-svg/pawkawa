import { verifiedProducts } from '../verified-products/catalog';
import { isRealIngestionOffer } from './audit';
import { DbPriceComparisonRepository } from './db-repository';
import { FallbackPriceComparisonRepository, fixtureFallbackEnabled } from './fallback-repository';
import { fixturePriceComparisonRepository } from './fixture-repository';
import { DEFAULT_MARKET, currencyForMarket, marketConfigs } from './markets';
import { PriceComparisonRepository } from './repository';
import {
  CanonicalProduct,
  MarketRegion,
  PriceComparisonResponse,
  ProductOffersResponse,
  ProductSearchResult,
  RetailOffer,
} from './types';

function buyableOffers(offers: RetailOffer[]): RetailOffer[] {
  return offers.filter((offer) => offer.stock_status !== 'OUT_OF_STOCK');
}

function bestOffer(offers: RetailOffer[]): RetailOffer | null {
  return buyableOffers(offers).sort((a, b) => a.effective_price - b.effective_price)[0] ?? null;
}

function lowestUnitOffer(offers: RetailOffer[]): RetailOffer | null {
  return buyableOffers(offers).sort((a, b) => a.unit_price_per_kg - b.unit_price_per_kg)[0] ?? null;
}

function publicVisibleOffers(offers: RetailOffer[]): RetailOffer[] {
  if (fixtureFallbackEnabled()) return offers;
  return offers.filter(isRealIngestionOffer);
}

function textMatches(product: CanonicalProduct, query: string): boolean {
  const haystack = `${product.product_name} ${product.brand_name} ${product.formula_tokens.join(' ')} ${product.flavour_tokens.join(' ')}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => haystack.includes(part));
}

export class PriceComparisonService {
  constructor(private readonly repository: PriceComparisonRepository) {}

  async searchCanonicalProducts(query: string, market: MarketRegion = DEFAULT_MARKET): Promise<ProductSearchResult[]> {
    const catalog = await this.repository.listCanonicalProducts();
    const products = query.trim() ? catalog.filter((product) => textMatches(product, query)) : catalog;

    const results = await Promise.all(
      products.map(async (product) => {
        const offers = publicVisibleOffers(await this.repository.listOffersForProduct(product.slug, market));
        const best = bestOffer(offers);
        const lowestUnit = lowestUnitOffer(offers);
        return {
          product_id: product.product_id,
          slug: product.slug,
          product_name: product.product_name,
          brand_name: product.brand_name,
          primary_image_url: product.primary_image_url,
          pack_sizes: [product.pack_size_g],
          lowest_effective_price: best?.effective_price ?? null,
          lowest_unit_price_per_kg: lowestUnit?.unit_price_per_kg ?? null,
          best_retailer: best?.retailer_name ?? null,
          offer_count: offers.length,
          market,
          currency: currencyForMarket(market),
        };
      }),
    );

    return results.sort((left, right) => {
      const leftHasPrice = left.lowest_effective_price !== null ? 1 : 0;
      const rightHasPrice = right.lowest_effective_price !== null ? 1 : 0;
      if (leftHasPrice !== rightHasPrice) return rightHasPrice - leftHasPrice;
      if (left.offer_count !== right.offer_count) return right.offer_count - left.offer_count;
      if (left.lowest_effective_price !== null && right.lowest_effective_price !== null && left.lowest_effective_price !== right.lowest_effective_price) {
        return left.lowest_effective_price - right.lowest_effective_price;
      }
      return left.pack_sizes[0] - right.pack_sizes[0];
    });
  }

  async getProductOffers(slug: string, market: MarketRegion = DEFAULT_MARKET): Promise<ProductOffersResponse | null> {
    const product = await this.repository.findCanonicalProduct(slug);
    if (!product) return null;
    return {
      product,
      market,
      currency: currencyForMarket(market),
      offers: publicVisibleOffers(await this.repository.listOffersForProduct(product.slug, market)),
    };
  }

  async getPriceComparison(slug: string, market: MarketRegion = DEFAULT_MARKET): Promise<PriceComparisonResponse | null> {
    const product = await this.repository.findCanonicalProduct(slug);
    if (!product) return null;
    const offers = publicVisibleOffers(await this.repository.listOffersForProduct(product.slug, market));
    const best = bestOffer(offers);
    const lowestUnit = lowestUnitOffer(offers);
    const checkedTimes = offers.map((offer) => offer.last_checked_at).sort();
    const verifiedProduct = verifiedProducts.find((item) => item.brand === product.brand_name);

    return {
      product,
      market,
      currency: currencyForMarket(market),
      best_price_today: best?.effective_price ?? null,
      best_retailer: best?.retailer_name ?? null,
      lowest_unit_price_per_kg: lowestUnit?.unit_price_per_kg ?? null,
      offer_count: offers.length,
      last_checked_summary: checkedTimes.length > 0 ? `Latest check: ${checkedTimes[checkedTimes.length - 1]}` : 'No offers checked yet',
      offers,
      secondary: {
        nutrition: verifiedProduct?.nutrition ?? null,
        ingredients: verifiedProduct?.ingredients_normalized ?? [],
        suitability: verifiedProduct?.suitability_tags ?? [],
        evidence: [],
      },
    };
  }
}

export function createPriceComparisonService(repository?: PriceComparisonRepository): PriceComparisonService {
  if (repository) return new PriceComparisonService(repository);
  if (process.env.NODE_ENV === 'test' && process.env.PRICE_COMPARISON_DATA_SOURCE !== 'db') {
    return new PriceComparisonService(fixturePriceComparisonRepository);
  }
  return new PriceComparisonService(new FallbackPriceComparisonRepository(new DbPriceComparisonRepository(), fixturePriceComparisonRepository));
}

const defaultPriceComparisonService = createPriceComparisonService();

export function listMarkets() {
  return {
    markets: marketConfigs,
    default_market: DEFAULT_MARKET,
    selection_policy: 'IP-based market detection may suggest a default later, but user-selected market must take priority.',
  };
}

export function searchCanonicalProducts(query: string, market: MarketRegion = DEFAULT_MARKET): Promise<ProductSearchResult[]> {
  return defaultPriceComparisonService.searchCanonicalProducts(query, market);
}

export function getProductOffers(slug: string, market: MarketRegion = DEFAULT_MARKET): Promise<ProductOffersResponse | null> {
  return defaultPriceComparisonService.getProductOffers(slug, market);
}

export function getPriceComparison(slug: string, market: MarketRegion = DEFAULT_MARKET): Promise<PriceComparisonResponse | null> {
  return defaultPriceComparisonService.getPriceComparison(slug, market);
}

export async function getAllFixtureOffers(): Promise<RetailOffer[]> {
  return fixturePriceComparisonRepository.listOffersForMarket('AU').then(async (auOffers) => [
    ...auOffers,
    ...(await fixturePriceComparisonRepository.listOffersForMarket('NZ')),
  ]);
}

export { canonicalProducts } from './fixture-data';
