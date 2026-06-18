import path from 'node:path';
import { pool } from '../../db/client';
import { FetchResult, ParsedRetailOffer, PetstockPilotManifestItem, RetailIngestionDbCoverage, RetailIngestionReport, RetailIngestionRunResult, RetailIngestionSummary } from './types';
import { loadPetstockManifest } from './manifest';
import { DEFAULT_RETAIL_INGESTION_CONFIG, delay, fetchWithTimeout } from './fetcher';
import { parsePetstockProductPage } from './parsers/petstock-parser';
import { checkRobotsAllowed } from './robots';
import { writeMatchedRetailOffer } from './retail-offer-writer';

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

interface CliInput {
  urls: string[];
  manifestPath?: string;
}

interface PilotDependencies {
  checkRobotsAllowed: (url: string, userAgent: string) => Promise<{ allowed: boolean; reason: string; robotsUrl: string }>;
  fetchWithTimeout: (url: string) => Promise<FetchResult>;
  parsePetstockProductPage: (html: string, productUrl: string, capturedAt?: string) => ParsedRetailOffer[];
  writeMatchedRetailOffer: (
    parsed: ParsedRetailOffer,
    client?: Queryable,
    minimumWriteConfidence?: number,
  ) => Promise<RetailIngestionReport>;
  delay: (ms: number) => Promise<void>;
  loadPetstockManifest: (manifestPath?: string) => Promise<PetstockPilotManifestItem[]>;
}

export interface RunPetstockPilotOptions {
  urls?: string[];
  manifestPath?: string;
  capturedAt?: string;
  client?: Queryable;
  minimumWriteConfidence?: number;
}

const defaultDependencies: PilotDependencies = {
  checkRobotsAllowed,
  fetchWithTimeout,
  parsePetstockProductPage,
  writeMatchedRetailOffer,
  delay,
  loadPetstockManifest,
};

const ALL_STATUSES = [
  'INGESTED',
  'ROBOTS_DISALLOWED',
  'FETCH_TIMEOUT',
  'FETCH_BLOCKED',
  'PARSE_FAILED',
  'CANONICAL_MISSING',
  'LOW_CONFIDENCE_MATCH',
  'PACK_SIZE_CONFLICT',
  'PRICE_MISSING',
  'STOCK_UNKNOWN',
  'SKIPPED',
] as const;

function isPetstockProductUrl(value: string): boolean {
  return /^https:\/\/www\.petstock\.com\.au\/products\/[^?#]+$/i.test(value);
}

function makeSkippedReport(
  item: PetstockPilotManifestItem,
  message: string,
  overrides: Partial<RetailIngestionReport> = {},
): RetailIngestionReport {
  return {
    status: 'SKIPPED',
    product_url: item.product_url,
    retailer_slug: item.retailer,
    message,
    parsed_successfully: false,
    canonical_matched: false,
    offer_written: false,
    snapshot_written: false,
    ...overrides,
  };
}

function manifestItemFromUrl(url: string): PetstockPilotManifestItem {
  return {
    retailer: 'petstock',
    market: 'AU',
    currency: 'AUD',
    product_url: url,
  };
}

function reportFromNoParsedOffers(
  item: PetstockPilotManifestItem,
  status: RetailIngestionReport['status'],
  message: string,
): RetailIngestionReport {
  return {
    status,
    product_url: item.product_url,
    retailer_slug: item.retailer,
    message,
    parsed_successfully: false,
    canonical_matched: false,
    offer_written: false,
    snapshot_written: false,
  };
}

function selectParsedOffer(
  item: PetstockPilotManifestItem,
  parsedOffers: ParsedRetailOffer[],
): { offer?: ParsedRetailOffer; report?: RetailIngestionReport } {
  if (parsedOffers.length === 0) {
    return {
      report: reportFromNoParsedOffers(item, 'PARSE_FAILED', 'No parseable product offers found'),
    };
  }

  if (item.expected_pack_size_g === undefined) {
    return { offer: parsedOffers[0] };
  }

  const matchingOffer = parsedOffers.find((offer) => offer.pack_size_g === item.expected_pack_size_g);
  if (!matchingOffer) {
    return {
      report: makeSkippedReport(
        item,
        `Expected pack size ${item.expected_pack_size_g}g was not exposed on the product page`,
        {
          parsed_successfully: true,
          retailer_product_title: parsedOffers[0].retailer_product_title,
          parsed_brand: parsedOffers[0].brand_name,
          match_warnings: parsedOffers.map((offer) => `Available parsed pack size: ${offer.pack_size_g}g`),
        },
      ),
    };
  }

  return { offer: matchingOffer };
}

async function ingestManifestItem(
  item: PetstockPilotManifestItem,
  options: RunPetstockPilotOptions,
  deps: PilotDependencies,
): Promise<RetailIngestionReport> {
  if (!isPetstockProductUrl(item.product_url)) {
    return makeSkippedReport(item, 'Only manually supplied Petstock product URLs are allowed');
  }

  const robots = await deps.checkRobotsAllowed(item.product_url, DEFAULT_RETAIL_INGESTION_CONFIG.userAgent);
  if (!robots.allowed) {
    return {
      status: 'ROBOTS_DISALLOWED',
      product_url: item.product_url,
      retailer_slug: item.retailer,
      message: robots.reason,
      parsed_successfully: false,
      canonical_matched: false,
      offer_written: false,
      snapshot_written: false,
    };
  }

  let fetched: FetchResult;
  try {
    fetched = await deps.fetchWithTimeout(item.product_url);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fetch failed';
    const status = message.toLowerCase().includes('abort') || message.toLowerCase().includes('timeout')
      ? 'FETCH_TIMEOUT'
      : 'FETCH_BLOCKED';
    return {
      status,
      product_url: item.product_url,
      retailer_slug: item.retailer,
      message,
      parsed_successfully: false,
      canonical_matched: false,
      offer_written: false,
      snapshot_written: false,
    };
  }

  if (fetched.status >= 400) {
    return {
      status: 'FETCH_BLOCKED',
      product_url: item.product_url,
      retailer_slug: item.retailer,
      message: `HTTP ${fetched.status}`,
      parsed_successfully: false,
      canonical_matched: false,
      offer_written: false,
      snapshot_written: false,
    };
  }

  const parsedOffers = deps.parsePetstockProductPage(fetched.body, fetched.url, options.capturedAt);
  const selected = selectParsedOffer(item, parsedOffers);
  if (!selected.offer) {
    return selected.report!;
  }

  if (item.expected_brand && selected.offer.brand_name.trim().toLowerCase() !== item.expected_brand.trim().toLowerCase()) {
    return makeSkippedReport(
      item,
      `Parsed brand "${selected.offer.brand_name}" did not match expected brand "${item.expected_brand}"`,
      {
        retailer_product_title: selected.offer.retailer_product_title,
        parsed_brand: selected.offer.brand_name,
        parsed_pack_size_g: selected.offer.pack_size_g,
        parsed_price: selected.offer.base_price,
        parsed_successfully: true,
      },
    );
  }

  const report = await deps.writeMatchedRetailOffer(
    selected.offer,
    options.client ?? pool,
    options.minimumWriteConfidence ?? DEFAULT_RETAIL_INGESTION_CONFIG.minimumWriteConfidence,
  );

  if (
    item.expected_canonical_slug &&
    report.status === 'INGESTED' &&
    report.canonical_slug !== item.expected_canonical_slug
  ) {
    return {
      ...report,
      status: 'SKIPPED',
      message: `Matched canonical slug "${report.canonical_slug}" did not match manifest expectation "${item.expected_canonical_slug}"`,
      canonical_matched: false,
      offer_written: false,
      snapshot_written: false,
      retail_offer_id: undefined,
      snapshot_created: false,
    };
  }

  return report;
}

function buildSummary(reports: RetailIngestionReport[]): RetailIngestionSummary {
  const byStatus = Object.fromEntries(ALL_STATUSES.map((status) => [status, 0])) as Record<
    RetailIngestionReport['status'],
    number
  >;

  for (const report of reports) {
    byStatus[report.status] += 1;
  }

  const urlsProcessed = reports.length;
  const parseSuccessCount = reports.filter((report) => report.parsed_successfully).length;
  const canonicalMatchSuccessCount = reports.filter((report) => report.canonical_matched).length;
  const ingestedCount = reports.filter((report) => report.status === 'INGESTED').length;
  const offersWritten = reports.filter((report) => report.offer_written).length;
  const snapshotsWritten = reports.filter((report) => report.snapshot_written).length;

  return {
    urls_processed: urlsProcessed,
    ingested_count: ingestedCount,
    skipped_count: urlsProcessed - ingestedCount,
    parse_success_count: parseSuccessCount,
    parse_success_rate: urlsProcessed === 0 ? 0 : Math.round((parseSuccessCount / urlsProcessed) * 10000) / 100,
    canonical_match_success_count: canonicalMatchSuccessCount,
    canonical_match_success_rate:
      urlsProcessed === 0 ? 0 : Math.round((canonicalMatchSuccessCount / urlsProcessed) * 10000) / 100,
    offers_written: offersWritten,
    snapshots_written: snapshotsWritten,
    pack_size_conflicts: byStatus.PACK_SIZE_CONFLICT,
    canonical_missing_count: byStatus.CANONICAL_MISSING,
    low_confidence_count: byStatus.LOW_CONFIDENCE_MATCH,
    by_status: byStatus,
  };
}

export async function collectDbCoverage(client: Queryable = pool): Promise<RetailIngestionDbCoverage> {
  const [retailOffersResult, priceSnapshotsResult, petstockOffersResult, canonicalProductsResult] =
    await Promise.all([
      client.query(`SELECT COUNT(*)::int AS count FROM retail_offers`),
      client.query(`SELECT COUNT(*)::int AS count FROM price_snapshots`),
      client.query(
        `
          SELECT COUNT(*)::int AS count
          FROM retail_offers
          WHERE retailer_slug = 'petstock' AND market = 'AU' AND currency = 'AUD'
        `,
      ),
      client.query(
        `
          SELECT COUNT(DISTINCT product_slug)::int AS count
          FROM retail_offers
          WHERE retailer_slug = 'petstock' AND market = 'AU' AND currency = 'AUD'
        `,
      ),
    ]);

  return {
    retail_offers_count: Number(retailOffersResult.rows[0].count),
    price_snapshots_count: Number(priceSnapshotsResult.rows[0].count),
    petstock_active_offers_count: Number(petstockOffersResult.rows[0].count),
    canonical_products_with_petstock_offer_count: Number(canonicalProductsResult.rows[0].count),
  };
}

async function resolveManifestItems(options: RunPetstockPilotOptions, deps: PilotDependencies): Promise<{
  items: PetstockPilotManifestItem[];
  manifestPath?: string;
}> {
  if (options.urls && options.urls.length > 0) {
    return {
      items: options.urls.map((url) => manifestItemFromUrl(url)),
      manifestPath: undefined,
    };
  }

  const manifestPath = options.manifestPath
    ? path.resolve(process.cwd(), options.manifestPath)
    : undefined;
  return {
    items: await deps.loadPetstockManifest(manifestPath),
    manifestPath,
  };
}

export function parsePetstockPilotCliArgs(argv = process.argv.slice(2)): CliInput {
  const urls: string[] = [];
  let manifestPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') {
      manifestPath = argv[index + 1];
      index += 1;
      continue;
    }
    urls.push(arg);
  }

  return { urls: urls.filter(Boolean), manifestPath };
}

export async function runPetstockPilot(
  options: RunPetstockPilotOptions = {},
  deps: PilotDependencies = defaultDependencies,
): Promise<RetailIngestionRunResult> {
  const { items, manifestPath } = await resolveManifestItems(options, deps);
  if (items.length === 0) {
    const reports = [
      {
        status: 'SKIPPED' as const,
        product_url: '',
        retailer_slug: 'petstock',
        message: 'No manual Petstock product URLs supplied',
        parsed_successfully: false,
        canonical_matched: false,
        offer_written: false,
        snapshot_written: false,
      },
    ];
    return {
      manifest_path: manifestPath,
      reports,
      summary: buildSummary(reports),
    };
  }

  const reports: RetailIngestionReport[] = [];
  const seenKeys = new Set<string>();

  for (const item of items) {
    const duplicateKey = `${item.product_url}|${item.expected_pack_size_g ?? ''}`;
    if (seenKeys.has(duplicateKey)) {
      reports.push(
        makeSkippedReport(item, 'Repeated manifest item skipped to keep batch deterministic', {
          parsed_successfully: false,
        }),
      );
      continue;
    }

    seenKeys.add(duplicateKey);
    reports.push(await ingestManifestItem(item, options, deps));
    await deps.delay(DEFAULT_RETAIL_INGESTION_CONFIG.delayMs);
  }

  return {
    manifest_path: manifestPath,
    reports,
    summary: buildSummary(reports),
    db_coverage: await collectDbCoverage(options.client ?? pool),
  };
}
