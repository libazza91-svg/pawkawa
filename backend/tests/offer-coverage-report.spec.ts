import { describe, expect, it } from 'vitest';
import {
  AuditRetailOfferRow,
  buildOfferCoverageAuditReport,
  classifyOfferSource,
  coverageStatusForRetailerCount,
} from '../src/price-comparison/audit';
import { canonicalProducts } from '../src/price-comparison/fixture-data';

const catalog = canonicalProducts.filter((product) => product.species === 'CAT');

function makeOffer(overrides: Partial<AuditRetailOfferRow> & Pick<AuditRetailOfferRow, 'product_slug' | 'retailer_slug' | 'retailer_name'>): AuditRetailOfferRow {
  return {
    product_slug: overrides.product_slug,
    retailer_slug: overrides.retailer_slug,
    retailer_name: overrides.retailer_name,
    market: overrides.market ?? 'AU',
    currency: overrides.currency ?? 'AUD',
    effective_price: overrides.effective_price ?? 42,
    stock_status: overrides.stock_status ?? 'IN_STOCK',
    last_checked_at:
      Object.prototype.hasOwnProperty.call(overrides, 'last_checked_at') ? overrides.last_checked_at ?? null : '2026-06-17T00:00:00.000Z',
    metadata: overrides.metadata ?? { source: 'petstock_ingestion_pilot_v1' },
  };
}

describe('offer coverage audit', () => {
  it('maps coverage status by unique retailer count', () => {
    expect(coverageStatusForRetailerCount(0)).toBe('NO_OFFERS');
    expect(coverageStatusForRetailerCount(1)).toBe('LIMITED');
    expect(coverageStatusForRetailerCount(2)).toBe('BASIC');
    expect(coverageStatusForRetailerCount(3)).toBe('GOOD');
  });

  it('classifies fixture_backfill_v1 as fixture', () => {
    expect(classifyOfferSource({ source: 'fixture_backfill_v1' })).toBe('fixture');
  });

  it('handles unknown source safely', () => {
    expect(classifyOfferSource({ source: 'mystery_loader_v9' })).toBe('unknown');
    expect(classifyOfferSource(null)).toBe('unknown');
  });

  it('reports product with no offers as NO_OFFERS', () => {
    const report = buildOfferCoverageAuditReport([], {
      catalog,
      market: 'AU',
      now: new Date('2026-06-18T00:00:00.000Z'),
    });

    const product = report.products.find((item) => item.product_slug === 'royal-canin-fit-adult-4000g');
    expect(product?.coverage_status).toBe('NO_OFFERS');
    expect(product?.warnings).toContain('NO_OFFERS');
  });

  it('reports product with 1 retailer as LIMITED', () => {
    const report = buildOfferCoverageAuditReport(
      [makeOffer({ product_slug: 'royal-canin-fit-adult-4000g', retailer_slug: 'petstock', retailer_name: 'Petstock' })],
      { catalog, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );

    const product = report.products.find((item) => item.product_slug === 'royal-canin-fit-adult-4000g');
    expect(product?.coverage_status).toBe('LIMITED');
    expect(product?.warnings).toContain('ONLY_ONE_RETAILER');
  });

  it('reports product with 2 retailers as BASIC', () => {
    const report = buildOfferCoverageAuditReport(
      [
        makeOffer({ product_slug: 'royal-canin-fit-adult-4000g', retailer_slug: 'petstock', retailer_name: 'Petstock' }),
        makeOffer({ product_slug: 'royal-canin-fit-adult-4000g', retailer_slug: 'petbarn', retailer_name: 'Petbarn' }),
      ],
      { catalog, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );

    const product = report.products.find((item) => item.product_slug === 'royal-canin-fit-adult-4000g');
    expect(product?.coverage_status).toBe('BASIC');
  });

  it('reports product with 3 retailers as GOOD', () => {
    const report = buildOfferCoverageAuditReport(
      [
        makeOffer({ product_slug: 'royal-canin-fit-adult-4000g', retailer_slug: 'petstock', retailer_name: 'Petstock' }),
        makeOffer({ product_slug: 'royal-canin-fit-adult-4000g', retailer_slug: 'petbarn', retailer_name: 'Petbarn' }),
        makeOffer({ product_slug: 'royal-canin-fit-adult-4000g', retailer_slug: 'pet-circle', retailer_name: 'Pet Circle' }),
      ],
      { catalog, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );

    const product = report.products.find((item) => item.product_slug === 'royal-canin-fit-adult-4000g');
    expect(product?.coverage_status).toBe('GOOD');
  });

  it('counts Petstock and Petbarn offers and multi-retailer products correctly', () => {
    const report = buildOfferCoverageAuditReport(
      [
        makeOffer({ product_slug: 'royal-canin-fit-adult-4000g', retailer_slug: 'petstock', retailer_name: 'Petstock' }),
        makeOffer({ product_slug: 'royal-canin-fit-adult-4000g', retailer_slug: 'petbarn', retailer_name: 'Petbarn' }),
        makeOffer({ product_slug: 'black-hawk-original-chicken-2000g', retailer_slug: 'petstock', retailer_name: 'Petstock' }),
      ],
      { catalog, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );

    expect(report.summary.petstock_offer_count).toBe(2);
    expect(report.summary.petbarn_offer_count).toBe(1);
    expect(report.summary.multi_retailer_product_count).toBe(1);
  });

  it('detects missing and stale last_checked values', () => {
    const report = buildOfferCoverageAuditReport(
      [
        makeOffer({
          product_slug: 'royal-canin-fit-adult-4000g',
          retailer_slug: 'petstock',
          retailer_name: 'Petstock',
          last_checked_at: null,
        }),
        makeOffer({
          product_slug: 'black-hawk-original-chicken-2000g',
          retailer_slug: 'petbarn',
          retailer_name: 'Petbarn',
          last_checked_at: '2026-06-01T00:00:00.000Z',
        }),
      ],
      { catalog, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );

    expect(report.summary.missing_last_checked_count).toBe(1);
    expect(report.summary.stale_offer_count).toBe(1);
    expect(report.products.find((item) => item.product_slug === 'royal-canin-fit-adult-4000g')?.warnings).toContain('MISSING_LAST_CHECKED');
    expect(report.products.find((item) => item.product_slug === 'black-hawk-original-chicken-2000g')?.warnings).toContain('STALE_PRICE');
  });

  it('excludes no-offer products from homepage candidates', () => {
    const report = buildOfferCoverageAuditReport([], {
      catalog,
      market: 'AU',
      now: new Date('2026-06-18T00:00:00.000Z'),
    });

    expect(report.summary.homepage_candidate_count).toBe(0);
  });

  it('includes valid offer-backed products as homepage candidates', () => {
    const report = buildOfferCoverageAuditReport(
      [makeOffer({ product_slug: 'royal-canin-fit-adult-4000g', retailer_slug: 'petstock', retailer_name: 'Petstock' })],
      { catalog, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );

    const product = report.products.find((item) => item.product_slug === 'royal-canin-fit-adult-4000g');
    expect(product?.homepage_candidate).toBe(true);
    expect(report.summary.homepage_candidate_count).toBe(1);
  });

  it('excludes out-of-stock-only products from homepage candidates', () => {
    const report = buildOfferCoverageAuditReport(
      [
        makeOffer({
          product_slug: 'royal-canin-fit-adult-4000g',
          retailer_slug: 'petstock',
          retailer_name: 'Petstock',
          stock_status: 'OUT_OF_STOCK',
        }),
      ],
      { catalog, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );

    const product = report.products.find((item) => item.product_slug === 'royal-canin-fit-adult-4000g');
    expect(product?.homepage_candidate).toBe(false);
    expect(product?.warnings).toContain('NO_IN_STOCK_OFFER');
  });

  it('surfaces fixture-only and unknown-source warnings separately', () => {
    const report = buildOfferCoverageAuditReport(
      [
        makeOffer({
          product_slug: 'royal-canin-fit-adult-4000g',
          retailer_slug: 'petstock',
          retailer_name: 'Petstock',
          metadata: { source: 'fixture_backfill_v1' },
        }),
        makeOffer({
          product_slug: 'black-hawk-original-chicken-2000g',
          retailer_slug: 'petbarn',
          retailer_name: 'Petbarn',
          metadata: { source: 'mystery_source' },
        }),
      ],
      { catalog, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );

    expect(report.products.find((item) => item.product_slug === 'royal-canin-fit-adult-4000g')?.warnings).toContain('FIXTURE_ONLY');
    expect(report.products.find((item) => item.product_slug === 'black-hawk-original-chicken-2000g')?.warnings).toContain('UNKNOWN_SOURCE');
    expect(report.summary.unknown_source_count).toBe(1);
  });

  it('reports mixed source products separately from fixture-only products', () => {
    const report = buildOfferCoverageAuditReport(
      [
        makeOffer({
          product_slug: 'royal-canin-fit-adult-4000g',
          retailer_slug: 'petstock',
          retailer_name: 'Petstock',
          metadata: { source: 'fixture_backfill_v1' },
        }),
        makeOffer({
          product_slug: 'royal-canin-fit-adult-4000g',
          retailer_slug: 'petbarn',
          retailer_name: 'Petbarn',
          metadata: { source: 'petbarn_ingestion_pilot_v1' },
        }),
        makeOffer({
          product_slug: 'black-hawk-original-chicken-2000g',
          retailer_slug: 'pet-circle',
          retailer_name: 'Pet Circle',
          metadata: { source: 'fixture_backfill_v1' },
        }),
      ],
      { catalog, market: 'AU', now: new Date('2026-06-18T00:00:00.000Z') },
    );

    expect(report.summary.products_with_real_ingestion_offer).toBe(1);
    expect(report.summary.products_with_fixture_only).toBe(1);
    expect(report.summary.products_with_mixed_source_types).toBe(1);
    expect(report.summary.real_ingestion_offer_count).toBe(1);
    expect(report.summary.fixture_offer_count).toBe(2);
  });
});
