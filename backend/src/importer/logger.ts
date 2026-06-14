import { randomUUID } from 'crypto';
import { db } from '../db/client';
import { importBatches } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface BatchLog {
  batch_id: string;
  source_type: 'csv' | 'json' | 'connector';
  connector_name?: string;
}

export interface FailedDetail {
  row: number;
  reason: string;
}

// ── Create a new import batch ──────────────────────────────────────
export async function createBatch(
  sourceType: 'csv' | 'json' | 'connector',
  connectorName?: string,
): Promise<BatchLog> {
  const batch_id = randomUUID();
  await db.insert(importBatches).values({
    batch_id,
    source_type: sourceType,
    connector_name: connectorName || null,
    rows_total: 0,
    rows_success: 0,
    rows_failed: 0,
    failed_details: [],
    status: 'running',
    started_at: new Date(),
  });
  return { batch_id, source_type: sourceType, connector_name: connectorName };
}

// ── Finalize batch ─────────────────────────────────────────────────
export async function finalizeBatch(
  batchId: string,
  totals: {
    rows_total: number;
    rows_success: number;
    rows_failed: number;
    failed_details: FailedDetail[];
    status?: string;
  },
): Promise<void> {
  await db
    .update(importBatches)
    .set({
      rows_total: totals.rows_total,
      rows_success: totals.rows_success,
      rows_failed: totals.rows_failed,
      failed_details: totals.failed_details as any,
      status: totals.status || 'completed',
      completed_at: new Date(),
    })
    .where(eq(importBatches.batch_id, batchId));
}

// ── Get batch report ───────────────────────────────────────────────
export async function getBatchReport(batchId: string) {
  const rows = await db
    .select()
    .from(importBatches)
    .where(eq(importBatches.batch_id, batchId));
  return rows[0] || null;
}
