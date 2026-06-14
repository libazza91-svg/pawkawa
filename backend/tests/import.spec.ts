import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTestDb, seedProductsBrands, setupDbMock } from './helpers/mockDb';

describe('Import API', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.resetModules();

    const memDb = createTestDb();
    // Seed brands/products needed by other routes
    seedProductsBrands(memDb);

    // Also seed an import_batches record for report testing
    memDb.public.none(`INSERT INTO import_batches (batch_id, source_type, rows_total, rows_success, rows_failed, status) VALUES ('batch-test-1234567890', 'csv', 20, 18, 2, 'completed')`);

    setupDbMock(memDb);

    const { default: testApp } = await import('../src/index');
    app = testApp;
  });

  describe('GET /api/import/report/:batchId', () => {
    it('should return import report for valid batch ID', async () => {
      const res = await request(app).get('/api/import/report/batch-test-1234567890');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batch_id).toBe('batch-test-1234567890');
      expect(res.body.data.source_type).toBe('csv');
      expect(res.body.data.rows_total).toBe(20);
      expect(res.body.data.rows_success).toBe(18);
      expect(res.body.data.rows_failed).toBe(2);
      expect(res.body.data.status).toBe('completed');
    });

    it('should return 404 for nonexistent batch', async () => {
      const res = await request(app).get('/api/import/report/nonexistent-batch');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BATCH_NOT_FOUND');
    });

    it('should return 400 for short batch ID', async () => {
      const res = await request(app).get('/api/import/report/short');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
    });
  });
});
