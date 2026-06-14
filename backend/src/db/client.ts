import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// ── Connection string resolution ──────────────────────────────────
function buildConnectionString(): string {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (DATABASE_URL) return DATABASE_URL;

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'petfoodcompare';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';

  return `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
}

// ── Singleton (globalThis) for HMR safety ─────────────────────────
const globalForDrizzle = globalThis as unknown as {
  __drizzle_pool?: Pool;
  __drizzle_db?: ReturnType<typeof drizzle>;
};

function createPool(): Pool {
  if (globalForDrizzle.__drizzle_pool) return globalForDrizzle.__drizzle_pool;

  const connectionString = buildConnectionString();
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
  });

  globalForDrizzle.__drizzle_pool = pool;
  return pool;
}

function getDb() {
  if (globalForDrizzle.__drizzle_db) return globalForDrizzle.__drizzle_db;

  const pool = createPool();
  const db = drizzle(pool, { schema });
  globalForDrizzle.__drizzle_db = db;
  return db;
}

export const pool = createPool();
export const db = getDb();

// ── Health check helper ───────────────────────────────────────────
export async function checkConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
