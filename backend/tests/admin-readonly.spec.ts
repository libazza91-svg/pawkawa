import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newDb, type IMemoryDb } from 'pg-mem';
import { setupDbMock } from './helpers/mockDb';

function createAdminReadonlyTables(memDb: IMemoryDb) {
  memDb.public.many(`
    CREATE TABLE brands (
      brand_id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL UNIQUE,
      country VARCHAR,
      official_url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE products (
      product_id SERIAL PRIMARY KEY,
      brand_id INTEGER REFERENCES brands(brand_id),
      name VARCHAR NOT NULL,
      species VARCHAR,
      life_stage VARCHAR,
      product_type VARCHAR,
      format VARCHAR,
      package_size_g INTEGER,
      origin VARCHAR,
      status VARCHAR DEFAULT 'active',
      source_count INTEGER DEFAULT 0,
      confidence_score REAL DEFAULT 0.0,
      verification_status TEXT DEFAULT 'UNVERIFIED',
      imported_batch_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE sources (
      source_id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(product_id),
      source_url TEXT,
      source_type VARCHAR,
      status VARCHAR DEFAULT 'active',
      needs_review BOOLEAN DEFAULT FALSE,
      notes TEXT,
      expected_pack_size_g INTEGER,
      expected_offer_type VARCHAR,
      expected_unit_count INTEGER,
      captured_at TIMESTAMP DEFAULT NOW(),
      confidence_score NUMERIC DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE retail_offers (
      retail_offer_id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(product_id),
      product_slug VARCHAR NOT NULL,
      retailer_name VARCHAR NOT NULL,
      retailer_slug VARCHAR NOT NULL,
      market VARCHAR NOT NULL,
      currency VARCHAR NOT NULL,
      product_url TEXT NOT NULL,
      pack_size_g INTEGER NOT NULL,
      base_price NUMERIC NOT NULL,
      sale_price NUMERIC,
      member_price NUMERIC,
      coupon_price NUMERIC,
      conditional_best_price NUMERIC,
      conditional_price_reason TEXT,
      effective_price NUMERIC NOT NULL,
      unit_price_per_kg NUMERIC NOT NULL,
      stock_status VARCHAR NOT NULL,
      promotion_text TEXT,
      promotion_type VARCHAR,
      coupon_code VARCHAR,
      minimum_spend NUMERIC,
      shipping_threshold NUMERIC,
      last_checked_at TIMESTAMP NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE admin_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR NOT NULL UNIQUE,
      name VARCHAR NOT NULL,
      password_hash VARCHAR NOT NULL,
      role VARCHAR NOT NULL DEFAULT 'admin',
      status VARCHAR NOT NULL DEFAULT 'active',
      last_login_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE admin_sessions (
      id SERIAL PRIMARY KEY,
      admin_user_id INTEGER NOT NULL REFERENCES admin_users(id),
      session_token_hash VARCHAR NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMP
    );

    CREATE TABLE admin_audit_logs (
      id SERIAL PRIMARY KEY,
      actor_admin_user_id INTEGER REFERENCES admin_users(id),
      action VARCHAR NOT NULL,
      entity_type VARCHAR NOT NULL,
      entity_id VARCHAR NOT NULL,
      before_json JSONB,
      after_json JSONB,
      reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

function seedAdminReadonlyData(memDb: IMemoryDb) {
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (1, 'Royal Canin', 'FR')`);
  memDb.public.none(`
    INSERT INTO products (product_id, brand_id, name, species, life_stage, package_size_g, source_count, confidence_score, verification_status)
    VALUES (1, 1, 'Indoor Adult Dry Cat Food', 'CAT', 'ADULT', 4000, 2, 0.91, 'MULTI_SOURCE')
  `);
  memDb.public.none(`
    INSERT INTO retail_offers (
      product_id, product_slug, retailer_name, retailer_slug, market, currency, product_url, pack_size_g,
      base_price, effective_price, unit_price_per_kg, stock_status, last_checked_at
    )
    VALUES (1, 'royal-canin-indoor-adult-4000g', 'Petstock', 'petstock', 'AU', 'AUD', 'https://example.com', 4000, 63, 63, 15.75, 'IN_STOCK', NOW())
  `);
  memDb.public.none(`
    INSERT INTO sources (product_id, source_url, source_type, confidence_score)
    VALUES (1, 'https://example.com/source', 'retailer', 0.9)
  `);
}

function extractSessionCookie(setCookieHeader: string[] | undefined): string {
  const cookie = setCookieHeader?.find((value) => value.startsWith('pawkawa_admin_session='));
  expect(cookie).toBeTruthy();
  return cookie!.split(';')[0];
}

describe('Admin read-only APIs', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function setupApp() {
    const memDb = newDb();
    createAdminReadonlyTables(memDb);
    seedAdminReadonlyData(memDb);
    setupDbMock(memDb);

    const { adminAuthRouter } = await import('../src/routes/admin-auth');
    const { adminReadonlyRouter } = await import('../src/routes/admin-readonly');
    const { createAdminUser } = await import('../src/admin/auth');
    const { resetAdminLoginRateLimitForTests } = await import('../src/admin/login-rate-limit');

    resetAdminLoginRateLimitForTests();

    const app = express();
    app.use(express.json());
    app.use('/api/admin/auth', adminAuthRouter);
    app.use('/api/admin', adminReadonlyRouter);

    return { app, createAdminUser };
  }

  async function login(app: express.Express, createAdminUser: Awaited<ReturnType<typeof setupApp>>['createAdminUser']) {
    await createAdminUser({
      email: 'admin@example.com',
      name: 'Barry',
      password: 'super-secure-password',
    });

    const response = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@example.com',
      password: 'super-secure-password',
    });

    return extractSessionCookie(response.headers['set-cookie']);
  }

  it('requires admin auth for read-only admin APIs', async () => {
    const { app } = await setupApp();
    const response = await request(app).get('/api/admin/products');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('ADMIN_UNAUTHORIZED');
  });

  it('returns dashboard summary for authenticated admins', async () => {
    const { app, createAdminUser } = await setupApp();
    const cookie = await login(app, createAdminUser);

    const response = await request(app).get('/api/admin/dashboard').set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.data.summary.products).toBe(1);
    expect(response.body.data.summary.offers).toBe(1);
    expect(response.body.data.summary.sources).toBe(1);
    expect(response.body.data.summary.retailers).toBe(1);
  });

  it('returns read-only products, offers, sources, and audit log lists', async () => {
    const { app, createAdminUser } = await setupApp();
    const cookie = await login(app, createAdminUser);

    const [productsResponse, offersResponse, sourcesResponse, auditResponse] = await Promise.all([
      request(app).get('/api/admin/products').set('Cookie', cookie),
      request(app).get('/api/admin/offers').set('Cookie', cookie),
      request(app).get('/api/admin/sources').set('Cookie', cookie),
      request(app).get('/api/admin/audit-log').set('Cookie', cookie),
    ]);

    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body.data.items[0].name).toBe('Indoor Adult Dry Cat Food');
    expect(offersResponse.status).toBe(200);
    expect(offersResponse.body.data.items[0].retailer_name).toBe('Petstock');
    expect(sourcesResponse.status).toBe(200);
    expect(sourcesResponse.body.data.items[0].source_type).toBe('retailer');
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.data.items.length).toBeGreaterThan(0);
  });
});
