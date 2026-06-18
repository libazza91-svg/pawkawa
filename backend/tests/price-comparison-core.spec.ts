import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { calculateEffectivePrice } from '../src/price-comparison/effective-price';
import { canonicalProducts } from '../src/price-comparison/fixture-data';
import { currencyForMarket, getMarketConfig, isMarketRegion } from '../src/price-comparison/markets';
import { buildCanonicalProduct, extractTokens, matchCanonicalProduct } from '../src/price-comparison/canonical-matcher';
import { getAllFixtureOffers, getPriceComparison, getProductOffers, searchCanonicalProducts } from '../src/price-comparison/service';
import { marketsRouter } from '../src/routes/markets';
import { searchRouter } from '../src/routes/search';
import { priceComparisonRouter } from '../src/routes/price-comparison';
import { productsRouter } from '../src/routes/products';
import { verifiedProductsRouter } from '../src/routes/verified-products';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/markets', marketsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/price-comparison', priceComparisonRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/verified-products', verifiedProductsRouter);
  return app;
}

const baseOffer = {
  product_id: 'test-product',
  product_slug: 'test-product',
  product_name: 'Test Cat Food',
  brand_name: 'Test Brand',
  retailer_name: 'Test Retailer',
  retailer_slug: 'test-retailer',
  market: 'AU' as const,
  currency: 'AUD' as const,
  product_url: 'https://example.com/test',
  pack_size_g: 2000,
  base_price: 40,
  stock_status: 'IN_STOCK' as const,
  last_checked_at: '2026-06-15T00:00:00.000Z',
};

describe('Price Comparison Core', () => {
  const app = createApp();

  it('defines AU and NZ market regions', () => {
    expect(isMarketRegion('AU')).toBe(true);
    expect(isMarketRegion('NZ')).toBe(true);
    expect(isMarketRegion('US')).toBe(false);
  });

  it('maps AU to AUD and NZ to NZD', () => {
    expect(currencyForMarket('AU')).toBe('AUD');
    expect(currencyForMarket('NZ')).toBe('NZD');
  });

  it('keeps AU enabled and NZ structurally supported', () => {
    expect(getMarketConfig('AU').enabled).toBe(true);
    expect(getMarketConfig('NZ').currency).toBe('NZD');
  });

  it('calculates effective price from unconditional sale price', () => {
    const offer = calculateEffectivePrice({ ...baseOffer, sale_price: 35 });
    expect(offer.effective_price).toBe(35);
    expect(offer.unit_price_per_kg).toBe(17.5);
  });

  it('does not use sale price when it is higher than base price', () => {
    const offer = calculateEffectivePrice({ ...baseOffer, sale_price: 45 });
    expect(offer.effective_price).toBe(40);
  });

  it('preserves member price as conditional by default', () => {
    const offer = calculateEffectivePrice({ ...baseOffer, member_price: 30 });
    expect(offer.effective_price).toBe(40);
    expect(offer.conditional_best_price).toBe(30);
    expect(offer.conditional_price_reason).toBe('Requires membership');
  });

  it('preserves coupon price as conditional by default', () => {
    const offer = calculateEffectivePrice({ ...baseOffer, coupon_price: 28, coupon_code: 'CAT12' });
    expect(offer.effective_price).toBe(40);
    expect(offer.conditional_best_price).toBe(28);
    expect(offer.conditional_price_reason).toBe('Requires coupon');
  });

  it('does not silently use minimum-spend coupon price as best price', () => {
    const offer = calculateEffectivePrice({ ...baseOffer, coupon_price: 25, coupon_code: 'CAT15', minimum_spend: 80 });
    expect(offer.effective_price).toBe(40);
    expect(offer.conditional_price_reason).toContain('minimum spend');
  });

  it('can use explicitly unconditional member price', () => {
    const offer = calculateEffectivePrice({ ...baseOffer, member_price: 31, member_price_unconditional: true });
    expect(offer.effective_price).toBe(31);
  });

  it('can use explicitly unconditional coupon price without minimum spend', () => {
    const offer = calculateEffectivePrice({ ...baseOffer, coupon_price: 29, coupon_unconditional: true });
    expect(offer.effective_price).toBe(29);
  });

  it('keeps all fixture offers at offer-level market and currency', async () => {
    expect((await getAllFixtureOffers()).every((offer) => offer.market && offer.currency)).toBe(true);
  });

  it('does not include NZ offers in default AU product offers', async () => {
    const result = await getProductOffers('black-hawk-indoor-chicken-rice-2000g');
    expect(result?.market).toBe('AU');
    expect(result?.offers.every((offer) => offer.market === 'AU' && offer.currency === 'AUD')).toBe(true);
  });

  it('returns NZ offers separately when NZ market is requested', async () => {
    const result = await getProductOffers('black-hawk-indoor-chicken-rice-2000g', 'NZ');
    expect(result?.market).toBe('NZ');
    expect(result?.offers.every((offer) => offer.market === 'NZ' && offer.currency === 'NZD')).toBe(true);
  });

  it('does not compare AUD and NZD in the same price comparison', async () => {
    const au = await getPriceComparison('black-hawk-indoor-chicken-rice-2000g', 'AU');
    const nz = await getPriceComparison('black-hawk-indoor-chicken-rice-2000g', 'NZ');
    expect(au?.currency).toBe('AUD');
    expect(nz?.currency).toBe('NZD');
    expect(au?.offers.some((offer) => offer.currency === 'NZD')).toBe(false);
    expect(nz?.offers.some((offer) => offer.currency === 'AUD')).toBe(false);
  });

  it('does not allow out-of-stock offers to win best price', async () => {
    const result = await getPriceComparison('royal-canin-indoor-adult-4000g', 'AU');
    const outOfStock = result?.offers.find((offer) => offer.stock_status === 'OUT_OF_STOCK');
    expect(outOfStock?.effective_price).toBeLessThan(result?.best_price_today ?? 0);
    expect(result?.best_retailer).not.toBe(outOfStock?.retailer_name);
  });

  it('allows low-stock offers to appear and stay flagged', async () => {
    const result = await getPriceComparison('black-hawk-indoor-chicken-rice-2000g', 'AU');
    expect(result?.offers.some((offer) => offer.stock_status === 'LOW_STOCK')).toBe(true);
  });

  it('preserves promotion fields', async () => {
    const result = await getProductOffers('black-hawk-indoor-chicken-rice-2000g', 'AU');
    const coupon = result?.offers.find((offer) => offer.promotion_type === 'COUPON');
    expect(coupon?.promotion_text).toContain('Coupon');
    expect(coupon?.coupon_code).toBe('CAT5');
    expect(coupon?.minimum_spend).toBe(80);
  });

  it('returns product-intent search summaries, not raw listing rows', async () => {
    const results = await searchCanonicalProducts('black hawk indoor', 'AU');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toEqual(expect.objectContaining({ best_retailer: expect.any(String), offer_count: expect.any(Number) }));
  });

  it('returns search results with price summary only for requested market', async () => {
    const results = await searchCanonicalProducts('black hawk indoor', 'NZ');
    expect(results[0].market).toBe('NZ');
    expect(results[0].currency).toBe('NZD');
    expect(results[0].best_retailer).toBe('NZ Pet Store');
  });

  it('matches Royal Canin Indoor title variants to one canonical product', () => {
    const canonical = buildCanonicalProduct({
      brand_name: 'Royal Canin',
      product_name: 'Royal Canin Indoor Adult Dry Cat Food 4kg',
      pack_size_g: 4000,
    });
    const result = matchCanonicalProduct(
      { brand_name: 'Royal Canin', product_name: 'Royal Canin Feline Indoor 4 kg', pack_size_g: 4000 },
      [canonical],
    );
    expect(result.canonical_product.slug).toBe(canonical.slug);
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.72);
    expect(result.match_reasons).toContain('Pack size matched');
  });

  it('does not collapse different pack sizes into the same canonical product', () => {
    const canonical = buildCanonicalProduct({
      brand_name: 'Royal Canin',
      product_name: 'Royal Canin Indoor Adult Dry Cat Food 4kg',
      pack_size_g: 4000,
    });
    const result = matchCanonicalProduct(
      { brand_name: 'Royal Canin', product_name: 'Royal Canin Indoor Adult Dry Cat Food 2kg', pack_size_g: 2000 },
      [canonical],
    );
    expect(result.canonical_product.slug).not.toBe(canonical.slug);
    expect(result.match_warnings).toContain('Pack size differed from nearest brand candidate');
  });

  it('does not over-match different formula tokens', () => {
    const canonical = buildCanonicalProduct({
      brand_name: 'Royal Canin',
      product_name: 'Royal Canin Indoor Adult Dry Cat Food 4kg',
      pack_size_g: 4000,
    });
    const result = matchCanonicalProduct(
      { brand_name: 'Royal Canin', product_name: 'Royal Canin Urinary Care Dry Cat Food 4kg', pack_size_g: 4000 },
      [canonical],
    );
    expect(result.canonical_product.slug).not.toBe(canonical.slug);
  });

  it('matches Royal Canin Fit to Fit canonical, not Indoor', () => {
    const result = matchCanonicalProduct(
      { brand_name: 'Royal Canin', product_name: 'Royal Canin Fit Adult Dry Cat Food', pack_size_g: 4000 },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).toBe('royal-canin-fit-adult-4000g');
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('normalizes Petbarn In & Out Fit phrase down to Fit token evidence', () => {
    expect(extractTokens('Royal Canin Feline In & Out Fit Cat Food', { stripBrand: 'Royal Canin' })).toEqual(['fit']);
  });

  it('matches Petbarn In & Out Fit title to Fit canonical at write-safe confidence', () => {
    const result = matchCanonicalProduct(
      { brand_name: 'ROYAL CANIN', product_name: 'Royal Canin Feline In & Out Fit Cat Food', pack_size_g: 4000 },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).toBe('royal-canin-fit-adult-4000g');
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches Royal Canin Light Weight to Light Weight canonical, not Fit or Indoor', () => {
    const result = matchCanonicalProduct(
      { brand_name: 'Royal Canin', product_name: 'Royal Canin Light Weight Care Adult Dry Cat Food', pack_size_g: 3000 },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).toBe('royal-canin-light-weight-care-adult-3000g');
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches Petbarn Royal Canin Indoor 2kg to the approved 2kg canonical', () => {
    const result = matchCanonicalProduct(
      { brand_name: 'ROYAL CANIN', product_name: 'Royal Canin Indoor Adult Cat Food', pack_size_g: 2000 },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).toBe('royal-canin-indoor-adult-2000g');
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches Petbarn Royal Canin Light Weight 1.5kg to the approved 1.5kg canonical', () => {
    const result = matchCanonicalProduct(
      { brand_name: 'ROYAL CANIN', product_name: 'Royal Canin Light Weight Care Adult Cat Food', pack_size_g: 1500 },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).toBe('royal-canin-light-weight-care-adult-1500g');
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches Black Hawk Original to Original canonical, not Indoor', () => {
    const result = matchCanonicalProduct(
      { brand_name: 'Black Hawk', product_name: 'Black Hawk Original Chicken Dry Cat Food', pack_size_g: 2000 },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).toBe('black-hawk-original-chicken-2000g');
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches Petbarn Black Hawk Indoor 4kg to the approved 4kg canonical', () => {
    const result = matchCanonicalProduct(
      { brand_name: 'Black Hawk', product_name: 'Black Hawk Healthy Benefits Indoor Chicken Adult Cat Food', pack_size_g: 4000 },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).toBe('black-hawk-indoor-chicken-rice-4000g');
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches Hill\'s Indoor to Indoor canonical, not Sensitive', () => {
    const result = matchCanonicalProduct(
      { brand_name: "Hill's Science Diet", product_name: "Hill's Science Diet Indoor Adult Dry Cat Food", pack_size_g: 4000 },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).toBe('hills-science-diet-indoor-adult-4000g');
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches Hill\'s Sensitive Stomach & Skin to Sensitive canonical, not Indoor', () => {
    const result = matchCanonicalProduct(
      {
        brand_name: "Hill's Science Diet",
        product_name: "Hill's Science Diet Sensitive Stomach & Skin Adult Chicken Dry Cat Food",
        pack_size_g: 3170,
      },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).toBe('hills-science-diet-sensitive-stomach-skin-adult-chicken-3170g');
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches Petbarn Hill\'s Sensitive title without flavour conflict at write-safe confidence', () => {
    const result = matchCanonicalProduct(
      {
        brand_name: "Hill's Science Diet",
        product_name: "Hill's Science Diet Sensitive Stomach & Skin Adult Cat Food",
        pack_size_g: 3170,
      },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).toBe('hills-science-diet-sensitive-stomach-skin-adult-chicken-3170g');
    expect(result.match_confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('keeps explicit flavour conflict risky for Hill\'s Sensitive titles', () => {
    const result = matchCanonicalProduct(
      {
        brand_name: "Hill's Science Diet",
        product_name: "Hill's Science Diet Sensitive Stomach & Skin Adult Salmon Cat Food",
        pack_size_g: 3170,
      },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).not.toBe('hills-science-diet-sensitive-stomach-skin-adult-chicken-3170g');
  });

  it('keeps wrong formula from matching approved canonical products', () => {
    const result = matchCanonicalProduct(
      { brand_name: 'Royal Canin', product_name: 'Royal Canin Urinary Care Dry Cat Food', pack_size_g: 4000 },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).not.toBe('royal-canin-fit-adult-4000g');
    expect(result.canonical_product.slug).not.toBe('royal-canin-indoor-adult-4000g');
  });

  it('keeps wrong pack size from matching approved canonical products', () => {
    const result = matchCanonicalProduct(
      { brand_name: 'Royal Canin', product_name: 'Royal Canin Fit Adult Dry Cat Food', pack_size_g: 3000 },
      canonicalProducts,
    );
    expect(result.canonical_product.slug).not.toBe('royal-canin-fit-adult-4000g');
    expect(result.match_warnings).toContain('Pack size differed from nearest brand candidate');
  });

  it('GET /api/markets returns market metadata and user override policy', async () => {
    const res = await request(app).get('/api/markets');
    expect(res.status).toBe(200);
    expect(res.body.data.default_market).toBe('AU');
    expect(res.body.data.selection_policy).toContain('user-selected market');
  });

  it('GET /api/search/products rejects invalid markets', async () => {
    const res = await request(app).get('/api/search/products?q=black&market=US');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_MARKET');
  });

  it('GET /api/search/products returns canonical products', async () => {
    const res = await request(app).get('/api/search/products?q=black%20hawk&market=AU');
    expect(res.status).toBe(200);
    expect(res.body.data.items[0]).toEqual(expect.objectContaining({ slug: 'black-hawk-indoor-chicken-rice-2000g', market: 'AU' }));
  });

  it('GET /api/products/:slug/offers returns offer table without breaking products router', async () => {
    const res = await request(app).get('/api/products/black-hawk-indoor-chicken-rice-2000g/offers?market=AU');
    expect(res.status).toBe(200);
    expect(res.body.data.offers.length).toBeGreaterThan(0);
  });

  it('GET /api/products/search still works after adding slug offers route', async () => {
    const res = await request(app).get('/api/products/search?q=black');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('GET /api/price-comparison/:slug returns price-first shape', async () => {
    const res = await request(app).get('/api/price-comparison/black-hawk-indoor-chicken-rice-2000g?market=AU');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        best_price_today: expect.any(Number),
        best_retailer: expect.any(String),
        lowest_unit_price_per_kg: expect.any(Number),
        offers: expect.any(Array),
      }),
    );
  });

  it('GET /api/price-comparison/:slug returns 404 for missing products', async () => {
    const res = await request(app).get('/api/price-comparison/nope?market=AU');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('existing verified-products API still responds', async () => {
    const res = await request(app).get('/api/verified-products?species=CAT');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });
});
