import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IMemoryDb, newDb } from 'pg-mem';
import { setupDbMock } from './helpers/mockDb';

function createAdminWriteTables(memDb: IMemoryDb) {
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

    CREATE TABLE admin_dictionary_terms (
      id SERIAL PRIMARY KEY,
      category VARCHAR NOT NULL,
      raw_term TEXT NOT NULL,
      normalized_value TEXT,
      pattern TEXT,
      retailer_slug VARCHAR,
      notes TEXT,
      status VARCHAR NOT NULL DEFAULT 'active',
      needs_review BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

function seedAdminWriteData(memDb: IMemoryDb) {
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (1, 'Royal Canin', 'FR')`);
  memDb.public.none(`
    INSERT INTO products (
      product_id, brand_id, name, species, life_stage, product_type, format, package_size_g, origin, status, verification_status
    ) VALUES (
      1, 1, 'Indoor Adult Dry Cat Food', 'CAT', 'ADULT', 'dry', 'kibble', 4000, 'FR', 'active', 'MULTI_SOURCE'
    )
  `);
  memDb.public.none(`
    INSERT INTO sources (
      product_id, source_url, source_type, status, needs_review, notes, expected_pack_size_g, expected_offer_type, expected_unit_count
    ) VALUES (
      1, 'https://example.com/source', 'retailer', 'active', FALSE, 'Existing source', 4000, 'single_pack', 1
    )
  `);
  memDb.public.none(`
    INSERT INTO admin_dictionary_terms (
      category, raw_term, normalized_value, pattern, retailer_slug, notes, status, needs_review
    ) VALUES (
      'bundle_keyword', 'x2 bags', 'bundle', '(?i)x2', 'petbarn', 'Existing dictionary term', 'active', FALSE
    )
  `);
}

function extractSessionCookie(setCookieHeader: string[] | undefined): string {
  const cookie = setCookieHeader?.find((value) => value.startsWith('pawkawa_admin_session='));
  expect(cookie).toBeTruthy();
  return cookie!.split(';')[0];
}

async function setupApp() {
  const memDb = newDb();
  createAdminWriteTables(memDb);
  seedAdminWriteData(memDb);
  setupDbMock(memDb);

  const { adminAuthRouter } = await import('../src/routes/admin-auth');
  const { adminWriteRouter } = await import('../src/routes/admin-write');
  const { createAdminUser } = await import('../src/admin/auth');
  const { resetAdminLoginRateLimitForTests } = await import('../src/admin/login-rate-limit');
  const { errorHandler } = await import('../src/middleware/errorHandler');

  resetAdminLoginRateLimitForTests();

  const app = express();
  app.use(express.json());
  app.use('/api/admin/auth', adminAuthRouter);
  app.use('/api/admin', adminWriteRouter);
  app.use(errorHandler);

  return { app, createAdminUser, memDb };
}

async function login(app: express.Express, createAdminUser: (input: { email: string; name: string; password: string }) => Promise<unknown>) {
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

async function fetchCsrf(app: express.Express, cookie: string) {
  const response = await request(app).get('/api/admin/auth/csrf').set('Cookie', cookie);
  expect(response.status).toBe(200);
  return response.body.data.csrf_token as string;
}

describe('Admin write APIs', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('requires csrf protection for admin product updates', async () => {
    const { app, createAdminUser } = await setupApp();
    const cookie = await login(app, createAdminUser);

    const response = await request(app)
      .patch('/api/admin/products/1')
      .set('Cookie', cookie)
      .send({ name: 'Updated Product Name' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ADMIN_CSRF_INVALID');
  });

  it('updates product metadata and records a product_updated audit event', async () => {
    const { app, createAdminUser, memDb } = await setupApp();
    const cookie = await login(app, createAdminUser);
    const csrfToken = await fetchCsrf(app, cookie);

    const response = await request(app)
      .patch('/api/admin/products/1')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Indoor Adult Dry Cat Food AU',
        format: 'dry kibble',
        status: 'active',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.item.name).toBe('Indoor Adult Dry Cat Food AU');
    expect(response.body.data.item.format).toBe('dry kibble');

    const logs = memDb.public.many(`SELECT action, entity_type FROM admin_audit_logs ORDER BY id`);
    expect(logs.some((log: { action: string; entity_type: string }) => log.action === 'product_updated' && log.entity_type === 'product')).toBe(true);
  });

  it('creates and updates source URLs with audit events', async () => {
    const { app, createAdminUser, memDb } = await setupApp();
    const cookie = await login(app, createAdminUser);
    const csrfToken = await fetchCsrf(app, cookie);

    const createResponse = await request(app)
      .post('/api/admin/sources')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        product_id: 1,
        source_url: 'https://example.com/new-source',
        source_type: 'official',
        needs_review: true,
        notes: 'Check pack size before ingestion',
        expected_pack_size_g: 2000,
        expected_offer_type: 'single_pack',
        expected_unit_count: 1,
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.data.item.source_url).toBe('https://example.com/new-source');

    const createdId = createResponse.body.data.item.source_id as number;
    const updateResponse = await request(app)
      .patch(`/api/admin/sources/${createdId}`)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        status: 'disabled',
        needs_review: false,
        notes: 'Disabled after review',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.item.status).toBe('disabled');
    expect(updateResponse.body.data.item.notes).toBe('Disabled after review');

    const logs = memDb.public.many(`SELECT action FROM admin_audit_logs ORDER BY id`);
    expect(logs.some((log: { action: string }) => log.action === 'source_url_created')).toBe(true);
    expect(logs.some((log: { action: string }) => log.action === 'source_url_updated')).toBe(true);
  });

  it('lists, creates, and updates dictionary terms with audit events', async () => {
    const { app, createAdminUser, memDb } = await setupApp();
    const cookie = await login(app, createAdminUser);
    const csrfToken = await fetchCsrf(app, cookie);

    const listResponse = await request(app).get('/api/admin/dictionary').set('Cookie', cookie);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.items[0].raw_term).toBe('x2 bags');

    const createResponse = await request(app)
      .post('/api/admin/dictionary')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        category: 'conditional_price_keyword',
        raw_term: 'repeat delivery',
        normalized_value: 'membership_discount',
        retailer_slug: 'petbarn',
        notes: 'Marks subscription-style pricing',
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.data.item.category).toBe('conditional_price_keyword');

    const createdId = createResponse.body.data.item.id as number;
    const updateResponse = await request(app)
      .patch(`/api/admin/dictionary/${createdId}`)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        notes: 'Confirmed on Petbarn bundle pages',
        needs_review: true,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.item.needs_review).toBe(true);

    const logs = memDb.public.many(`SELECT action FROM admin_audit_logs ORDER BY id`);
    expect(logs.some((log: { action: string }) => log.action === 'dictionary_term_created')).toBe(true);
    expect(logs.some((log: { action: string }) => log.action === 'dictionary_term_updated')).toBe(true);
  });
});
