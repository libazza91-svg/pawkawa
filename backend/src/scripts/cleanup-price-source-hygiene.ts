import { pool } from '../db/client';
import { canonicalProducts } from '../price-comparison/fixture-data';
import { classifyOfferSource, rawSourceValue, OfferSourceType } from '../price-comparison/audit';

export type CleanupReason = 'ORPHAN_PRODUCT_SLUG' | 'PET_CIRCLE_FIXTURE' | 'FIXTURE_OR_DEMO_OR_SEED_IN_STAGING_MVP';
export type RecommendedCleanupAction = 'delete' | 'quarantine' | 'manual_review' | 'keep_for_local_fixture';

export interface CleanupRetailOfferRow {
  retail_offer_id: number;
  product_slug: string;
  retailer_slug: string;
  retailer_name?: string;
  market: string;
  currency: string;
  effective_price?: number | string | null;
  last_checked_at?: Date | string | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CleanupSnapshotRow {
  retail_offer_id: number;
  snapshot_count: number | string;
}

export interface CleanupCandidate {
  retail_offer_id: number;
  product_slug: string;
  retailer_slug: string;
  market: string;
  source_type: OfferSourceType;
  metadata_source?: string;
  effective_price?: number;
  last_checked_at?: string;
  created_at?: string;
  updated_at?: string;
  reason: CleanupReason;
  recommended_action: RecommendedCleanupAction;
}

export interface CleanupDryRunReport {
  mode: 'dry-run' | 'execute';
  rows_to_delete: number;
  affected_product_slugs: string[];
  affected_retailers: string[];
  affected_snapshots: number;
  au_fixture_rows: number;
  nz_fixture_rows: number;
  pet_circle_fixture_rows: number;
  other_fixture_rows: number;
  reason_per_row: CleanupCandidate[];
}

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function numberOrUndefined(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function candidateReason(row: CleanupRetailOfferRow, canonicalSlugs: Set<string>): CleanupReason | null {
  const sourceType = classifyOfferSource(row.metadata);
  if (!canonicalSlugs.has(row.product_slug)) return 'ORPHAN_PRODUCT_SLUG';
  if (row.retailer_slug === 'pet-circle' && sourceType === 'fixture') return 'PET_CIRCLE_FIXTURE';
  if (row.market === 'AU' && (sourceType === 'fixture' || sourceType === 'seed' || sourceType === 'demo')) {
    return 'FIXTURE_OR_DEMO_OR_SEED_IN_STAGING_MVP';
  }
  return null;
}

function recommendedAction(reason: CleanupReason, row: CleanupRetailOfferRow): RecommendedCleanupAction {
  if (reason === 'ORPHAN_PRODUCT_SLUG') return 'quarantine';
  if (reason === 'PET_CIRCLE_FIXTURE') return 'delete';
  if (row.market !== 'AU') return 'keep_for_local_fixture';
  return 'delete';
}

export function buildCleanupDryRunReport(
  rows: CleanupRetailOfferRow[],
  snapshotRows: CleanupSnapshotRow[] = [],
  catalog = canonicalProducts,
  mode: 'dry-run' | 'execute' = 'dry-run',
): CleanupDryRunReport {
  const canonicalSlugs = new Set(catalog.map((product) => product.slug));
  const snapshotCountByOffer = new Map(snapshotRows.map((row) => [Number(row.retail_offer_id), Number(row.snapshot_count)]));

  const candidates = rows.flatMap((row) => {
    const reason = candidateReason(row, canonicalSlugs);
    if (!reason) return [];
    const sourceType = classifyOfferSource(row.metadata);
    return [
      {
        retail_offer_id: row.retail_offer_id,
        product_slug: row.product_slug,
        retailer_slug: row.retailer_slug,
        market: row.market,
        source_type: sourceType,
        metadata_source: rawSourceValue(row.metadata) ?? undefined,
        effective_price: numberOrUndefined(row.effective_price),
        last_checked_at: iso(row.last_checked_at),
        created_at: iso(row.created_at),
        updated_at: iso(row.updated_at),
        reason,
        recommended_action: recommendedAction(reason, row),
      } satisfies CleanupCandidate,
    ];
  });

  const fixtureRows = rows.filter((row) => classifyOfferSource(row.metadata) === 'fixture');

  return {
    mode,
    rows_to_delete: candidates.filter((candidate) => candidate.recommended_action === 'delete').length,
    affected_product_slugs: [...new Set(candidates.map((candidate) => candidate.product_slug))].sort(),
    affected_retailers: [...new Set(candidates.map((candidate) => candidate.retailer_slug))].sort(),
    affected_snapshots: candidates.reduce((total, candidate) => total + (snapshotCountByOffer.get(candidate.retail_offer_id) ?? 0), 0),
    au_fixture_rows: fixtureRows.filter((row) => row.market === 'AU').length,
    nz_fixture_rows: fixtureRows.filter((row) => row.market === 'NZ').length,
    pet_circle_fixture_rows: fixtureRows.filter((row) => row.retailer_slug === 'pet-circle').length,
    other_fixture_rows: fixtureRows.filter((row) => row.retailer_slug !== 'pet-circle').length,
    reason_per_row: candidates,
  };
}

function parseExecuteFlag(argv: string[]): boolean {
  return argv.includes('--execute');
}

async function loadRetailOfferRows(client: Queryable): Promise<CleanupRetailOfferRow[]> {
  const result = await client.query(`
    SELECT
      retail_offer_id,
      product_slug,
      retailer_slug,
      retailer_name,
      market,
      currency,
      effective_price,
      last_checked_at,
      created_at,
      updated_at,
      metadata
    FROM retail_offers
    ORDER BY product_slug ASC, retailer_slug ASC
  `);
  return result.rows as unknown as CleanupRetailOfferRow[];
}

async function loadSnapshotRows(client: Queryable): Promise<CleanupSnapshotRow[]> {
  const result = await client.query(`
    SELECT retail_offer_id, COUNT(*)::int AS snapshot_count
    FROM price_snapshots
    GROUP BY retail_offer_id
  `);
  return result.rows as unknown as CleanupSnapshotRow[];
}

async function executeCleanup(client: Queryable, report: CleanupDryRunReport): Promise<void> {
  const ids = report.reason_per_row
    .filter((candidate) => candidate.recommended_action === 'delete')
    .map((candidate) => candidate.retail_offer_id);
  if (ids.length === 0) return;
  await client.query('DELETE FROM price_snapshots WHERE retail_offer_id = ANY($1::int[])', [ids]);
  await client.query('DELETE FROM retail_offers WHERE retail_offer_id = ANY($1::int[])', [ids]);
}

export async function runCleanupPriceSourceHygiene(
  options: { execute?: boolean; client?: Queryable } = {},
): Promise<CleanupDryRunReport> {
  const client = options.client ?? pool;
  const rows = await loadRetailOfferRows(client);
  const snapshotRows = await loadSnapshotRows(client);
  const report = buildCleanupDryRunReport(rows, snapshotRows, canonicalProducts, options.execute ? 'execute' : 'dry-run');
  if (options.execute) await executeCleanup(client, report);
  return report;
}

if (require.main === module) {
  const execute = parseExecuteFlag(process.argv.slice(2));
  runCleanupPriceSourceHygiene({ execute })
    .then((report) => {
      if (!execute) {
        console.log('Cleanup mode: dry-run. No rows were deleted.');
      }
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Price source hygiene cleanup failed:', error);
      process.exit(1);
    });
}
