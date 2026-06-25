import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { newDb, type IMemoryDb } from 'pg-mem';
import { setupDbMock } from './helpers/mockDb';

function createAdminTables(memDb: IMemoryDb) {
  memDb.public.many(`
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

function extractSessionCookie(setCookieHeader: string[] | undefined): string {
  const cookie = setCookieHeader?.find((value) => value.startsWith('pawkawa_admin_session='));
  expect(cookie).toBeTruthy();
  return cookie!.split(';')[0];
}

describe('Admin auth foundation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function setupApp() {
    const memDb = newDb();
    createAdminTables(memDb);
    setupDbMock(memDb);

    const { adminAuthRouter } = await import('../src/routes/admin-auth');
    const { requireAdminAuth } = await import('../src/middleware/admin-auth');
    const { requireAdminCsrf } = await import('../src/middleware/admin-csrf');
    const { createAdminUser, hashAdminSessionToken } = await import('../src/admin/auth');
    const { resetAdminLoginRateLimitForTests } = await import('../src/admin/login-rate-limit');

    resetAdminLoginRateLimitForTests();

    const app = express();
    app.use(express.json());
    app.use('/api/admin/auth', adminAuthRouter);
    app.get('/api/admin/protected', requireAdminAuth, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.post('/api/admin/protected-write', requireAdminAuth, requireAdminCsrf, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    return { app, memDb, createAdminUser, hashAdminSessionToken };
  }

  it('createAdminUser stores password hash, not plaintext', async () => {
    const { memDb, createAdminUser } = await setupApp();
    const user = await createAdminUser({
      email: 'Admin@Example.com',
      name: 'Barry',
      password: 'super-secure-password',
    });

    expect(user.email).toBe('admin@example.com');
    const rows = memDb.public.many(`SELECT email, password_hash FROM admin_users`);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('admin@example.com');
    expect(rows[0].password_hash).not.toBe('super-secure-password');
    expect(rows[0].password_hash.length).toBeGreaterThan(20);
  });

  it('login succeeds with valid password and stores only session token hash', async () => {
    const { app, memDb, createAdminUser } = await setupApp();
    await createAdminUser({
      email: 'admin@example.com',
      name: 'Barry',
      password: 'super-secure-password',
    });

    const res = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@example.com',
      password: 'super-secure-password',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('admin@example.com');
    const sessionCookie = extractSessionCookie(res.headers['set-cookie']);
    const rawToken = sessionCookie.split('=')[1];
    const sessions = memDb.public.many(`SELECT session_token_hash FROM admin_sessions`);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].session_token_hash).not.toBe(rawToken);
  });

  it('login fails with invalid password using a generic message', async () => {
    const { app, createAdminUser } = await setupApp();
    await createAdminUser({
      email: 'admin@example.com',
      name: 'Barry',
      password: 'super-secure-password',
    });

    const res = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@example.com',
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('login failure message is generic for unknown email too', async () => {
    const { app } = await setupApp();

    const res = await request(app).post('/api/admin/auth/login').send({
      email: 'missing@example.com',
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('disabled admin cannot login', async () => {
    const { app, createAdminUser } = await setupApp();
    await createAdminUser({
      email: 'admin@example.com',
      name: 'Barry',
      password: 'super-secure-password',
      status: 'disabled',
    });

    const res = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@example.com',
      password: 'super-secure-password',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('me returns user when session is valid', async () => {
    const { app, createAdminUser } = await setupApp();
    await createAdminUser({
      email: 'admin@example.com',
      name: 'Barry',
      password: 'super-secure-password',
    });

    const login = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@example.com',
      password: 'super-secure-password',
    });

    const sessionCookie = extractSessionCookie(login.headers['set-cookie']);
    const me = await request(app).get('/api/admin/auth/me').set('Cookie', sessionCookie);

    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('admin@example.com');
  });

  it('csrf endpoint rejects missing session', async () => {
    const { app } = await setupApp();
    const res = await request(app).get('/api/admin/auth/csrf');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('ADMIN_UNAUTHORIZED');
  });

  it('csrf endpoint returns token for a valid admin session', async () => {
    const { app, createAdminUser } = await setupApp();
    await createAdminUser({
      email: 'admin@example.com',
      name: 'Barry',
      password: 'super-secure-password',
    });

    const login = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@example.com',
      password: 'super-secure-password',
    });

    const sessionCookie = extractSessionCookie(login.headers['set-cookie']);
    const csrf = await request(app).get('/api/admin/auth/csrf').set('Cookie', sessionCookie);

    expect(csrf.status).toBe(200);
    expect(csrf.body.data.csrf_token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('admin csrf middleware rejects missing or invalid token and accepts a valid token', async () => {
    const { app, createAdminUser } = await setupApp();
    await createAdminUser({
      email: 'admin@example.com',
      name: 'Barry',
      password: 'super-secure-password',
    });

    const login = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@example.com',
      password: 'super-secure-password',
    });

    const sessionCookie = extractSessionCookie(login.headers['set-cookie']);

    const missing = await request(app).post('/api/admin/protected-write').set('Cookie', sessionCookie);
    expect(missing.status).toBe(403);
    expect(missing.body.error.code).toBe('ADMIN_CSRF_INVALID');

    const invalid = await request(app)
      .post('/api/admin/protected-write')
      .set('Cookie', sessionCookie)
      .set('X-CSRF-Token', 'invalid-token');
    expect(invalid.status).toBe(403);
    expect(invalid.body.error.code).toBe('ADMIN_CSRF_INVALID');

    const csrf = await request(app).get('/api/admin/auth/csrf').set('Cookie', sessionCookie);
    const valid = await request(app)
      .post('/api/admin/protected-write')
      .set('Cookie', sessionCookie)
      .set('X-CSRF-Token', csrf.body.data.csrf_token);
    expect(valid.status).toBe(200);
  });

  it('me rejects missing session', async () => {
    const { app } = await setupApp();
    const res = await request(app).get('/api/admin/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('ADMIN_UNAUTHORIZED');
  });

  it('logout revokes session and revoked session cannot be reused', async () => {
    const { app, memDb, createAdminUser } = await setupApp();
    await createAdminUser({
      email: 'admin@example.com',
      name: 'Barry',
      password: 'super-secure-password',
    });

    const login = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@example.com',
      password: 'super-secure-password',
    });

    const sessionCookie = extractSessionCookie(login.headers['set-cookie']);
    const logout = await request(app).post('/api/admin/auth/logout').set('Cookie', sessionCookie);
    expect(logout.status).toBe(200);

    const sessions = memDb.public.many(`SELECT revoked_at FROM admin_sessions`);
    expect(sessions[0].revoked_at).toBeTruthy();

    const me = await request(app).get('/api/admin/auth/me').set('Cookie', sessionCookie);
    expect(me.status).toBe(401);
  });

  it('expired session is rejected', async () => {
    const { app, createAdminUser, hashAdminSessionToken, memDb } = await setupApp();
    const user = await createAdminUser({
      email: 'admin@example.com',
      name: 'Barry',
      password: 'super-secure-password',
    });
    const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    memDb.public.none(`
      INSERT INTO admin_sessions (admin_user_id, session_token_hash, expires_at, created_at, last_seen_at)
      VALUES (${user.id}, '${hashAdminSessionToken('expired-token')}', '${expiredAt}', NOW(), NOW())
    `);

    const res = await request(app).get('/api/admin/auth/me').set('Cookie', 'pawkawa_admin_session=expired-token');
    expect(res.status).toBe(401);
  });

  it('admin auth middleware protects routes', async () => {
    const { app } = await setupApp();
    const res = await request(app).get('/api/admin/protected');
    expect(res.status).toBe(401);
  });

  it('audit log records login, logout, and cli user creation foundation events', async () => {
    const { app, memDb, createAdminUser } = await setupApp();
    await createAdminUser({
      email: 'admin@example.com',
      name: 'Barry',
      password: 'super-secure-password',
    });

    const login = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@example.com',
      password: 'super-secure-password',
    });
    const sessionCookie = extractSessionCookie(login.headers['set-cookie']);
    await request(app).post('/api/admin/auth/logout').set('Cookie', sessionCookie);

    const logs = memDb.public.many(`SELECT action FROM admin_audit_logs ORDER BY id`);
    expect(logs.map((row: { action: string }) => row.action)).toEqual([
      'admin_user_created_by_cli',
      'admin_login_success',
      'admin_logout',
    ]);
  });
});
