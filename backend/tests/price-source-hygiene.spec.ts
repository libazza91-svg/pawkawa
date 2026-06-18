import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOfferCoverageAuditReport, classifyOfferSource } from '../src/price-comparison/audit';
import { canonicalProducts, fixtureRetailOffers } from '../src/price-comparison/fixture-data';
import { FixturePriceComparisonRepository } from '../src/price-comparison/fixture-repository';
import { FallbackPriceComparisonRepository, fixtureFallbackEnabled } from '../src/price-comparison/fallback-repository';
import { PriceComparisonRepository } from '../src/price-comparison/repository';
import { PriceComparisonService } from '../src/price-comparison/service';
import { CanonicalProduct, MarketRegion, RetailOffer } from '../src/price-comparison/types';
import { normalizePackSizeToG } from '../src/ingestion/retail/parsers/petstock-parser';
import { buildCleanupDryRunReport, CleanupRetailOfferRow } from '../src/scripts/cleanup-price-source-hygiene';
import { priceComparisonRouter } from '../src/routes/price-comparison';
import { productsRouter } from '../src/routes/products';

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

const originalFixtureFallback = process.env.PRICE_COMPARISON_FIXTURE_FALLBACK;
const originalNodeEnv = process.env.NODE_ENV;

function restoreEnv() {
  if (originalFixtureFallback === undefined) {
    delete process.env.PRICE_COMPARISON_FIXTURE_FALLBACK;
  } else {
    process.env.PRICE_COMPARISON_FIXTURE_FALLBACK = originalFixtureFallback;
  }
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
}

function realOffer(overrides: Partial<RetailOffer> = {}): RetailOffer {
  const base = fixtureRetailOffers.find((offer) => offer.product_slug === 'royal-canin-indoor-adult-4000g')!;
  return {
    ...base,
    retailer_name: 'Petstock',
    retailer_slug: 'petstock',
    effective_price: 80,
    unit_price_per_kg: 20,
    metadata: { source: 'petstock_ingestion_pilot_v1' },
    ...overrides,
  };
}

function cleanupRow(overrides: Partial<CleanupRetailOfferRow>): CleanupRetailOfferRow {
  return {
    retail_offer_id: overrides.retail_offer_id ?? 1,
    product_slug: overrides.product_slug ?? 'royal-canin-indoor-adult-4000g',
    retailer_slug: overrides.retailer_slug ?? 'petstock',
    retailer_name: overrides.retailer_name ?? 'Petstock',
    market: overrides.market ?? 'AU',
    currency: overrides.currency ?? 'AUD',
    effective_price: overrides.effective_price ?? 42,
    last_checked_at: overrides.last_checked_at ?? '2026-06-17T00:00:00.000Z',
    created_at: overrides.created_at ?? '2026-06-17T00:10:00.000Z',
    updated_at: overrides.updated_at ?? '2026-06-17T00:20:00.000Z',
    metadata: overrides.metadata ?? { source: 'petstock_ingestion_pilot_v1' },
  };
}

afterEach(() => {
  restoreEnv();
  vi.restoreAllMocks();
});

describe('price source hygiene', () => {
  it('fixture fallback is disabled by default', async () => {
    delete process.env.PRICE_COMPARISON_FIXTURE_FALLBACK;
    const fallback = new FallbackPriceComparisonRepository(
      new TestRepository(canonicalProducts, []),
      new FixturePriceComparisonRepository(),
    );
    const offers = await fallback.listOffersForProduct('royal-canin-indoor-adult-4000g', 'AU');
    expect(fixtureFallbackEnabled()).toBe(false);
    expect(offers).toEqual([]);
  });

  it('fixture fallback only enables when PRICE_COMPARISON_FIXTURE_FALLBACK=true', async () => {
    process.env.PRICE_COMPARISON_FIXTURE_FALLBACK = 'true';
    const fallback = new FallbackPriceComparisonRepository(
      new TestRepository(canonicalProducts, []),
      new FixturePriceComparisonRepository(),
    );
    const offers = await fallback.listOffersForProduct('royal-canin-indoor-adult-4000g', 'AU');
    expect(fixtureFallbackEnabled()).toBe(true);
    expect(offers.length).toBeGreaterThan(0);
  });

  it('NODE_ENV development does not implicitly enable fixture fallback', async () => {
    delete process.env.PRICE_COMPARISON_FIXTURE_FALLBACK;
    process.env.NODE_ENV = 'development';
    const fallback = new FallbackPriceComparisonRepository(
      new TestRepository(canonicalProducts, []),
      new FixturePriceComparisonRepository(),
    );
    expect(await fallback.listOffersForProduct('royal-canin-indoor-adult-4000g', 'AU')).toEqual([]);
  });

  it('warns when fixture fallback is enabled outside local or test context', async () => {
    process.env.PRICE_COMPARISON_FIXTURE_FALLBACK = 'true';
    process.env.NODE_ENV = 'staging';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fallback = new FallbackPriceComparisonRepository(new ThrowingRepository(), new FixturePriceComparisonRepository());
    await fallback.listOffersForProduct('royal-canin-indoor-adult-4000g', 'AU');
    expect(warn).toHaveBeenCalledWith('WARNING: Fixture fallback is enabled. Do not use this mode for staging/public price results.');
  });

  it('classifies source metadata for real, fixture, seed, demo, and unknown rows', () => {
    expect(classifyOfferSource({ source: 'fixture_in_memory_v1' })).toBe('fixture');
    expect(classifyOfferSource({ source: 'fixture_backfill_v1' })).toBe('fixture');
    expect(classifyOfferSource({ source: 'petstock_ingestion_pilot_v1' })).toBe('real_ingestion');
    expect(classifyOfferSource({ source: 'petbarn_ingestion_pilot_v1' })).toBe('real_ingestion');
    expect(classifyOfferSource({ source: 'seed_validation_v1' })).toBe('seed');
    expect(classifyOfferSource({ source: 'demo_loader_v1' })).toBe('demo');
    expect(classifyOfferSource({ source: 'mystery' })).toBe('unknown');
  });

  it('in-memory fixture offers classify as fixture, not unknown', () => {
    expect(fixtureRetailOffers.every((offer) => classifyOfferSource(offer.metadata) === 'fixture')).toBe(true);
  });

  it('reports orphan offers outside the canonical catalog', () => {
    const report = buildOfferCoverageAuditReport(
      [
        {
          product_slug: 'royal-canin-fit-adult-400g',
          retailer_slug: 'petstock',
          retailer_name: 'Petstock',
          market: 'AU',
          currency: 'AUD',
          effective_price: 12,
          stock_status: 'IN_STOCK',
          last_checked_at: '2026-06-17T00:00:00.000Z',
          metadata: { source: 'petstock_ingestion_pilot_v1' },
        },
      ],
      { catalog: canonicalProducts, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );
    expect(report.summary.orphan_offer_count).toBe(1);
    expect(report.summary.orphan_product_slugs).toContain('royal-canin-fit-adult-400g');
    expect(report.orphan_offers[0].source_type).toBe('real_ingestion');
  });

  it('separates real-only overlap from mixed-source overlap', () => {
    const report = buildOfferCoverageAuditReport(
      [
        {
          product_slug: 'royal-canin-indoor-adult-4000g',
          retailer_slug: 'petstock',
          retailer_name: 'Petstock',
          market: 'AU',
          currency: 'AUD',
          effective_price: 80,
          stock_status: 'IN_STOCK',
          last_checked_at: '2026-06-17T00:00:00.000Z',
          metadata: { source: 'petstock_ingestion_pilot_v1' },
        },
        {
          product_slug: 'royal-canin-indoor-adult-4000g',
          retailer_slug: 'petbarn',
          retailer_name: 'Petbarn',
          market: 'AU',
          currency: 'AUD',
          effective_price: 82,
          stock_status: 'IN_STOCK',
          last_checked_at: '2026-06-17T00:00:00.000Z',
          metadata: { source: 'petbarn_ingestion_pilot_v1' },
        },
        {
          product_slug: 'royal-canin-fit-adult-4000g',
          retailer_slug: 'petstock',
          retailer_name: 'Petstock',
          market: 'AU',
          currency: 'AUD',
          effective_price: 76,
          stock_status: 'IN_STOCK',
          last_checked_at: '2026-06-17T00:00:00.000Z',
          metadata: { source: 'petstock_ingestion_pilot_v1' },
        },
        {
          product_slug: 'royal-canin-fit-adult-4000g',
          retailer_slug: 'pet-circle',
          retailer_name: 'Pet Circle',
          market: 'AU',
          currency: 'AUD',
          effective_price: 70,
          stock_status: 'IN_STOCK',
          last_checked_at: '2026-06-17T00:00:00.000Z',
          metadata: { source: 'fixture_backfill_v1' },
        },
      ],
      { catalog: canonicalProducts, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );

    expect(report.summary.real_only_multi_retailer_product_count).toBe(1);
    expect(report.summary.mixed_source_multi_retailer_product_count).toBe(1);
    expect(report.summary.products_with_pet_circle_fixture).toContain('royal-canin-fit-adult-4000g');
  });

  it('detects products where a fixture offer is the best raw price', () => {
    const report = buildOfferCoverageAuditReport(
      [
        {
          product_slug: 'royal-canin-fit-adult-4000g',
          retailer_slug: 'petstock',
          retailer_name: 'Petstock',
          market: 'AU',
          currency: 'AUD',
          effective_price: 90,
          stock_status: 'IN_STOCK',
          last_checked_at: '2026-06-17T00:00:00.000Z',
          metadata: { source: 'petstock_ingestion_pilot_v1' },
        },
        {
          product_slug: 'royal-canin-fit-adult-4000g',
          retailer_slug: 'pet-circle',
          retailer_name: 'Pet Circle',
          market: 'AU',
          currency: 'AUD',
          effective_price: 70,
          stock_status: 'IN_STOCK',
          last_checked_at: '2026-06-17T00:00:00.000Z',
          metadata: { source: 'fixture_backfill_v1' },
        },
      ],
      { catalog: canonicalProducts, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );
    expect(report.summary.products_where_fixture_is_best_price).toContain('royal-canin-fit-adult-4000g');
  });

  it('fixture offer cannot win staging/public best price when fallback is disabled', async () => {
    delete process.env.PRICE_COMPARISON_FIXTURE_FALLBACK;
    const fixture = fixtureRetailOffers.find((offer) => offer.product_slug === 'royal-canin-indoor-adult-4000g')!;
    const service = new PriceComparisonService(new TestRepository(canonicalProducts, [realOffer(), { ...fixture, effective_price: 50 }]));
    const result = await service.getPriceComparison('royal-canin-indoor-adult-4000g', 'AU');
    expect(result?.best_retailer).toBe('Petstock');
    expect(result?.best_price_today).toBe(80);
  });

  it('Pet Circle fixture is not shown as public offer when fallback is disabled', async () => {
    delete process.env.PRICE_COMPARISON_FIXTURE_FALLBACK;
    const fixture = fixtureRetailOffers.find((offer) => offer.product_slug === 'royal-canin-indoor-adult-4000g')!;
    const service = new PriceComparisonService(new TestRepository(canonicalProducts, [realOffer(), fixture]));
    const result = await service.getProductOffers('royal-canin-indoor-adult-4000g', 'AU');
    expect(result?.offers.map((offer) => offer.retailer_slug)).toEqual(['petstock']);
  });

  it('public API shape remains stable while hiding fixture offers when fallback is disabled', async () => {
    delete process.env.PRICE_COMPARISON_FIXTURE_FALLBACK;
    const app = express();
    app.use('/api/price-comparison', priceComparisonRouter);
    app.use('/api/products', productsRouter);

    const res = await request(app).get('/api/price-comparison/royal-canin-indoor-adult-4000g?market=AU');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        product: expect.any(Object),
        market: 'AU',
        currency: 'AUD',
        best_price_today: null,
        best_retailer: null,
        lowest_unit_price_per_kg: null,
        offer_count: 0,
        offers: [],
        secondary: expect.any(Object),
      }),
    );
  });

  it('cleanup dry-run reports candidates with timestamps and does not mutate rows', () => {
    const rows = [
      cleanupRow({
        retail_offer_id: 1,
        product_slug: 'royal-canin-fit-adult-400g',
        metadata: { source: 'petstock_ingestion_pilot_v1' },
      }),
      cleanupRow({
        retail_offer_id: 2,
        retailer_slug: 'pet-circle',
        retailer_name: 'Pet Circle',
        metadata: { source: 'fixture_backfill_v1' },
      }),
    ];
    const report = buildCleanupDryRunReport(rows, [{ retail_offer_id: 2, snapshot_count: 3 }], canonicalProducts);
    expect(report.mode).toBe('dry-run');
    expect(report.rows_to_delete).toBe(1);
    expect(report.affected_snapshots).toBe(3);
    expect(report.reason_per_row[0].last_checked_at).toBe('2026-06-17T00:00:00.000Z');
    expect(report.reason_per_row[0].created_at).toBe('2026-06-17T00:10:00.000Z');
    expect(rows).toHaveLength(2);
  });

  it('cleanup execute requires explicit execute mode in the plan builder', () => {
    const report = buildCleanupDryRunReport(
      [cleanupRow({ retailer_slug: 'pet-circle', metadata: { source: 'fixture_backfill_v1' } })],
      [],
      canonicalProducts,
    );
    const executeReport = buildCleanupDryRunReport(
      [cleanupRow({ retailer_slug: 'pet-circle', metadata: { source: 'fixture_backfill_v1' } })],
      [],
      canonicalProducts,
      'execute',
    );
    expect(report.mode).toBe('dry-run');
    expect(executeReport.mode).toBe('execute');
  });

  it('does not classify NZ fixture rows as Pet Circle fixture and separates AU/NZ fixture rows', () => {
    const report = buildCleanupDryRunReport(
      [
        cleanupRow({
          retail_offer_id: 1,
          retailer_slug: 'nz-pet-store',
          retailer_name: 'NZ Pet Store',
          market: 'NZ',
          currency: 'NZD',
          metadata: { source: 'fixture_in_memory_v1' },
        }),
        cleanupRow({
          retail_offer_id: 2,
          retailer_slug: 'pet-circle',
          retailer_name: 'Pet Circle',
          market: 'AU',
          metadata: { source: 'fixture_backfill_v1' },
        }),
      ],
      [],
      canonicalProducts,
    );
    expect(report.nz_fixture_rows).toBe(1);
    expect(report.au_fixture_rows).toBe(1);
    expect(report.pet_circle_fixture_rows).toBe(1);
    expect(report.reason_per_row.find((row) => row.market === 'NZ')?.reason).toBeUndefined();
  });

  it('normalizes pack sizes for kg and g formats', () => {
    expect(normalizePackSizeToG('2kg')).toBe(2000);
    expect(normalizePackSizeToG('2 kg')).toBe(2000);
    expect(normalizePackSizeToG('2000g')).toBe(2000);
    expect(normalizePackSizeToG('2000 g')).toBe(2000);
    expect(normalizePackSizeToG('400g')).toBe(400);
    expect(normalizePackSizeToG('0.4kg')).toBe(400);
  });
});
