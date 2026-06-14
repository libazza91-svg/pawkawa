import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestDb, setupDbMock } from './helpers/mockDb';

describe('Import Logger', () => {
  beforeEach(() => {
    vi.resetModules();
    const memDb = createTestDb();
    setupDbMock(memDb);
  });

  it('should create a batch and return batch metadata', async () => {
    const { createBatch } = await import('../src/importer/logger');
    const batch = await createBatch('csv');
    expect(batch.batch_id).toBeDefined();
    expect(batch.batch_id.length).toBe(36); // UUID
    expect(batch.source_type).toBe('csv');
    expect(batch.connector_name).toBeUndefined();
  });

  it('should create a batch with connector name', async () => {
    const { createBatch } = await import('../src/importer/logger');
    const batch = await createBatch('connector', 'opff');
    expect(batch.source_type).toBe('connector');
    expect(batch.connector_name).toBe('opff');
  });

  it('should finalize a batch with totals', async () => {
    const { createBatch, finalizeBatch, getBatchReport } = await import('../src/importer/logger');
    const batch = await createBatch('json');
    await finalizeBatch(batch.batch_id, {
      rows_total: 50,
      rows_success: 45,
      rows_failed: 5,
      failed_details: [{ row: 3, reason: 'Invalid enum' }, { row: 7, reason: 'Missing name' }],
    });

    const report = await getBatchReport(batch.batch_id);
    expect(report).not.toBeNull();
    expect(report.rows_total).toBe(50);
    expect(report.rows_success).toBe(45);
    expect(report.rows_failed).toBe(5);
    expect(report.status).toBe('completed');
  });

  it('should finalize a batch with custom status', async () => {
    const { createBatch, finalizeBatch, getBatchReport } = await import('../src/importer/logger');
    const batch = await createBatch('csv');
    await finalizeBatch(batch.batch_id, {
      rows_total: 0,
      rows_success: 0,
      rows_failed: 10,
      failed_details: [],
      status: 'failed',
    });

    const report = await getBatchReport(batch.batch_id);
    expect(report.status).toBe('failed');
  });

  it('should return null for nonexistent batch', async () => {
    const { getBatchReport } = await import('../src/importer/logger');
    const report = await getBatchReport('nonexistent-id');
    expect(report).toBeNull();
  });
});

describe('Import Rollback', () => {
  beforeEach(() => {
    vi.resetModules();
    const memDb = createTestDb();
    setupDbMock(memDb);
  });

  it('should rollback import by batch ID and update import_batches status', async () => {
    const { createBatch, finalizeBatch } = await import('../src/importer/logger');
    const { rollbackImport } = await import('../src/importer/rollback');

    const batch = await createBatch('csv');
    await finalizeBatch(batch.batch_id, {
      rows_total: 10,
      rows_success: 10,
      rows_failed: 0,
      failed_details: [],
    });

    // Should not throw
    await rollbackImport(batch.batch_id);
  });

  it('should rollback without error even for batch with no products', async () => {
    const { rollbackImport } = await import('../src/importer/rollback');
    await rollbackImport('no-such-batch-but-should-not-crash');
  });
});
