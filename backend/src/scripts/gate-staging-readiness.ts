import { generateOfferCoverageReport } from './report-offer-coverage';
import { runCleanupPriceSourceHygiene } from './cleanup-price-source-hygiene';
import { getPriceComparison, getProductOffers, searchCanonicalProducts } from '../price-comparison/service';

type GateStatus = 'PASS' | 'WARN' | 'FAIL';
type DemoRole = 'primary' | 'limited-coverage';

interface DemoWhitelistEntry {
  product_slug: string;
  brand: string;
  product_name: string;
  pack_size_g: number;
  expected_retailers: string[];
  expected_offer_count: number;
  expected_coverage_status: 'BASIC' | 'LIMITED';
  demo_role: DemoRole;
  known_caveats: string[];
}

interface GateCheck {
  id: string;
  status: GateStatus;
  message: string;
  details?: unknown;
}

const APPROVED_ORPHAN_SLUGS = ['royal-canin-fit-adult-400g', 'royal-canin-indoor-adult-400g'];

const DEMO_PRODUCT_WHITELIST: DemoWhitelistEntry[] = [
  {
    product_slug: 'royal-canin-indoor-adult-4000g',
    brand: 'Royal Canin',
    product_name: 'Indoor Adult Dry Cat Food',
    pack_size_g: 4000,
    expected_retailers: ['Petbarn', 'Petstock'],
    expected_offer_count: 2,
    expected_coverage_status: 'BASIC',
    demo_role: 'primary',
    known_caveats: [],
  },
  {
    product_slug: 'royal-canin-fit-adult-4000g',
    brand: 'Royal Canin',
    product_name: 'Fit Adult Dry Cat Food',
    pack_size_g: 4000,
    expected_retailers: ['Petbarn', 'Petstock'],
    expected_offer_count: 2,
    expected_coverage_status: 'BASIC',
    demo_role: 'primary',
    known_caveats: [],
  },
  {
    product_slug: 'royal-canin-light-weight-care-adult-3000g',
    brand: 'Royal Canin',
    product_name: 'Light Weight Care Adult Dry Cat Food',
    pack_size_g: 3000,
    expected_retailers: ['Petbarn', 'Petstock'],
    expected_offer_count: 2,
    expected_coverage_status: 'BASIC',
    demo_role: 'primary',
    known_caveats: [],
  },
  {
    product_slug: 'hills-science-diet-indoor-adult-4000g',
    brand: "Hill's Science Diet",
    product_name: 'Indoor Adult Dry Cat Food',
    pack_size_g: 4000,
    expected_retailers: ['Petbarn', 'Petstock'],
    expected_offer_count: 2,
    expected_coverage_status: 'BASIC',
    demo_role: 'primary',
    known_caveats: [],
  },
  {
    product_slug: 'hills-science-diet-sensitive-stomach-skin-adult-chicken-3170g',
    brand: "Hill's Science Diet",
    product_name: 'Sensitive Stomach & Skin Adult Chicken Dry Cat Food',
    pack_size_g: 3170,
    expected_retailers: ['Petbarn', 'Petstock'],
    expected_offer_count: 2,
    expected_coverage_status: 'BASIC',
    demo_role: 'primary',
    known_caveats: [],
  },
  {
    product_slug: 'black-hawk-indoor-chicken-rice-2000g',
    brand: 'Black Hawk',
    product_name: 'Indoor Chicken & Rice',
    pack_size_g: 2000,
    expected_retailers: ['Petbarn', 'Petstock'],
    expected_offer_count: 2,
    expected_coverage_status: 'BASIC',
    demo_role: 'primary',
    known_caveats: [],
  },
  {
    product_slug: 'black-hawk-original-chicken-2000g',
    brand: 'Black Hawk',
    product_name: 'Original Chicken Dry Cat Food',
    pack_size_g: 2000,
    expected_retailers: ['Petbarn', 'Petstock'],
    expected_offer_count: 2,
    expected_coverage_status: 'BASIC',
    demo_role: 'primary',
    known_caveats: [],
  },
  {
    product_slug: 'ziwi-peak-air-dried-mackerel-lamb-400g',
    brand: 'Ziwi Peak',
    product_name: 'Air-Dried Mackerel & Lamb',
    pack_size_g: 400,
    expected_retailers: ['Petstock'],
    expected_offer_count: 1,
    expected_coverage_status: 'LIMITED',
    demo_role: 'limited-coverage',
    known_caveats: ['Limited coverage example: currently one tracked retailer.'],
  },
];

function check(id: string, status: GateStatus, message: string, details?: unknown): GateCheck {
  return { id, status, message, details };
}

function hasRequiredKeys(value: Record<string, unknown>, keys: string[]): string[] {
  return keys.filter((key) => !(key in value));
}

async function checkPublicApiShape(): Promise<GateCheck[]> {
  const searchResults = await searchCanonicalProducts('royal canin indoor', 'AU');
  const priceComparison = await getPriceComparison('royal-canin-indoor-adult-4000g', 'AU');
  const offers = await getProductOffers('royal-canin-indoor-adult-4000g', 'AU');

  const checks: GateCheck[] = [];
  const searchItem = searchResults[0] as unknown as Record<string, unknown> | undefined;
  const missingSearchKeys = searchItem
    ? hasRequiredKeys(searchItem, [
        'product_id',
        'slug',
        'product_name',
        'brand_name',
        'lowest_effective_price',
        'lowest_unit_price_per_kg',
        'best_retailer',
        'offer_count',
        'market',
        'currency',
      ])
    : ['search_result'];

  checks.push(
    check(
      'public_api_search_shape',
      missingSearchKeys.length === 0 ? 'PASS' : 'FAIL',
      missingSearchKeys.length === 0 ? 'Search product result shape is stable.' : 'Search product result is missing required fields.',
      { missing_keys: missingSearchKeys },
    ),
  );

  const priceObject = priceComparison as unknown as Record<string, unknown> | null;
  const missingPriceKeys = priceObject
    ? hasRequiredKeys(priceObject, [
        'product',
        'market',
        'currency',
        'best_price_today',
        'best_retailer',
        'lowest_unit_price_per_kg',
        'offer_count',
        'last_checked_summary',
        'offers',
        'secondary',
      ])
    : ['price_comparison'];

  checks.push(
    check(
      'public_api_price_shape',
      missingPriceKeys.length === 0 ? 'PASS' : 'FAIL',
      missingPriceKeys.length === 0 ? 'Price comparison response shape is stable.' : 'Price comparison response is missing required fields.',
      { missing_keys: missingPriceKeys },
    ),
  );

  const offersObject = offers as unknown as Record<string, unknown> | null;
  const missingOfferKeys = offersObject ? hasRequiredKeys(offersObject, ['product', 'market', 'currency', 'offers']) : ['product_offers'];

  checks.push(
    check(
      'public_api_offers_shape',
      missingOfferKeys.length === 0 ? 'PASS' : 'FAIL',
      missingOfferKeys.length === 0 ? 'Product offers response shape is stable.' : 'Product offers response is missing required fields.',
      { missing_keys: missingOfferKeys },
    ),
  );

  return checks;
}

export async function runStagingReadinessGate() {
  const report = await generateOfferCoverageReport('AU');
  const cleanupDryRun = await runCleanupPriceSourceHygiene({ execute: false });
  const { summary } = report;
  const checks: GateCheck[] = [];

  checks.push(
    check(
      'fixture_fallback_disabled',
      process.env.PRICE_COMPARISON_FIXTURE_FALLBACK === 'true' ? 'FAIL' : 'PASS',
      'PRICE_COMPARISON_FIXTURE_FALLBACK must not be true in staging/public.',
      { value: process.env.PRICE_COMPARISON_FIXTURE_FALLBACK ?? '<unset>' },
    ),
  );

  checks.push(check('au_fixture_offer_count', summary.fixture_offer_count === 0 ? 'PASS' : 'FAIL', 'AU fixture offers must be zero.', summary.fixture_offer_count));
  checks.push(
    check(
      'pet_circle_fixture_absent',
      summary.products_with_pet_circle_fixture.length === 0 ? 'PASS' : 'FAIL',
      'Pet Circle fixture rows must not appear in public AU price results.',
      summary.products_with_pet_circle_fixture,
    ),
  );
  checks.push(
    check(
      'fixture_cannot_win_best_price',
      summary.products_where_fixture_is_best_price.length === 0 ? 'PASS' : 'FAIL',
      'Fixture/seed/demo offers must not win public best price.',
      summary.products_where_fixture_is_best_price,
    ),
  );
  checks.push(
    check(
      'mixed_source_overlap_absent',
      summary.mixed_source_multi_retailer_product_count === 0 ? 'PASS' : 'FAIL',
      'Multi-retailer products must not mix real ingestion with fixture/seed/demo offers.',
      summary.mixed_source_multi_retailer_product_count,
    ),
  );
  checks.push(
    check(
      'real_overlap_minimum',
      summary.real_only_multi_retailer_product_count >= 15 ? 'PASS' : 'FAIL',
      'Real-only multi-retailer coverage must stay at or above 15 products for controlled staging.',
      summary.real_only_multi_retailer_product_count,
    ),
  );

  const orphanSlugs = summary.orphan_product_slugs;
  const onlyApprovedOrphans =
    orphanSlugs.length === APPROVED_ORPHAN_SLUGS.length && orphanSlugs.every((slug) => APPROVED_ORPHAN_SLUGS.includes(slug));

  checks.push(
    check(
      'orphan_rows_reported',
      summary.orphan_offer_count === 0 ? 'PASS' : onlyApprovedOrphans ? 'WARN' : 'FAIL',
      'Orphan rows are warning-only when limited to the approved 400g quarantine set.',
      { orphan_offer_count: summary.orphan_offer_count, orphan_product_slugs: orphanSlugs },
    ),
  );

  for (const entry of DEMO_PRODUCT_WHITELIST) {
    const product = report.products.find((item) => item.product_slug === entry.product_slug);
    if (!product) {
      checks.push(check(`demo_whitelist_${entry.product_slug}`, 'FAIL', 'Demo whitelist product is missing from canonical coverage report.', entry));
      continue;
    }

    const missingRetailers = entry.expected_retailers.filter((retailer) => !product.retailers.includes(retailer));
    const isOrphan = orphanSlugs.includes(entry.product_slug);
    const hasFixtureOnly = product.source_types?.every((sourceType) => sourceType === 'fixture') ?? false;
    const lacksRealIngestion = !(product.source_types ?? []).includes('real_ingestion');
    const coverageMismatch = product.coverage_status !== entry.expected_coverage_status;
    const insufficientOffers = product.offer_count < entry.expected_offer_count;

    const failed =
      isOrphan || hasFixtureOnly || lacksRealIngestion || missingRetailers.length > 0 || coverageMismatch || insufficientOffers;

    checks.push(
      check(
        `demo_whitelist_${entry.product_slug}`,
        failed ? 'FAIL' : 'PASS',
        failed ? 'Demo whitelist product does not meet staging expectations.' : 'Demo whitelist product is ready for controlled staging.',
        {
          expected: entry,
          actual: {
            offer_count: product.offer_count,
            retailers: product.retailers,
            coverage_status: product.coverage_status,
            source_types: product.source_types,
            warnings: product.warnings,
          },
          missing_retailers: missingRetailers,
        },
      ),
    );
  }

  const deleteCandidates = cleanupDryRun.reason_per_row.filter((candidate) => candidate.recommended_action === 'delete');
  const realRetailerCleanupCandidates = cleanupDryRun.reason_per_row.filter(
    (candidate) =>
      candidate.source_type === 'real_ingestion' &&
      (candidate.retailer_slug === 'petstock' || candidate.retailer_slug === 'petbarn') &&
      candidate.recommended_action === 'delete',
  );

  checks.push(
    check(
      'cleanup_dry_run_no_deletes',
      deleteCandidates.length === 0 ? 'PASS' : 'FAIL',
      'Cleanup dry-run must not select rows for deletion before staging.',
      deleteCandidates,
    ),
  );
  checks.push(
    check(
      'cleanup_preserves_petstock_petbarn',
      realRetailerCleanupCandidates.length === 0 ? 'PASS' : 'FAIL',
      'Cleanup dry-run must not select real Petstock/Petbarn ingestion rows for deletion.',
      realRetailerCleanupCandidates,
    ),
  );

  checks.push(...(await checkPublicApiShape()));

  const failCount = checks.filter((item) => item.status === 'FAIL').length;
  const warnCount = checks.filter((item) => item.status === 'WARN').length;
  const status: GateStatus = failCount > 0 ? 'FAIL' : warnCount > 0 ? 'WARN' : 'PASS';

  return {
    generated_at: new Date().toISOString(),
    status,
    fail_count: failCount,
    warn_count: warnCount,
    pass_count: checks.filter((item) => item.status === 'PASS').length,
    demo_product_whitelist: DEMO_PRODUCT_WHITELIST,
    checks,
    offer_coverage_summary: summary,
    cleanup_dry_run: cleanupDryRun,
  };
}

if (require.main === module) {
  runStagingReadinessGate()
    .then((result) => {
      console.log('MVP Staging Readiness Gate');
      console.log(`Status: ${result.status}`);
      console.log(`PASS: ${result.pass_count}, WARN: ${result.warn_count}, FAIL: ${result.fail_count}`);
      console.log('JSON report follows:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === 'FAIL' ? 1 : 0);
    })
    .catch((error) => {
      console.error('MVP staging readiness gate failed to run:', error);
      process.exit(1);
    });
}
