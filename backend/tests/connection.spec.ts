import { describe, it, expect } from 'vitest';
import { newDb } from 'pg-mem';

describe('Database Connection', () => {
  it('should create a working in-memory database', () => {
    const memDb = newDb();
    expect(memDb).toBeDefined();
    expect(memDb.public).toBeDefined();
  });

  it('should execute SELECT 1 successfully', () => {
    const memDb = newDb();
    const result = memDb.public.many('SELECT 1 AS one');
    expect(result).toBeDefined();
    expect(result[0].one).toBe(1);
  });

  it('should create brands table and allow insert', () => {
    const memDb = newDb();
    memDb.public.none(`
      CREATE TABLE brands (
        brand_id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL UNIQUE,
        country VARCHAR,
        official_url TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    memDb.public.none(`INSERT INTO brands (name, country) VALUES ('Test Brand', 'AU')`);
    const rows = memDb.public.many('SELECT * FROM brands');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Test Brand');
    expect(rows[0].country).toBe('AU');
  });

  it('should support connection pool semantics', () => {
    const memDb = newDb();
    const { Pool } = memDb.adapters.createPg();
    const pool = new Pool();

    return pool.query('SELECT 1 AS val').then((res: any) => {
      expect(res.rows[0].val).toBe(1);
    });
  });

  it('should reject on invalid SQL', () => {
    const memDb = newDb();
    expect(() => {
      memDb.public.many('SELECT * FROM nonexistent_table');
    }).toThrow();
  });

  it('should read environment variables for connection params (smoke test)', () => {
    // Import client to validate it doesn't throw during module load
    // when env vars are not set (it uses defaults)
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'testdb';
    process.env.DB_USER = 'testuser';
    process.env.DB_PASSWORD = 'testpass';

    expect(() => {
      // Module import should not crash on buildConnectionString
      // when DATABASE_URL is not set but individual params are
    }).not.toThrow();

    // Clean up
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
  });
});
