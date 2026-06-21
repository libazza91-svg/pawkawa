import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import app from '../src/index';
import { loadPetbarnManifest, loadPetstockManifest } from '../src/ingestion/retail/manifest';
import { detectOfferType, parseOfferShape } from '../src/ingestion/retail/parsers/offer-shape';
import { parsePetbarnProductPage } from '../src/ingestion/retail/parsers/petbarn-parser';
import { normalizePackSizeToG, parseMoney, parsePetstockProductPage } from '../src/ingestion/retail/parsers/petstock-parser';
import { collectDbCoverage, parsePetstockPilotCliArgs, runPetstockPilot } from '../src/ingestion/retail/petstock-pilot';
import { runPetbarnPilot } from '../src/ingestion/retail/petbarn-pilot';
import { isAllowedByRobots } from '../src/ingestion/retail/robots';
import { writeMatchedRetailOffer } from '../src/ingestion/retail/retail-offer-writer';
import { FetchResult, ParsedRetailOffer, PetbarnPilotManifestItem, PetstockPilotManifestItem, RetailIngestionReport } from '../src/ingestion/retail/types';
import { RetailOffer } from '../src/price-comparison/types';

class InMemoryOfferClient {
  offers = new Map<string, Record<string, unknown>>();
  snapshots = new Map<string, Record<string, unknown>>();
  nextOfferId = 1;

  async query(text: string, params: unknown[] = []) {
    if (text.includes('INSERT INTO retail_offers')) {
      const key = [params[0], params[2], params[3], params[4], params[6]].join('|');
      const retailOfferId = Number(this.offers.get(key)?.retail_offer_id ?? this.nextOfferId++);
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
        last_checked_at: params[21],
        metadata: params[22],
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
          captured_at: params[17],
          metadata: params[18],
        });
      }
      return { rows: [] };
    }

    if (text.includes('SELECT COUNT(*)::int AS count FROM retail_offers')) {
      return { rows: [{ count: this.offers.size }] };
    }

    if (text.includes('SELECT COUNT(*)::int AS count FROM price_snapshots')) {
      return { rows: [{ count: this.snapshots.size }] };
    }

    if (text.includes("WHERE retailer_slug = 'petstock' AND market = 'AU' AND currency = 'AUD'")) {
      const petstockOffers = [...this.offers.values()].filter(
        (offer) => offer.retailer_slug === 'petstock' && offer.market === 'AU' && offer.currency === 'AUD',
      );
      if (text.includes('COUNT(DISTINCT product_slug)::int')) {
        return { rows: [{ count: new Set(petstockOffers.map((offer) => offer.product_slug)).size }] };
      }
      return { rows: [{ count: petstockOffers.length }] };
    }

    if (text.includes("WHERE retailer_slug = 'petbarn' AND market = 'AU' AND currency = 'AUD'")) {
      const petbarnOffers = [...this.offers.values()].filter(
        (offer) => offer.retailer_slug === 'petbarn' && offer.market === 'AU' && offer.currency === 'AUD',
      );
      if (text.includes('COUNT(DISTINCT product_slug)::int')) {
        return { rows: [{ count: new Set(petbarnOffers.map((offer) => offer.product_slug)).size }] };
      }
      return { rows: [{ count: petbarnOffers.length }] };
    }

    return { rows: [] };
  }
}

const petstockHtml = `
<html>
<head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Royal Canin Indoor Adult Dry Cat Food","brand":{"@type":"Brand","name":"Royal Canin"},"image":["https://cdn.example/royal.jpg"],"offers":[{"@type":"Offer","price":"74.99","priceCurrency":"AUD","availability":"https://schema.org/InStock"}]}</script>
</head>
<body>
<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"product":{"title":"Royal Canin Indoor Adult Dry Cat Food","vendor":"Royal Canin","images":["https://cdn.example/royal.jpg"],"sellingPlans":[{"adjustmentPercentage":10}],"variants":[{"price":"74.99","quantityAvailable":12,"inStockInNetwork":true,"selectedOptions":[{"name":"Size","value":"4kg"}],"images":["https://cdn.example/royal-4kg.jpg"]},{"price":"42.50","quantityAvailable":0,"inStockInNetwork":false,"selectedOptions":[{"name":"Size","value":"2kg"}],"images":["https://cdn.example/royal-2kg.jpg"]}]}}}}</script>
</body>
</html>`;

const htmlFallback = `
<html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Royal Canin Indoor Adult Dry Cat Food 4kg","brand":{"name":"Royal Canin"},"image":"https://cdn.example/fallback.jpg","offers":{"@type":"Offer","price":"74.99","priceCurrency":"AUD","availability":"https://schema.org/InStock","url":"https://www.petstock.com.au/products/royal-canin-indoor-adult-dry-cat-food-4kg"}}</script>
</head></html>`;

const petbarnHtml = `
<html>
<head>
<title>Royal Canin Feline Indoor Cat Food | Petbarn</title>
<link rel="preload" as="image" href="https://cdn.example/petbarn-royal-4kg.jpg" />
<script type="application/ld+json">{"@context":"https://schema.org","@type":"ProductGroup","name":"Royal Canin Indoor Adult Cat Food","url":"https://www.petbarn.com.au/p/royal-canin-feline-indoor-cat-food","hasVariant":[{"@type":"Product","sku":"29357","name":"Royal Canin Indoor Adult Cat Food 2kg","url":"https://www.petbarn.com.au/p/royal-canin-feline-indoor-cat-food/29357","image":"https://cdn.example/petbarn-royal-2kg.jpg","brand":{"@type":"Brand","name":"ROYAL CANIN"},"size":"2kg","offers":{"@type":"Offer","url":"https://www.petbarn.com.au/p/royal-canin-feline-indoor-cat-food/29357","priceCurrency":"AUD","price":"63.99","availability":"https://schema.org/InStock","priceSpecification":[{"@type":"UnitPriceSpecification","priceCurrency":"AUD","price":"63.99"},{"@type":"UnitPriceSpecification","priceCurrency":"AUD","price":"51","validForMemberTier":{"@type":"MemberProgramTier","@id":"https://www.petbarn.com.au/w/loyalty-program"}}]}},{"@type":"Product","sku":"30295","name":"Royal Canin Indoor Adult Cat Food 4kg","url":"https://www.petbarn.com.au/p/royal-canin-feline-indoor-cat-food/30295","image":"https://cdn.example/petbarn-royal-4kg.jpg","brand":{"@type":"Brand","name":"ROYAL CANIN"},"size":"4kg","offers":{"@type":"Offer","url":"https://www.petbarn.com.au/p/royal-canin-feline-indoor-cat-food/30295","priceCurrency":"AUD","price":"97.99","availability":"https://schema.org/InStock","priceSpecification":[{"@type":"UnitPriceSpecification","priceCurrency":"AUD","price":"97.99"},{"@type":"UnitPriceSpecification","priceCurrency":"AUD","price":"59","validForMemberTier":{"@type":"MemberProgramTier","@id":"https://www.petbarn.com.au/w/loyalty-program"}}]}}]}</script>
</head>
<body></body>
</html>`;

const petbarnHtmlFallback = `
<html>
<head>
  <title>Royal Canin Feline Indoor Cat Food 4kg | Petbarn</title>
  <link rel="preload" as="image" href="https://cdn.example/petbarn-fallback.jpg" />
</head>
<body>
  <div class="ProductPrice_priceBlock__iEsHA ProductPrice_regularPrice__Q7Xtb">
    <span class="ProductPrice_priceLineTitle__vFNSG">Regular Price </span>
    <span class="ProductPrice_price__YwAvg">$97.99</span>
  </div>
  <button data-productname="Royal Canin Indoor Adult Cat Food 4kg" data-productbrand="ROYAL CANIN" type="submit">
    <span>Add to cart</span>
  </button>
</body>
</html>`;

const petbarnBundleHtml = `
<html>
<head>
<title>Royal Canin Indoor Adult Cat Food Bundle 2kg x 2 | Petbarn</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"ProductGroup","name":"Royal Canin Indoor Adult Cat Food Bundle","url":"https://www.petbarn.com.au/p/bundle-544","hasVariant":[{"@type":"Product","sku":"bundle-544","name":"Royal Canin Indoor Adult Cat Food 2kg x 2","url":"https://www.petbarn.com.au/p/bundle-544","image":"https://cdn.example/petbarn-bundle.jpg","brand":{"@type":"Brand","name":"ROYAL CANIN"},"size":"2kg x 2","offers":{"@type":"Offer","url":"https://www.petbarn.com.au/p/bundle-544","priceCurrency":"AUD","price":"97.99","availability":"https://schema.org/InStock","priceSpecification":[{"@type":"UnitPriceSpecification","priceCurrency":"AUD","price":"48.45","referenceQuantity":"PER BAG"},{"@type":"UnitPriceSpecification","priceCurrency":"AUD","price":"96.90","validForMemberTier":{"@type":"MemberProgramTier","@id":"https://www.petbarn.com.au/w/loyalty-program"}}]}}]}</script>
</head>
<body>Repeat Delivery available. $48.45 PER BAG</body>
</html>`;

const manifestItem: PetstockPilotManifestItem = {
  retailer: 'petstock',
  market: 'AU',
  currency: 'AUD',
  product_url: 'https://www.petstock.com.au/products/royal-canin-indoor-adult-dry-cat-food',
  expected_brand: 'Royal Canin',
  expected_pack_size_g: 4000,
  expected_canonical_slug: 'royal-canin-indoor-adult-4000g',
};

const petbarnManifestItem: PetbarnPilotManifestItem = {
  retailer: 'petbarn',
  market: 'AU',
  currency: 'AUD',
  product_url: 'https://www.petbarn.com.au/p/royal-canin-feline-indoor-cat-food',
  expected_brand: 'ROYAL CANIN',
  expected_pack_size_g: 4000,
  expected_canonical_slug: 'royal-canin-indoor-adult-4000g',
};

const tempDirs: string[] = [];

async function withFixtureFallback<T>(fn: () => Promise<T>): Promise<T> {
  const original = process.env.PRICE_COMPARISON_FIXTURE_FALLBACK;
  process.env.PRICE_COMPARISON_FIXTURE_FALLBACK = 'true';
  try {
    return await fn();
  } finally {
    if (original === undefined) {
      delete process.env.PRICE_COMPARISON_FIXTURE_FALLBACK;
    } else {
      process.env.PRICE_COMPARISON_FIXTURE_FALLBACK = original;
    }
  }
}

function makeParsedOffer(overrides: Partial<ParsedRetailOffer> = {}): ParsedRetailOffer {
  return {
    retailer_name: 'Petstock',
    retailer_slug: 'petstock',
    product_url: 'https://www.petstock.com.au/products/example',
    retailer_product_title: 'Example Cat Food',
    brand_name: 'Royal Canin',
    product_name: 'Royal Canin Indoor Adult Dry Cat Food',
    pack_size_g: 4000,
    base_price: 63,
    promotion_text: '10% subscription discount available',
    promotion_type: 'OTHER',
    stock_status: 'IN_STOCK',
    image_url: 'https://cdn.example/test.jpg',
    captured_at: '2026-06-15T00:00:00.000Z',
    market: 'AU',
    currency: 'AUD',
    ...overrides,
  };
}

function makePetbarnParsedOffer(overrides: Partial<ParsedRetailOffer> = {}): ParsedRetailOffer {
  return {
    retailer_name: 'Petbarn',
    retailer_slug: 'petbarn',
    product_url: 'https://www.petbarn.com.au/p/example',
    retailer_product_title: 'Royal Canin Indoor Adult Cat Food 4kg',
    brand_name: 'ROYAL CANIN',
    product_name: 'Royal Canin Indoor Adult Cat Food',
    pack_size_g: 4000,
    base_price: 97.99,
    member_price: 59,
    promotion_text: 'Member price available',
    promotion_type: 'MEMBER_PRICE',
    stock_status: 'IN_STOCK',
    image_url: 'https://cdn.example/petbarn-test.jpg',
    captured_at: '2026-06-16T00:00:00.000Z',
    market: 'AU',
    currency: 'AUD',
    ...overrides,
  };
}

function buildFetchResult(url = manifestItem.product_url, body = petstockHtml): FetchResult {
  return {
    status: 200,
    url,
    body,
    contentType: 'text/html',
  };
}

function makeDeps(overrides: Partial<{
  checkRobotsAllowed: (url: string, userAgent: string) => Promise<{ allowed: boolean; reason: string; robotsUrl: string }>;
  fetchWithTimeout: (url: string) => Promise<FetchResult>;
  parsePetstockProductPage: (html: string, productUrl: string, capturedAt?: string) => ParsedRetailOffer[];
  writeMatchedRetailOffer: (
    parsed: ParsedRetailOffer,
    client?: InMemoryOfferClient,
    minimumWriteConfidence?: number,
  ) => Promise<RetailIngestionReport>;
  delay: (ms: number) => Promise<void>;
  loadPetstockManifest: (manifestPath?: string) => Promise<PetstockPilotManifestItem[]>;
}> = {}) {
  return {
    checkRobotsAllowed: async () => ({ allowed: true, reason: 'allowed', robotsUrl: 'https://www.petstock.com.au/robots.txt' }),
    fetchWithTimeout: async () => buildFetchResult(),
    parsePetstockProductPage,
    writeMatchedRetailOffer: (parsed: ParsedRetailOffer, client?: InMemoryOfferClient, minimumWriteConfidence?: number) =>
      writeMatchedRetailOffer(parsed, client as any, minimumWriteConfidence),
    delay: async () => undefined,
    loadPetstockManifest: async () => [manifestItem],
    ...overrides,
  };
}

async function writeTempManifest(value: unknown): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'petstock-manifest-'));
  tempDirs.push(tempDir);
  const manifestPath = path.join(tempDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(value, null, 2), 'utf8');
  return manifestPath;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    await import('node:fs/promises').then(({ rm }) => rm(dir, { recursive: true, force: true }));
  }
});

describe('Retailer ingestion pilot', () => {
  it('robots disallow prevents product fetch', () => {
    const result = isAllowedByRobots('User-agent: *\nDisallow: /products/', 'https://www.petstock.com.au/products/test', 'PawkawaBot/0.1');
    expect(result.allowed).toBe(false);
  });

  it('robots allow permits product URL when not disallowed', () => {
    const result = isAllowedByRobots('User-agent: *\nDisallow: /search', 'https://www.petstock.com.au/products/test', 'PawkawaBot/0.1');
    expect(result.allowed).toBe(true);
  });

  it('normalizes kilogram pack sizes', () => {
    expect(normalizePackSizeToG('4kg')).toBe(4000);
  });

  it('normalizes gram pack sizes', () => {
    expect(normalizePackSizeToG('400g')).toBe(400);
  });

  it('normalizes numeric dimension weights as kilograms', () => {
    expect(normalizePackSizeToG(2.035)).toBe(2035);
  });

  it('parses multipack offer shape when pack size is written as 2kg x 2', () => {
    expect(parseOfferShape('2kg x 2')).toEqual(
      expect.objectContaining({
        pack_size_g: 4000,
        single_pack_size_g: 2000,
        unit_count: 2,
        total_pack_size_g: 4000,
        offer_type: 'multi_pack',
      }),
    );
  });

  it('parses multipack offer shape when pack size is written as 2 x 2kg', () => {
    expect(parseOfferShape('2 x 2kg')).toEqual(
      expect.objectContaining({
        pack_size_g: 4000,
        single_pack_size_g: 2000,
        unit_count: 2,
        total_pack_size_g: 4000,
        offer_type: 'multi_pack',
      }),
    );
  });

  it('parses carton offer shape when pack size is written as 400g x 12', () => {
    expect(parseOfferShape('400g x 12')).toEqual(
      expect.objectContaining({
        pack_size_g: 4800,
        single_pack_size_g: 400,
        unit_count: 12,
        total_pack_size_g: 4800,
        offer_type: 'multi_pack',
      }),
    );
  });

  it('detects bundle offer type from bundle URL', () => {
    expect(
      detectOfferType({
        productUrl: 'https://www.petbarn.com.au/p/bundle-544',
        title: 'Royal Canin Indoor Adult Cat Food 2kg x 2',
      }),
    ).toBe('bundle');
  });

  it('parses base price strings', () => {
    expect(parseMoney('AUD $74.99')).toBe(74.99);
  });

  it('parses JSON-LD and Next data offers', () => {
    const offers = parsePetstockProductPage(petstockHtml, manifestItem.product_url, '2026-06-15T00:00:00.000Z');
    expect(offers).toHaveLength(2);
  });

  it('extracts product title and brand', () => {
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    expect(offer.product_name).toBe('Royal Canin Indoor Adult Dry Cat Food');
    expect(offer.brand_name).toBe('Royal Canin');
  });

  it('extracts image URL', () => {
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    expect(offer.image_url).toBe('https://cdn.example/royal-4kg.jpg');
  });

  it('parses stock status from Next data', () => {
    const offers = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    expect(offers[0].stock_status).toBe('IN_STOCK');
    expect(offers[1].stock_status).toBe('OUT_OF_STOCK');
  });

  it('preserves promotion text from selling plans', () => {
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    expect(offer.promotion_text).toContain('subscription discount');
  });

  it('captures repeat-delivery as a conditional flag without changing effective price', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    await writeMatchedRetailOffer(offer, client as any);
    const metadata = JSON.parse(String([...client.offers.values()][0].metadata));
    expect(metadata.conditional_flags).toContain('repeat_delivery');
    const written = [...client.offers.values()][0] as RetailOffer;
    expect(written.effective_price).toBe(74.99);
  });

  it('falls back to JSON-LD when app state is missing', () => {
    const offers = parsePetstockProductPage(htmlFallback, manifestItem.product_url);
    expect(offers[0].base_price).toBe(74.99);
  });

  it('writes a high-confidence canonical match', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    const report = await writeMatchedRetailOffer(offer, client as any);
    expect(report.status).toBe('INGESTED');
    expect(report.canonical_match?.canonical_product.slug).toBe('royal-canin-indoor-adult-4000g');
  });

  it('returns canonical missing without writing when no canonical exists', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    const report = await writeMatchedRetailOffer(
      {
        ...offer,
        product_name: 'Totally Different Salmon Kitten Food',
        brand_name: 'Other Brand',
      },
      client as any,
    );
    expect(report.status).toBe('CANONICAL_MISSING');
    expect(client.offers.size).toBe(0);
  });

  it('writes Royal Canin Fit to the approved Fit canonical only', async () => {
    const client = new InMemoryOfferClient();
    const report = await writeMatchedRetailOffer(
      makeParsedOffer({
        retailer_product_title: 'Royal Canin Fit Adult Dry Cat Food',
        product_name: 'Royal Canin Fit Adult Dry Cat Food',
      }),
      client as any,
    );
    expect(report.status).toBe('INGESTED');
    expect(report.canonical_slug).toBe('royal-canin-fit-adult-4000g');
  });

  it('writes Royal Canin Light Weight to the approved Light Weight canonical only', async () => {
    const client = new InMemoryOfferClient();
    const report = await writeMatchedRetailOffer(
      makeParsedOffer({
        product_url: 'https://www.petstock.com.au/products/royal-canin-light-weight-care-adult-dry-cat-food',
        retailer_product_title: 'Royal Canin Light Weight Care Adult Dry Cat Food',
        product_name: 'Royal Canin Light Weight Care Adult Dry Cat Food',
        pack_size_g: 3000,
        base_price: 65,
      }),
      client as any,
    );
    expect(report.status).toBe('INGESTED');
    expect(report.canonical_slug).toBe('royal-canin-light-weight-care-adult-3000g');
  });

  it('writes Black Hawk Original to the approved Original canonical only', async () => {
    const client = new InMemoryOfferClient();
    const report = await writeMatchedRetailOffer(
      makeParsedOffer({
        product_url: 'https://www.petstock.com.au/products/black-hawk-original-chicken-cat-food',
        retailer_product_title: 'Black Hawk Original Chicken Dry Cat Food',
        brand_name: 'Black Hawk',
        product_name: 'Black Hawk Original Chicken Dry Cat Food',
        pack_size_g: 2000,
        base_price: 42.98,
      }),
      client as any,
    );
    expect(report.status).toBe('INGESTED');
    expect(report.canonical_slug).toBe('black-hawk-original-chicken-2000g');
  });

  it('writes Hill\'s Indoor and Hill\'s Sensitive to their own approved canonicals', async () => {
    const client = new InMemoryOfferClient();
    const indoor = await writeMatchedRetailOffer(
      makeParsedOffer({
        product_url: 'https://www.petstock.com.au/products/hills-science-diet-indoor-adult-dry-cat-food',
        retailer_product_title: "Hill's Science Diet Indoor Adult Dry Cat Food",
        brand_name: "Hill's Science Diet",
        product_name: "Hill's Science Diet Indoor Adult Dry Cat Food",
        pack_size_g: 4000,
        base_price: 72,
      }),
      client as any,
    );
    const sensitive = await writeMatchedRetailOffer(
      makeParsedOffer({
        product_url: 'https://www.petstock.com.au/products/hills-science-diet-sensitive-stomach-skin-adult-chicken-dry-cat-food',
        retailer_product_title: "Hill's Science Diet Sensitive Stomach & Skin Adult Chicken Dry Cat Food",
        brand_name: "Hill's Science Diet",
        product_name: "Hill's Science Diet Sensitive Stomach & Skin Adult Chicken Dry Cat Food",
        pack_size_g: 3170,
        base_price: 69,
      }),
      client as any,
    );
    expect(indoor.status).toBe('INGESTED');
    expect(indoor.canonical_slug).toBe('hills-science-diet-indoor-adult-4000g');
    expect(sensitive.status).toBe('INGESTED');
    expect(sensitive.canonical_slug).toBe('hills-science-diet-sensitive-stomach-skin-adult-chicken-3170g');
  });

  it('does not merge different pack sizes incorrectly', async () => {
    const client = new InMemoryOfferClient();
    const offers = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    const report = await writeMatchedRetailOffer({ ...offers[1], pack_size_g: 3000 }, client as any);
    expect(report.status).toBe('PACK_SIZE_CONFLICT');
  });

  it('upserts retail offers', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url, '2026-06-15T00:00:00.000Z');
    await writeMatchedRetailOffer(offer, client as any);
    await writeMatchedRetailOffer({ ...offer, base_price: 70 }, client as any);
    expect(client.offers.size).toBe(1);
  });

  it('creates price snapshots', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url, '2026-06-15T00:00:00.000Z');
    await writeMatchedRetailOffer(offer, client as any);
    expect(client.snapshots.size).toBe(1);
  });

  it('repeated ingestion does not duplicate snapshots for same captured_at', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url, '2026-06-15T00:00:00.000Z');
    await writeMatchedRetailOffer(offer, client as any);
    await writeMatchedRetailOffer(offer, client as any);
    expect(client.snapshots.size).toBe(1);
  });

  it('enforces AU/AUD parsed offers', () => {
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    expect(offer.market).toBe('AU');
    expect(offer.currency).toBe('AUD');
  });

  it('keeps conditional subscription prices out of effective price', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    await writeMatchedRetailOffer(offer, client as any);
    const written = [...client.offers.values()][0] as RetailOffer;
    expect(written.effective_price).toBe(74.99);
  });

  it('stores image/source attribution metadata', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url);
    await writeMatchedRetailOffer(offer, client as any);
    const metadata = JSON.parse(String([...client.offers.values()][0].metadata));
    expect(metadata.image_url).toBe('https://cdn.example/royal-4kg.jpg');
    expect(metadata.source_type).toBe('retailer');
  });

  it('loads the approved manifest file', async () => {
    const manifest = await loadPetstockManifest();
    expect(manifest).toHaveLength(16);
    expect(manifest[0].product_url).toContain('petstock.com.au/products/');
  });

  it('loads the approved Petbarn manifest file', async () => {
    const manifest = await loadPetbarnManifest();
    expect(manifest).toHaveLength(16);
    expect(manifest[0].product_url).toContain('petbarn.com.au/p/');
  });

  it('rejects invalid manifest items', async () => {
    const manifestPath = await writeTempManifest([{ retailer: 'petstock', market: 'AU', currency: 'AUD', product_url: 'https://www.petstock.com.au/search?q=cat' }]);
    await expect(loadPetstockManifest(manifestPath)).rejects.toThrow('/products/');
  });

  it('rejects invalid Petbarn manifest items', async () => {
    const manifestPath = await writeTempManifest([{ retailer: 'petbarn', market: 'AU', currency: 'AUD', product_url: 'https://www.petbarn.com.au/search?q=cat' }]);
    await expect(loadPetbarnManifest(manifestPath)).rejects.toThrow('Petbarn /p/ product URL');
  });

  it('parses Petbarn product group title, price, pack size, stock and image', () => {
    const offers = parsePetbarnProductPage(petbarnHtml, petbarnManifestItem.product_url, '2026-06-16T00:00:00.000Z');
    expect(offers).toHaveLength(2);
    expect(offers[1]).toEqual(
      expect.objectContaining({
        retailer_slug: 'petbarn',
        retailer_product_title: 'Royal Canin Indoor Adult Cat Food 4kg',
        product_name: 'Royal Canin Indoor Adult Cat Food',
        pack_size_g: 4000,
        base_price: 97.99,
        member_price: 59,
        stock_status: 'IN_STOCK',
        image_url: 'https://cdn.example/petbarn-royal-4kg.jpg',
      }),
    );
  });

  it('parses Petbarn single-pack offers with explicit shape metadata', () => {
    const offers = parsePetbarnProductPage(petbarnHtml, petbarnManifestItem.product_url, '2026-06-16T00:00:00.000Z');
    expect(offers[1]).toEqual(
      expect.objectContaining({
        offer_type: 'single_pack',
        single_pack_size_g: 4000,
        unit_count: 1,
        total_pack_size_g: 4000,
      }),
    );
  });

  it('flags Petbarn bundle pages as unsupported bundle or multipack offers', () => {
    const offers = parsePetbarnProductPage(petbarnBundleHtml, 'https://www.petbarn.com.au/p/bundle-544', '2026-06-16T00:00:00.000Z');
    expect(offers).toHaveLength(1);
    expect(offers[0]).toEqual(
      expect.objectContaining({
        offer_type: 'bundle',
        single_pack_size_g: 2000,
        unit_count: 2,
        total_pack_size_g: 4000,
        unsupported_reason: 'unsupported_bundle_or_multipack',
      }),
    );
  });

  it('falls back to Petbarn HTML when JSON-LD is missing', () => {
    const offers = parsePetbarnProductPage(petbarnHtmlFallback, petbarnManifestItem.product_url, '2026-06-16T00:00:00.000Z');
    expect(offers).toHaveLength(1);
    expect(offers[0]).toEqual(
      expect.objectContaining({
        base_price: 97.99,
        pack_size_g: 4000,
        brand_name: 'ROYAL CANIN',
      }),
    );
  });

  it('writes a high-confidence Petbarn canonical match', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetbarnProductPage(petbarnHtml, petbarnManifestItem.product_url, '2026-06-16T00:00:00.000Z')
      .filter((item) => item.pack_size_g === 4000);
    const report = await writeMatchedRetailOffer(offer, client as any);
    expect(report.status).toBe('INGESTED');
    expect(report.canonical_slug).toBe('royal-canin-indoor-adult-4000g');
    const metadata = JSON.parse(String([...client.offers.values()][0].metadata));
    expect(metadata.source).toBe('petbarn_ingestion_pilot_v1');
  });

  it('keeps Petbarn member pricing conditional and out of the ordinary effective price', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetbarnProductPage(petbarnHtml, petbarnManifestItem.product_url, '2026-06-16T00:00:00.000Z')
      .filter((item) => item.pack_size_g === 4000);
    await writeMatchedRetailOffer(offer, client as any);
    const written = [...client.offers.values()][0] as RetailOffer;
    const metadata = JSON.parse(String([...client.offers.values()][0].metadata));
    expect(written.effective_price).toBe(97.99);
    expect(metadata.conditional_flags).toContain('member_price');
  });

  it('skips unsupported Petbarn bundle or multipack offers before canonical matching', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetbarnProductPage(petbarnBundleHtml, 'https://www.petbarn.com.au/p/bundle-544', '2026-06-16T00:00:00.000Z');
    const report = await writeMatchedRetailOffer(offer, client as any);
    expect(report.status).toBe('SKIPPED');
    expect(report.message).toContain('Unsupported bundle or multipack');
    expect(client.offers.size).toBe(0);
    expect(client.snapshots.size).toBe(0);
  });

  it('supports Petstock and Petbarn offers for the same canonical slug', async () => {
    const client = new InMemoryOfferClient();
    const [petstockOffer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url, '2026-06-15T00:00:00.000Z');
    const [petbarnOffer] = parsePetbarnProductPage(petbarnHtml, petbarnManifestItem.product_url, '2026-06-16T00:00:00.000Z')
      .filter((item) => item.pack_size_g === 4000);
    await writeMatchedRetailOffer(petstockOffer, client as any);
    await writeMatchedRetailOffer(petbarnOffer, client as any);
    const offers = [...client.offers.values()].filter((offer) => offer.product_slug === 'royal-canin-indoor-adult-4000g');
    expect(new Set(offers.map((offer) => offer.retailer_slug))).toEqual(new Set(['petstock', 'petbarn']));
  });

  it('runs the Petbarn pilot against the approved manifest shape', async () => {
    const client = new InMemoryOfferClient();
    const result = await runPetbarnPilot(
      { client: client as any, capturedAt: '2026-06-16T00:00:00.000Z' },
      {
        checkRobotsAllowed: async () => ({ allowed: true, reason: 'allowed', robotsUrl: 'https://www.petbarn.com.au/robots.txt' }),
        fetchWithTimeout: async () => ({
          status: 200,
          url: petbarnManifestItem.product_url,
          body: petbarnHtml,
          contentType: 'text/html',
        }),
        parsePetbarnProductPage,
        writeMatchedRetailOffer: (parsed: ParsedRetailOffer, innerClient?: InMemoryOfferClient, minimumWriteConfidence?: number) =>
          writeMatchedRetailOffer(parsed, innerClient as any, minimumWriteConfidence),
        delay: async () => undefined,
        loadPetbarnManifest: async () => [petbarnManifestItem],
      } as any,
    );
    expect(result.reports[0].status).toBe('INGESTED');
    expect(result.summary.ingested_count).toBe(1);
  });

  it('safely writes Petbarn In & Out Fit to the approved Fit canonical', async () => {
    const client = new InMemoryOfferClient();
    const report = await writeMatchedRetailOffer(
      makePetbarnParsedOffer({
        product_url: 'https://www.petbarn.com.au/p/royal-canin-feline-in-out-fit-cat-food/29333',
        retailer_product_title: 'Royal Canin Feline In & Out Fit Cat Food 4kg',
        product_name: 'Royal Canin Feline In & Out Fit Cat Food',
        base_price: 93.99,
        member_price: 69,
      }),
      client as any,
    );
    expect(report.status).toBe('INGESTED');
    expect(report.canonical_slug).toBe('royal-canin-fit-adult-4000g');
  });

  it('safely writes Petbarn Royal Canin Indoor 2kg to the approved 2kg canonical', async () => {
    const client = new InMemoryOfferClient();
    const report = await writeMatchedRetailOffer(
      makePetbarnParsedOffer({
        product_url: 'https://www.petbarn.com.au/p/royal-canin-feline-indoor-cat-food/29357',
        retailer_product_title: 'Royal Canin Indoor Adult Cat Food 2kg',
        product_name: 'Royal Canin Indoor Adult Cat Food',
        pack_size_g: 2000,
        base_price: 63.99,
        member_price: 51,
      }),
      client as any,
    );
    expect(report.status).toBe('INGESTED');
    expect(report.canonical_slug).toBe('royal-canin-indoor-adult-2000g');
  });

  it('safely writes Petbarn Black Hawk Indoor 4kg to the approved 4kg canonical', async () => {
    const client = new InMemoryOfferClient();
    const report = await writeMatchedRetailOffer(
      makePetbarnParsedOffer({
        product_url: 'https://www.petbarn.com.au/p/black-hawk-healthy-benefits-indoor-chickn-adult-cat-food/147378',
        retailer_product_title: 'Black Hawk Healthy Benefits Indoor Chicken Adult Cat Food 4kg',
        brand_name: 'Black Hawk',
        product_name: 'Black Hawk Healthy Benefits Indoor Chicken Adult Cat Food',
        pack_size_g: 4000,
        base_price: 84.99,
        member_price: 78,
      }),
      client as any,
    );
    expect(report.status).toBe('INGESTED');
    expect(report.canonical_slug).toBe('black-hawk-indoor-chicken-rice-4000g');
  });

  it('safely writes Petbarn Light Weight 1.5kg to the approved 1.5kg canonical', async () => {
    const client = new InMemoryOfferClient();
    const report = await writeMatchedRetailOffer(
      makePetbarnParsedOffer({
        product_url: 'https://www.petbarn.com.au/p/royal-canin-feline-light-cat-food/140055',
        retailer_product_title: 'Royal Canin Light Weight Care Adult Cat Food 1.5kg',
        product_name: 'Royal Canin Light Weight Care Adult Cat Food',
        pack_size_g: 1500,
        base_price: 49.99,
        member_price: 45,
      }),
      client as any,
    );
    expect(report.status).toBe('INGESTED');
    expect(report.canonical_slug).toBe('royal-canin-light-weight-care-adult-1500g');
  });

  it('safely writes Petbarn Hill\'s Sensitive title to the approved Sensitive canonical', async () => {
    const client = new InMemoryOfferClient();
    const report = await writeMatchedRetailOffer(
      makePetbarnParsedOffer({
        product_url: 'https://www.petbarn.com.au/p/hill-s-science-diet-sensitive-stomach-skin-adult-cat-food/132570',
        retailer_product_title: "Hill's Science Diet Sensitive Stomach & Skin Adult Cat Food 3.17kg",
        brand_name: "Hill's Science Diet",
        product_name: "Hill's Science Diet Sensitive Stomach & Skin Adult Cat Food",
        pack_size_g: 3170,
        base_price: 84.99,
        member_price: 69,
      }),
      client as any,
    );
    expect(report.status).toBe('INGESTED');
    expect(report.canonical_slug).toBe('hills-science-diet-sensitive-stomach-skin-adult-chicken-3170g');
  });

  it('parses cli args with manifest flag', () => {
    const cli = parsePetstockPilotCliArgs(['--manifest', 'src/ingestion/retail/manifests/petstock-pilot-urls.json']);
    expect(cli.manifestPath).toContain('petstock-pilot-urls.json');
    expect(cli.urls).toHaveLength(0);
  });

  it('skips repeated manifest items to keep batch deterministic', async () => {
    const client = new InMemoryOfferClient();
    const result = await runPetstockPilot(
      { client: client as any },
      makeDeps({
        loadPetstockManifest: async () => [manifestItem, manifestItem],
      }) as any,
    );
    expect(result.reports).toHaveLength(2);
    expect(result.reports[0].status).toBe('INGESTED');
    expect(result.reports[1].status).toBe('SKIPPED');
    expect(result.summary.ingested_count).toBe(1);
  });

  it('reports parse failure separately from ingestion failure', async () => {
    const client = new InMemoryOfferClient();
    const result = await runPetstockPilot(
      { client: client as any },
      makeDeps({
        parsePetstockProductPage: () => [],
      }) as any,
    );
    expect(result.reports[0].status).toBe('PARSE_FAILED');
    expect(result.reports[0].parsed_successfully).toBe(false);
  });

  it('respects expected pack size from the manifest', async () => {
    const client = new InMemoryOfferClient();
    const result = await runPetstockPilot(
      {
        client: client as any,
        capturedAt: '2026-06-15T00:00:00.000Z',
      },
      makeDeps() as any,
    );
    expect(result.reports[0].parsed_pack_size_g).toBe(4000);
    expect(result.reports[0].status).toBe('INGESTED');
  });

  it('returns canonical missing for parsed but unknown products in runner mode', async () => {
    const client = new InMemoryOfferClient();
    const result = await runPetstockPilot(
      { client: client as any },
      makeDeps({
        loadPetstockManifest: async () => [
          {
            retailer: 'petstock',
            market: 'AU',
            currency: 'AUD',
            product_url: 'https://www.petstock.com.au/products/future-brand-cat-food',
            expected_brand: 'Future Brand',
            expected_pack_size_g: 4000,
          },
        ],
        parsePetstockProductPage: (html: string, productUrl: string, capturedAt?: string) =>
          parsePetstockProductPage(petstockHtml, productUrl, capturedAt).map((offer) => ({
            ...offer,
            product_url: productUrl,
            product_name: 'Strange New Therapeutic Cat Food',
            brand_name: 'Future Brand',
            retailer_product_title: 'Future Brand Strange New Therapeutic Cat Food',
          })),
      }) as any,
    );
    expect(result.reports[0].status).toBe('CANONICAL_MISSING');
    expect(result.summary.canonical_missing_count).toBe(1);
  });

  it('uses fixed captured_at to keep snapshot idempotency stable in tests', async () => {
    const client = new InMemoryOfferClient();
    await runPetstockPilot(
      { client: client as any, capturedAt: '2026-06-15T00:00:00.000Z' },
      makeDeps() as any,
    );
    await runPetstockPilot(
      { client: client as any, capturedAt: '2026-06-15T00:00:00.000Z' },
      makeDeps() as any,
    );
    expect(client.offers.size).toBe(1);
    expect(client.snapshots.size).toBe(1);
  });

  it('drops canonical missing count for the approved Petstock pilot products', async () => {
    const client = new InMemoryOfferClient();
    const result = await runPetstockPilot(
      { client: client as any, capturedAt: '2026-06-15T00:00:00.000Z' },
      makeDeps({
        loadPetstockManifest: async () => [
          {
            retailer: 'petstock',
            market: 'AU',
            currency: 'AUD',
            product_url: 'https://www.petstock.com.au/products/royal-canin-fit-adult-dry-cat-food',
            expected_brand: 'Royal Canin',
            expected_pack_size_g: 4000,
            expected_canonical_slug: 'royal-canin-fit-adult-4000g',
          },
          {
            retailer: 'petstock',
            market: 'AU',
            currency: 'AUD',
            product_url: 'https://www.petstock.com.au/products/hills-science-diet-indoor-adult-dry-cat-food',
            expected_brand: "Hill's Science Diet",
            expected_pack_size_g: 4000,
            expected_canonical_slug: 'hills-science-diet-indoor-adult-4000g',
          },
        ],
        fetchWithTimeout: async (url: string) => buildFetchResult(url),
        parsePetstockProductPage: (_html: string, productUrl: string) => {
          if (productUrl.includes('royal-canin-fit')) {
            return [
              makeParsedOffer({
                product_url: productUrl,
                retailer_product_title: 'Royal Canin Fit Adult Dry Cat Food',
                product_name: 'Royal Canin Fit Adult Dry Cat Food',
              }),
            ];
          }
          return [
            makeParsedOffer({
              product_url: productUrl,
              retailer_product_title: "Hill's Science Diet Indoor Adult Dry Cat Food",
              brand_name: "Hill's Science Diet",
              product_name: "Hill's Science Diet Indoor Adult Dry Cat Food",
              pack_size_g: 4000,
              base_price: 72,
            }),
          ];
        },
      }) as any,
    );
    expect(result.summary.canonical_missing_count).toBe(0);
    expect(result.summary.ingested_count).toBe(2);
  });

  it('collects db coverage metrics from the repository client', async () => {
    const client = new InMemoryOfferClient();
    const [offer] = parsePetstockProductPage(petstockHtml, manifestItem.product_url, '2026-06-15T00:00:00.000Z');
    await writeMatchedRetailOffer(offer, client as any);
    const coverage = await collectDbCoverage(client as any);
    expect(coverage.petstock_active_offers_count).toBe(1);
    expect(coverage.canonical_products_with_petstock_offer_count).toBe(1);
  });

  it('keeps search api response shape unchanged', async () => {
    const response = await withFixtureFallback(() => request(app).get('/api/search/products?q=royal canin&market=AU'));
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(response.body.data.items[0]).toEqual(
      expect.objectContaining({
        slug: expect.any(String),
        brand_name: expect.any(String),
        lowest_effective_price: expect.anything(),
        best_retailer: expect.anything(),
      }),
    );
  });

  it('keeps price comparison api response shape unchanged', async () => {
    const response = await withFixtureFallback(() => request(app).get('/api/price-comparison/royal-canin-indoor-adult-4000g?market=AU'));
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        product: expect.objectContaining({ slug: 'royal-canin-indoor-adult-4000g' }),
        best_price_today: expect.anything(),
        best_retailer: expect.anything(),
        offers: expect.any(Array),
      }),
    );
  });

  it('keeps product offers api response shape unchanged', async () => {
    const response = await withFixtureFallback(() => request(app).get('/api/products/royal-canin-indoor-adult-4000g/offers?market=AU'));
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        product: expect.objectContaining({ slug: 'royal-canin-indoor-adult-4000g' }),
        offers: expect.any(Array),
      }),
    );
  });

  it('keeps markets api response shape unchanged', async () => {
    const response = await request(app).get('/api/markets');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        default_market: expect.any(String),
        markets: expect.any(Array),
      }),
    );
  });
});
