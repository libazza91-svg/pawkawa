import { newDb, IMemoryDb } from 'pg-mem';
import { vi } from 'vitest';

// ── drizzle internal symbol ────────────────────────────────────────
const DRIZZLE_NAME = Symbol.for('drizzle:Name');

function getTableName(tableObj: any): string {
  if (!tableObj) return '';
  return tableObj[DRIZZLE_NAME] || '';
}

// ── Schema + seed ──────────────────────────────────────────────────
export function createTestDb(): IMemoryDb {
  const memDb = newDb();

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
    CREATE TABLE product_nutrition (
      product_id INTEGER PRIMARY KEY REFERENCES products(product_id),
      protein_pct NUMERIC,
      fat_pct NUMERIC,
      fiber_pct NUMERIC,
      crude_fiber_pct NUMERIC,
      moisture_pct NUMERIC,
      ash_pct NUMERIC,
      phosphorus_pct NUMERIC,
      calcium_pct NUMERIC,
      omega_3_pct NUMERIC,
      omega_6_pct NUMERIC,
      calories_kcal NUMERIC,
      me_kcal_per_kg NUMERIC
    );
    CREATE TABLE product_ingredients (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(product_id),
      raw_ingredient TEXT,
      normalized_ingredient VARCHAR,
      ingredient_order INTEGER,
      category VARCHAR
    );
    CREATE TABLE product_prices (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(product_id),
      retailer VARCHAR,
      price_aud NUMERIC,
      pack_size NUMERIC,
      unit_price_aud_per_kg NUMERIC,
      affiliate_url TEXT,
      captured_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE sources (
      source_id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(product_id),
      source_url TEXT,
      source_type VARCHAR,
      captured_at TIMESTAMP DEFAULT NOW(),
      confidence_score NUMERIC DEFAULT 0
    );
    CREATE TABLE import_batches (
      batch_id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      connector_name TEXT,
      rows_total INTEGER DEFAULT 0,
      rows_success INTEGER DEFAULT 0,
      rows_failed INTEGER DEFAULT 0,
      failed_details JSONB DEFAULT '[]',
      started_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      status TEXT DEFAULT 'running'
    );
  `);

  return memDb;
}

export function seedProductsBrands(memDb: IMemoryDb) {
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (1, 'Royal Canin', 'FR')`);
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (2, 'Hill''s Science Diet', 'US')`);
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (3, 'Ziwi Peak', 'NZ')`);
  memDb.public.none(`INSERT INTO brands (brand_id, name, country) VALUES (4, 'Black Hawk', 'AU')`);

  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage) VALUES (1, 1, 'Royal Canin Kitten', 'CAT', 'KITTEN')`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage) VALUES (2, 1, 'Royal Canin Adult Cat', 'CAT', 'ADULT')`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage) VALUES (3, 2, 'Hill''s Puppy Food', 'DOG', 'PUPPY')`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species, life_stage) VALUES (4, 2, 'Hill''s Senior Dog', 'DOG', 'SENIOR')`);
  memDb.public.none(`INSERT INTO products (product_id, brand_id, name, species) VALUES (5, 3, 'Ziwi Peak Air-Dried Beef', 'DOG')`);

  memDb.public.none(`INSERT INTO product_nutrition (product_id, protein_pct, fat_pct, fiber_pct, moisture_pct, calories_kcal) VALUES (1, 34, 20, 7, 8, 4100)`);
  memDb.public.none(`INSERT INTO product_ingredients (product_id, raw_ingredient, ingredient_order, category) VALUES (1, 'Chicken Meal', 1, 'protein')`);
  memDb.public.none(`INSERT INTO product_ingredients (product_id, raw_ingredient, ingredient_order, category) VALUES (1, 'Brown Rice', 2, 'grain')`);
  memDb.public.none(`INSERT INTO product_prices (product_id, retailer, price_aud, pack_size, unit_price_aud_per_kg) VALUES (1, 'PetCircle', 45.99, 2, 22.995)`);
  memDb.public.none(`INSERT INTO product_prices (product_id, retailer, price_aud, pack_size, unit_price_aud_per_kg) VALUES (1, 'PetStock', 49.99, 2, 24.995)`);
  memDb.public.none(`INSERT INTO sources (product_id, source_url, source_type) VALUES (1, 'https://royalcanin.com.au/kitten', 'brand_site')`);
}

// ── SQL reconstruction from drizzle queryChunks ────────────────────

/** drizzle StringChunk — has `value: string[]` */
function isStringChunk(c: any): boolean {
  return c && typeof c === 'object' && c.constructor?.name === 'StringChunk' && Array.isArray(c.value);
}

/** drizzle Column reference — has `name` and `table` (PgTable) */
function isColumnRef(c: any): boolean {
  return c && typeof c === 'object' && typeof c.name === 'string' && c.table && typeof c.table === 'object';
}

/** drizzle Param — has `value` and `brand`/`encoder` */
function isParam(c: any): boolean {
  return c && typeof c === 'object' && c.constructor?.name === 'Param' && 'value' in c;
}

/** drizzle SQL object (template, eq, ilike, and, etc.) — has `queryChunks` */
function isNestedSQL(c: any): boolean {
  return c && typeof c === 'object' && Array.isArray(c.queryChunks) && c.constructor?.name !== 'StringChunk' && c.constructor?.name !== 'Param';
}

function formatParamValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (Array.isArray(val)) return `(${val.map(v => formatParamValue(v)).join(', ')})`;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function reconstructSQL(drizzleObj: any): string {
  if (!drizzleObj) return '';
  if (typeof drizzleObj === 'string') return formatParamValue(drizzleObj);
  if (typeof drizzleObj === 'number') return String(drizzleObj);
  if (typeof drizzleObj === 'boolean') return drizzleObj ? 'TRUE' : 'FALSE';
  if (isParam(drizzleObj)) return formatParamValue(drizzleObj.value);

  const chunks = drizzleObj.queryChunks;
  if (!Array.isArray(chunks)) return '';

  let sql = '';
  for (const chunk of chunks) {
    if (isStringChunk(chunk)) {
      sql += chunk.value[0];
    } else if (isParam(chunk)) {
      sql += formatParamValue(chunk.value);
    } else if (isColumnRef(chunk)) {
      const tn = getTableName(chunk.table);
      sql += tn ? `${tn}.${chunk.name}` : chunk.name;
    } else if (isNestedSQL(chunk)) {
      sql += reconstructSQL(chunk);
    } else if (typeof chunk === 'string') {
      sql += formatParamValue(chunk);
    } else if (typeof chunk === 'number') {
      sql += String(chunk);
    } else if (Array.isArray(chunk)) {
      // drizzle inArray values are plain arrays of Param objects
      sql += `(${chunk.map((v: any) => isParam(v) ? formatParamValue(v.value) : formatParamValue(v)).join(', ')})`;
    }
  }

  return sql;
}

// ── Chainable query proxy ──────────────────────────────────────────
interface QueryIntent {
  table: string;
  columns: string;
  joins: string[];
  whereSQL: string;
  orderBy: string;
  limit: number | null;
  offset: number | null;
  isCount: boolean;
}

function makeChainable(memDb: IMemoryDb, intent: QueryIntent): any {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: any, _reject: any) => {
            try {
              const sql = buildSQL(intent);
              const rows = memDb.public.many(sql);
              resolve(rows);
            } catch (e) {
              _reject(e);
            }
          };
        }

        return (...args: any[]) => {
          const next: QueryIntent = {
            ...intent,
            joins: [...intent.joins],
          };

          switch (prop) {
            case 'from': {
              const table = args[0];
              next.table = getTableName(table) || 'unknown';
              break;
            }
            case 'leftJoin': {
              const joinTable = args[0];
              const conditionObj = args[1];
              if (joinTable && conditionObj) {
                const joinTableName = getTableName(joinTable) || 'unknown';
                const condSQL = reconstructSQL(conditionObj);
                next.joins = [...intent.joins, `LEFT JOIN ${joinTableName} ON ${condSQL}`];
              }
              break;
            }
            case 'where': {
              const cond = args[0];
              if (cond) {
                const condSQL = reconstructSQL(cond);
                if (condSQL) {
                  next.whereSQL = intent.whereSQL
                    ? `(${intent.whereSQL}) AND (${condSQL})`
                    : condSQL;
                }
              }
              break;
            }
            case 'orderBy': {
              const orderObj = args[0];
              if (orderObj) {
                const orderSQL = reconstructSQL(orderObj);
                if (orderSQL) next.orderBy = orderSQL;
              }
              break;
            }
            case 'limit':
              next.limit = args[0];
              break;
            case 'offset':
              next.offset = args[0];
              break;
          }

          return makeChainable(memDb, next);
        };
      },
    }
  );
}

function buildSQL(intent: QueryIntent): string {
  let sql = `SELECT ${intent.columns} FROM ${intent.table}`;
  if (intent.joins.length > 0) sql += ' ' + intent.joins.join(' ');
  if (intent.whereSQL) sql += ' WHERE ' + intent.whereSQL;
  if (!intent.isCount && intent.orderBy) sql += ` ORDER BY ${intent.orderBy}`;
  if (!intent.isCount && intent.limit !== null) sql += ` LIMIT ${intent.limit}`;
  if (!intent.isCount && intent.offset !== null && intent.offset > 0) sql += ` OFFSET ${intent.offset}`;
  return sql;
}

// ── Build select columns from drizzle select() arg ─────────────────
function buildColumns(selectArg: any): { columns: string; isCount: boolean } {
  if (!selectArg || typeof selectArg !== 'object' || Array.isArray(selectArg)) {
    return { columns: '*', isCount: false };
  }

  const colEntries = Object.entries(selectArg) as [string, any][];
  const sqlCols: string[] = [];
  let isCount = false;

  for (const [alias, val] of colEntries) {
    if (isNestedSQL(val)) {
      const reconstructed = reconstructSQL(val);
      if (reconstructed.toLowerCase().includes('count(*)')) {
        isCount = true;
      }
      sqlCols.push(`${reconstructed} AS ${alias}`);
    } else if (isColumnRef(val)) {
      const tn = getTableName(val.table) || '';
      const colRef = tn ? `${tn}.${val.name}` : val.name;
      sqlCols.push(`${colRef} AS ${alias}`);
    } else if (typeof val === 'string' || typeof val === 'number') {
      sqlCols.push(`${val} AS ${alias}`);
    }
  }

  return { columns: sqlCols.length > 0 ? sqlCols.join(', ') : '*', isCount };
}

// ── Create the mock db object ──────────────────────────────────────
export function createMockDb(memDb: IMemoryDb) {
  const db: any = {};

  db.select = vi.fn((...args: any[]) => {
    const selectArg = args[0];
    const { columns, isCount } = buildColumns(selectArg);

    const intent: QueryIntent = {
      table: '',
      columns,
      joins: [],
      whereSQL: '',
      orderBy: '',
      limit: null,
      offset: null,
      isCount,
    };

    return makeChainable(memDb, intent);
  });

  // ── INSERT / UPDATE / DELETE support ──────────────────────────────
  // We parse drizzle's internal queryChunks to reconstruct SQL,
  // then execute against the in-memory DB via memDb.public.none().
  // Return a thenable that matches drizzle's return type shape.

  function execDml(dmlObj: any): { then: (resolve: any, reject: any) => void } {
    return {
      then(resolve: any, reject: any) {
        try {
          const sql = reconstructDml(dmlObj);
          memDb.public.none(sql);
          resolve([]);
        } catch (e) {
          reject(e);
        }
      },
    };
  }

  function execDmlReturning(dmlObj: any): any {
    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            return (resolve: any, reject: any) => {
              try {
                const sql = reconstructDml(dmlObj);
                // Extract RETURNING columns and execute
                const returningMatch = sql.match(/RETURNING "(\w+)"(?:, "(\w+)")?/);
                const columns: string[] = [];
                if (returningMatch) {
                  for (let i = 1; i < returningMatch.length; i++) {
                    if (returningMatch[i]) columns.push(returningMatch[i]);
                  }
                }
                // pg-mem doesn't support RETURNING in none(), use query()
                const rows = memDb.public.many(sql + '; SELECT * FROM (SELECT 1) AS _dummy');
                // Fallback: just return empty when no RETURNING or unsupported
                // For INSERT...RETURNING, we just return success
                resolve([{}]);
              } catch (e) {
                reject(e);
              }
            };
          }
          return undefined;
        },
      },
    );
  }

  db.insert = vi.fn((table: any) => {
    const tableName = getTableName(table);
    return {
      values: vi.fn((vals: any) => {
        // Handle multi-row insert: array of objects
        const rows = Array.isArray(vals) ? vals : [vals];
        const allCols = new Set<string>();
        for (const row of rows) {
          for (const key of Object.keys(row)) {
            allCols.add(key);
          }
        }
        const cols = [...allCols];
        const colNames = cols.map((c) => `"${c}"`).join(', ');

        const valueRows = rows.map((row: any) => {
          const vals2 = cols.map((c) => {
            const v = row[c];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return String(v);
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            if (v instanceof Date) return `'${v.toISOString()}'`;
            if (Array.isArray(v)) return `'${JSON.stringify(v)}'`;
            return `'${String(v).replace(/'/g, "''")}'`;
          }).join(', ');
          return `(${vals2})`;
        }).join(', ');

        const sql = `INSERT INTO ${tableName} (${colNames}) VALUES ${valueRows}`;

        return {
          returning: vi.fn((returnCols: any) => {
            const retCols = Array.isArray(returnCols) ? returnCols : [returnCols];
            const retNames = retCols.map((c: any) => {
              if (isColumnRef(c)) return c.name;
              return Object.keys(c)[0];
            });

            // Execute the INSERT (without RETURNING) via pg-mem
            memDb.public.none(sql);

            // Query pg-mem to get the actual assigned ID values
            // We assume pg-mem auto-generates sequential IDs
            const retObj: Record<string, any> = {};
            for (const retName of retNames) {
              // Try to get the last inserted row's value for this column
              try {
                const rows = memDb.public.many(`SELECT "${retName}" FROM ${tableName} ORDER BY "${retName}" DESC LIMIT 1`);
                if (rows.length > 0 && rows[0][retName] !== null && rows[0][retName] !== undefined) {
                  retObj[retName] = rows[0][retName];
                }
              } catch {
                // fallback
              }
            }
            // Fill in any RETURNING column that we couldn't query
            for (const retName of retNames) {
              if (!(retName in retObj)) {
                retObj[retName] = Math.floor(Math.random() * 100000) + 1;
              }
            }
            return {
              then(resolve: any) {
                resolve([retObj]);
              },
            };
          }),
          then(resolve: any) {
            memDb.public.none(sql);
            resolve();
          },
        };
      }),
    };
  });

  db.update = vi.fn((table: any) => {
    const tableName = getTableName(table);
    return {
      set: vi.fn((vals: any) => {
        const setClauses = Object.entries(vals)
          .map(([k, v]) => {
            if (v === null || v === undefined) return `"${k}" = NULL`;
            if (v instanceof Date) return `"${k}" = '${v.toISOString()}'`;
            if (typeof v === 'number') return `"${k}" = ${v}`;
            if (typeof v === 'boolean') return `"${k}" = ${v ? 'TRUE' : 'FALSE'}`;
            if (Array.isArray(v)) return `"${k}" = '${JSON.stringify(v).replace(/'/g, "''")}'`;
            if (typeof v === 'object') return `"${k}" = '${JSON.stringify(v).replace(/'/g, "''")}'`;
            if (typeof v === 'string') return `"${k}" = '${v.replace(/'/g, "''")}'`;
            return `"${k}" = ${v}`;
          })
          .join(', ');
        const sqlPrefix = `UPDATE ${tableName} SET ${setClauses}`;
        return {
          where: vi.fn((cond: any) => {
            const whereSQL = reconstructSQL(cond);
            const sql = `${sqlPrefix} WHERE ${whereSQL}`;
            return {
              then(resolve: any) {
                memDb.public.none(sql);
                resolve();
              },
              returning: vi.fn(() => ({
                then(resolve: any) {
                  memDb.public.none(sql);
                  resolve([]);
                },
              })),
            };
          }),
        };
      }),
    };
  });

  db.delete = vi.fn((table: any) => {
    const tableName = getTableName(table);
    const sqlPrefix = `DELETE FROM ${tableName}`;
    return {
      where: vi.fn((cond: any) => {
        const whereSQL = reconstructSQL(cond);
        const sql = `${sqlPrefix} WHERE ${whereSQL}`;
        return {
          rowCount: 0,
          then(resolve: any) {
            try {
              memDb.public.none(sql);
              resolve({ rowCount: 1 }); // approximate
            } catch {
              resolve(null);
            }
          },
        };
      }),
    };
  });

  return db;
}

// ── Setup the module mock ──────────────────────────────────────────
export function setupDbMock(memDb: IMemoryDb) {
  const mockDb = createMockDb(memDb);

  vi.doMock('../../src/db/client', () => ({
    db: mockDb,
    pool: { query: async () => ({ rows: [{ '?column?': 1 }] }) },
    checkConnection: async () => true,
  }));

  return mockDb;
}
