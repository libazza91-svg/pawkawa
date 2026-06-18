import fs from 'fs';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { backfillRetailOffers } from '../src/scripts/backfill-retail-offers';
import { fixtureRetailOffers } from '../src/price-comparison/fixture-data';
import { FixturePriceComparisonRepository } from '../src/price-comparison/fixture-repository';
import { FallbackPriceComparisonRepository } from '../src/price-comparison/fallback-repository';
import { PriceComparisonRepository } from '../src/price-comparison/repository';
import { PriceComparisonService } from '../src/price-comparison/service';
import { CanonicalProduct, MarketRegion, RetailOffer } from '../src/price-comparison/types';

type Row = Record<string, unknown>;

class InMemoryBackfillClient {
  offers = new Map<string, Row>();
  snapshots = new Map<string, Row>();
  nextOfferId = 1;

  async query(text: string, params: unknown[] = []): Promise<{ rows: Row[] }> {
    if (text.includes('INSERT INTO retail_offers')) {
      const key = [params[0], params[2], params[3], params[4], params[6]].join('|');
      const existing = this.offers.get(key);
      const retailOfferId = existing?.retail_offer_id ?? this.nextOfferId++;
      this.offers.set(key, {
        retail_offer_id: retailOfferId,
        product_slug: params[0],
        retailer_name: params[1],
        retailer_slug: params[2],
        market: params[3],
        currency: params[4],
        product_url: params[5],
        pack_size_g: params[6],
        base_price: params[7],
        sale_price: params[8],
        member_price: params[9],
        coupon_price: params[10],
        conditional_best_price: params[11],
        conditional_price_reason: params[12],
        effective_price: params[13],
        unit_price_per_kg: params[14],
        stock_status: params[15],
        promotion_text: params[16],
        promotion_type: params[17],
        coupon_code: params[18],
        minimum_spend: params[19],
        shipping_threshold: params[20],
        last_checked_at: params[21],
      });
      return { rows: [{ retail_offer_id: retailOfferId }] };
    }

    if (text.includes('INSERT INTO price_snapshots')) {
      const key = [params[0], params[17]].join('|');
      if (!this.snapshots.has(key)) {
        this.snapshots.set(key, {
          retail_offer_id: params[0],
          product_slug: params[1],
          retailer_slug: params[2],
          market: params[3],
          currency: params[4],
          base_price: params[5],
          source_url: params[16],
          captured_at: params[17],
        });
      }
      return { rows: [] };
    }

    return { rows: [] };
  }
}

class TestRepository implements PriceComparisonRepository {
  constructor(
    private readonly catalog: CanonicalProduct[],
    private readonly offers: RetailOffer[],
  ) {}

  async listCanonicalProducts(): Promise<CanonicalProduct[]> {
    return this.catalog;
  }

  async findCanonicalProduct(slug: string): Promise<CanonicalProduct | null> {
    return this.catalog.find((product) => product.slug === slug) ?? null;
  }

  async listOffersForMarket(market: MarketRegion): Promise<RetailOffer[]> {
    const currency = market === 'AU' ? 'AUD' : 'NZD';
    return this.offers.filter((offer) => offer.market === market && offer.currency === currency);
  }

  async listOffersForProduct(slug: string, market: MarketRegion): Promise<RetailOffer[]> {
    const offers = await this.listOffersForMarket(market);
    return offers.filter((offer) => offer.product_slug === slug);
  }
}

class ThrowingRepository extends FixturePriceComparisonRepository {
  async listOffersForProduct(): Promise<RetailOffer[]> {
    throw new Error('db down');
  }

  async listOffersForMarket(): Promise<RetailOffer[]> {
    throw new Error('db down');
  }
}

describe('DB-backed retail offer stabilization', () => {
  it('declares a unique index for current retail offers', () => {
    const migration = fs.readFileSync(path.resolve(__dirname, '../src/db/migrations/005_add_price_comparison_core.sql'), 'utf8');
    expect(migration).toContain('idx_retail_offers_unique_current_offer');
    expect(migration).toContain('(product_slug, retailer_slug, market, currency, pack_size_g)');
  });

  it('declares a unique index for backfill snapshot points', () => {
    const migration = fs.readFileSync(path.resolve(__dirname, '../src/db/migrations/005_add_price_comparison_core.sql'), 'utf8');
    expect(migration).toContain('idx_price_snapshots_unique_offer_time');
    expect(migration).toContain('(retail_offer_id, captured_at)');
  });

  it('backfills one current retail offer per product retailer market currency and pack size', async () => {
    const client = new InMemoryBackfillClient();
    await backfillRetailOffers(client);
    expect(client.offers.size).toBe(fixtureRetailOffers.length);
  });

  it('does not duplicate retail offers when backfill runs twice', async () => {
    const client = new InMemoryBackfillClient();
    await backfillRetailOffers(client);
    await backfillRetailOffers(client);
    expect(client.offers.size).toBe(fixtureRetailOffers.length);
  });

  it('does not duplicate snapshots for the same retail offer and captured_at', async () => {
    const client = new InMemoryBackfillClient();
    await backfillRetailOffers(client);
    await backfillRetailOffers(client);
    expect(client.snapshots.size).toBe(fixtureRetailOffers.length);
  });

  it('keeps different pack sizes as separate current offers', async () => {
    const client = new InMemoryBackfillClient();
    const base = fixtureRetailOffers[0];
    await backfillRetailOffers(client, [base, { ...base, pack_size_g: 4000, unit_price_per_kg: base.effective_price / 4 }]);
    expect(client.offers.size).toBe(2);
  });

  it('keeps AU and NZ offers separate in current offer identity', async () => {
    const client = new InMemoryBackfillClient();
    const base = fixtureRetailOffers[0];
    await backfillRetailOffers(client, [base, { ...base, market: 'NZ', currency: 'NZD' }]);
    expect(client.offers.size).toBe(2);
  });

  it('updates current offer state instead of creating a second active offer', async () => {
    const client = new InMemoryBackfillClient();
    const base = fixtureRetailOffers[0];
    await backfillRetailOffers(client, [base]);
    await backfillRetailOffers(client, [{ ...base, base_price: 30, effective_price: 30, unit_price_per_kg: 15 }]);
    expect(client.offers.size).toBe(1);
    expect([...client.offers.values()][0].base_price).toBe(30);
  });

  it('DB-style service response preserves price comparison shape', async () => {
    const fixtureRepo = new FixturePriceComparisonRepository();
    const catalog = await fixtureRepo.listCanonicalProducts();
    const offers = await fixtureRepo.listOffersForMarket('AU');
    const service = new PriceComparisonService(new TestRepository(catalog, offers));
    const result = await service.getPriceComparison('black-hawk-indoor-chicken-rice-2000g', 'AU');

    expect(result).toEqual(
      expect.objectContaining({
        product: expect.any(Object),
        market: 'AU',
        currency: 'AUD',
        best_price_today: expect.any(Number),
        best_retailer: expect.any(String),
        lowest_unit_price_per_kg: expect.any(Number),
        offer_count: expect.any(Number),
        last_checked_summary: expect.any(String),
        offers: expect.any(Array),
        secondary: expect.any(Object),
      }),
    );
  });

  it('service search response preserves product-price card shape', async () => {
    const fixtureRepo = new FixturePriceComparisonRepository();
    const catalog = await fixtureRepo.listCanonicalProducts();
    const offers = await fixtureRepo.listOffersForMarket('AU');
    const service = new PriceComparisonService(new TestRepository(catalog, offers));
    const results = await service.searchCanonicalProducts('royal canin indoor', 'AU');

    expect(results[0]).toEqual(
      expect.objectContaining({
        slug: 'royal-canin-indoor-adult-4000g',
        lowest_effective_price: expect.any(Number),
        lowest_unit_price_per_kg: expect.any(Number),
        best_retailer: expect.any(String),
        offer_count: expect.any(Number),
        market: 'AU',
        currency: 'AUD',
      }),
    );
  });

  it('repository-level market filtering prevents AU from receiving NZ offers', async () => {
    const fixtureRepo = new FixturePriceComparisonRepository();
    const catalog = await fixtureRepo.listCanonicalProducts();
    const mixedOffers = await Promise.all([fixtureRepo.listOffersForMarket('AU'), fixtureRepo.listOffersForMarket('NZ')]).then(([au, nz]) => [...au, ...nz]);
    const repo = new TestRepository(catalog, mixedOffers);
    const offers = await repo.listOffersForProduct('black-hawk-indoor-chicken-rice-2000g', 'AU');
    expect(offers.every((offer) => offer.market === 'AU' && offer.currency === 'AUD')).toBe(true);
  });

  it('out-of-stock DB-backed offers cannot win best price', async () => {
    const fixtureRepo = new FixturePriceComparisonRepository();
    const catalog = await fixtureRepo.listCanonicalProducts();
    const offers = await fixtureRepo.listOffersForMarket('AU');
    const service = new PriceComparisonService(new TestRepository(catalog, offers));
    const result = await service.getPriceComparison('royal-canin-indoor-adult-4000g', 'AU');
    expect(result?.best_retailer).toBe('Pet Circle');
  });

  it('member and coupon prices stay conditional in DB-backed responses', async () => {
    const fixtureRepo = new FixturePriceComparisonRepository();
    const catalog = await fixtureRepo.listCanonicalProducts();
    const offers = await fixtureRepo.listOffersForMarket('AU');
    const service = new PriceComparisonService(new TestRepository(catalog, offers));
    const result = await service.getPriceComparison('black-hawk-indoor-chicken-rice-2000g', 'AU');
    const conditionalOffers = result?.offers.filter((offer) => offer.conditional_best_price);
    expect(conditionalOffers?.some((offer) => offer.conditional_price_reason?.includes('Requires'))).toBe(true);
  });

  it('fixture fallback can fill empty DB-backed reads explicitly', async () => {
    const fixtureRepo = new FixturePriceComparisonRepository();
    const emptyRepo = new TestRepository(await fixtureRepo.listCanonicalProducts(), []);
    const fallback = new FallbackPriceComparisonRepository(emptyRepo, fixtureRepo);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const offers = await fallback.listOffersForProduct('black-hawk-indoor-chicken-rice-2000g', 'AU');
    expect(offers.length).toBeGreaterThan(0);
    warn.mockRestore();
  });

  it('fixture fallback logs DB failures instead of hiding them silently', async () => {
    const fixtureRepo = new FixturePriceComparisonRepository();
    const fallback = new FallbackPriceComparisonRepository(new ThrowingRepository(), fixtureRepo);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const offers = await fallback.listOffersForProduct('black-hawk-indoor-chicken-rice-2000g', 'AU');
    expect(offers.length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
