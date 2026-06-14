import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('Health API', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.resetModules();

    // Mock db client for health checks
    vi.doMock('../src/db/client', () => ({
      checkConnection: vi.fn().mockResolvedValue(true),
      db: {},
      pool: { query: async () => ({ rows: [{ '?column?': 1 }] }) },
    }));

    const { default: testApp } = await import('../src/index');
    app = testApp;
  });

  describe('GET /api/health', () => {
    it('should return ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.version).toBe('0.1.0');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/health/db', () => {
    it('should return healthy when db connected', async () => {
      const res = await request(app).get('/api/health/db');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBe('connected');
    });

    it('should return error when db disconnected', async () => {
      vi.resetModules();
      vi.doMock('../src/db/client', () => ({
        checkConnection: vi.fn().mockResolvedValue(false),
        db: {},
        pool: { query: async () => ({ rows: [{ '?column?': 1 }] }) },
      }));

      const { default: testApp2 } = await import('../src/index');
      const res = await request(testApp2).get('/api/health/db');
      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.database).toBe('disconnected');
    });

    it('should return error when checkConnection throws', async () => {
      vi.resetModules();
      vi.doMock('../src/db/client', () => ({
        checkConnection: vi.fn().mockRejectedValue(new Error('DB down')),
        db: {},
        pool: { query: async () => ({ rows: [{ '?column?': 1 }] }) },
      }));

      const { default: testApp3 } = await import('../src/index');
      const res = await request(testApp3).get('/api/health/db');
      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.database).toBe('disconnected');
    });
  });

  describe('Error Handler Middleware', () => {
    it('should catch unhandled errors and return 500', async () => {
      vi.resetModules();
      vi.doMock('../src/routes/health', () => ({
        healthRouter: (() => {
          const r = express.Router();
          r.get('/crash', () => { throw new Error('Test crash'); });
          return r;
        })(),
      }));

      const { default: testApp } = await import('../src/index');
      const res = await request(testApp).get('/api/health/crash');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
