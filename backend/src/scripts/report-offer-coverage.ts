import { pool } from '../db/client';
import { canonicalProducts } from '../price-comparison/fixture-data';
import { AuditRetailOfferRow, buildOfferCoverageAuditReport } from '../price-comparison/audit';
import { MarketRegion } from '../price-comparison/types';

interface QueryRow {
  product_slug: string;
  retailer_slug: string;
  retailer_name: string;
  market: string;
  currency: string;
  effective_price: string | number | null;
  stock_status: string;
  last_checked_at: Date | string | null;
  metadata: Record<string, unknown> | null;
}

function parseMarketFromArgs(argv: string[]): MarketRegion {
  const marketArg = argv.find((arg) => arg.startsWith('--market='));
  const value = marketArg?.split('=')[1]?.toUpperCase();
  return value === 'NZ' ? 'NZ' : 'AU';
}

function numberOrNull(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function loadAuditRows(market: MarketRegion): Promise<AuditRetailOfferRow[]> {
  const result = await pool.query<QueryRow>(
    `
      SELECT
        product_slug,
        retailer_slug,
        retailer_name,
        market,
        currency,
        effective_price,
        stock_status,
        last_checked_at,
        metadata
      FROM retail_offers
      WHERE market = $1
      ORDER BY product_slug ASC, retailer_slug ASC
    `,
    [market],
  );

  return result.rows.map((row) => ({
    product_slug: row.product_slug,
    retailer_slug: row.retailer_slug,
    retailer_name: row.retailer_name,
    market: row.market as MarketRegion,
    currency: row.currency,
    effective_price: numberOrNull(row.effective_price),
    stock_status: row.stock_status,
    last_checked_at: row.last_checked_at,
    metadata: row.metadata,
  }));
}

function printSummary(report: ReturnType<typeof buildOfferCoverageAuditReport>) {
  const { summary } = report;
  console.log('Offer Coverage Audit Summary');
  console.log(`Market: ${report.market}`);
  console.log(`Canonical products: ${summary.canonical_products_total}`);
  console.log(`Products with offers: ${summary.products_with_any_offer}`);
  console.log(`Products with no offers: ${summary.products_with_no_offer}`);
  console.log(`Products with 1 retailer: ${summary.products_with_1_retailer}`);
  console.log(`Products with 2+ retailers: ${summary.products_with_2_or_more_retailers}`);
  console.log(`Products with real ingestion offers: ${summary.products_with_real_ingestion_offer}`);
  console.log(`Products with fixture-only offers: ${summary.products_with_fixture_only}`);
  console.log(`Products with mixed source types: ${summary.products_with_mixed_source_types}`);
  console.log(`Petstock offers: ${summary.petstock_offer_count}`);
  console.log(`Petbarn offers: ${summary.petbarn_offer_count}`);
  console.log(`Multi-retailer products: ${summary.multi_retailer_product_count}`);
  console.log(`Stale offers: ${summary.stale_offer_count}`);
  console.log(`Missing last_checked: ${summary.missing_last_checked_count}`);
  console.log(`Homepage candidates: ${summary.homepage_candidate_count}`);
  console.log(`Source metadata available: ${summary.source_metadata_available}`);
  console.log(`Unknown source offers: ${summary.unknown_source_count}`);
  console.log(`Real ingestion offers: ${summary.real_ingestion_offer_count}`);
  console.log(`Fixture offers: ${summary.fixture_offer_count}`);
  console.log(`Seed offers: ${summary.seed_offer_count}`);
  console.log(`Demo offers: ${summary.demo_offer_count}`);
  console.log(`Source breakdown: ${JSON.stringify(summary.source_breakdown)}`);
  console.log('JSON report follows:');
  console.log(JSON.stringify(report, null, 2));
}

export async function generateOfferCoverageReport(market: MarketRegion = 'AU') {
  const offers = await loadAuditRows(market);
  const catCatalog = canonicalProducts.filter((product) => product.species === 'CAT');

  return buildOfferCoverageAuditReport(offers, {
    market,
    catalog: catCatalog,
  });
}

if (require.main === module) {
  const market = parseMarketFromArgs(process.argv.slice(2));

  generateOfferCoverageReport(market)
    .then((report) => {
      printSummary(report);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Offer coverage audit failed for market ${market}:`, error);
      process.exit(1);
    });
}
