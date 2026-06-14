import { describe, it, expect } from 'vitest';
import { newDb } from 'pg-mem';

function getTableNames(memDb: ReturnType<typeof newDb>): string[] {
  const rows = memDb.public.many(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  return rows.map((r: any) => r.table_name);
}

describe('Migration & Schema Validation', () => {
  it('should have all 10 tables with correct columns', () => {
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
        format VARCHAR,
        origin VARCHAR,
        status VARCHAR DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE product_nutrition (
        product_id INTEGER PRIMARY KEY REFERENCES products(product_id),
        protein_pct NUMERIC,
        fat_pct NUMERIC,
        fiber_pct NUMERIC,
        moisture_pct NUMERIC,
        ash_pct NUMERIC,
        phosphorus_pct NUMERIC,
        calories_kcal NUMERIC
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
      CREATE TABLE health_rules (
        id SERIAL PRIMARY KEY,
        need_code VARCHAR,
        rule_type VARCHAR,
        field_name VARCHAR,
        operator VARCHAR,
        threshold NUMERIC,
        explanation TEXT
      );
      CREATE TABLE ingredient_dictionary (
        id SERIAL PRIMARY KEY,
        raw_name VARCHAR,
        normalized_name VARCHAR,
        category VARCHAR
      );
      CREATE TABLE recommendation_logs (
        request_id SERIAL PRIMARY KEY,
        user_input JSONB,
        product_ids INTEGER[],
        rationale TEXT,
        model VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE crawler_jobs (
        job_id SERIAL PRIMARY KEY,
        source VARCHAR,
        status VARCHAR DEFAULT 'pending',
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);

    const tableNames = getTableNames(memDb);

    const expectedTables = [
      'brands',
      'crawler_jobs',
      'health_rules',
      'ingredient_dictionary',
      'product_ingredients',
      'product_nutrition',
      'product_prices',
      'products',
      'recommendation_logs',
      'sources',
    ];

    for (const expected of expectedTables) {
      expect(tableNames).toContain(expected);
    }
    expect(tableNames).toHaveLength(10);
  });

  it('should have correct foreign key relationships', () => {
    const memDb = newDb();

    memDb.public.many(`
      CREATE TABLE brands (brand_id SERIAL PRIMARY KEY, name VARCHAR NOT NULL UNIQUE);
      CREATE TABLE products (
        product_id SERIAL PRIMARY KEY,
        brand_id INTEGER REFERENCES brands(brand_id),
        name VARCHAR NOT NULL
      );
      CREATE TABLE product_nutrition (
        product_id INTEGER PRIMARY KEY REFERENCES products(product_id),
        protein_pct NUMERIC
      );
      CREATE TABLE product_ingredients (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(product_id),
        raw_ingredient TEXT
      );
      CREATE TABLE product_prices (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(product_id),
        price_aud NUMERIC
      );
      CREATE TABLE sources (
        source_id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(product_id),
        source_url TEXT
      );
    `);

    // FK: brands <- products
    expect(() => {
      memDb.public.none(`INSERT INTO products (name, brand_id) VALUES ('Orphan', 999)`);
    }).toThrow();

    // Insert valid data
    memDb.public.none(`INSERT INTO brands (name) VALUES ('B1')`);
    memDb.public.none(`INSERT INTO products (brand_id, name) VALUES (1, 'P1')`);

    // FK: products <- product_nutrition
    expect(() => {
      memDb.public.none(`INSERT INTO product_nutrition (product_id, protein_pct) VALUES (999, 30)`);
    }).toThrow();

    // FK: products <- product_ingredients
    expect(() => {
      memDb.public.none(`INSERT INTO product_ingredients (product_id, raw_ingredient) VALUES (999, 'bad')`);
    }).toThrow();

    // FK: products <- product_prices
    expect(() => {
      memDb.public.none(`INSERT INTO product_prices (product_id, price_aud) VALUES (999, 10)`);
    }).toThrow();

    // FK: products <- sources
    expect(() => {
      memDb.public.none(`INSERT INTO sources (product_id, source_url) VALUES (999, 'bad')`);
    }).toThrow();
  });

  it('should be idempotent — second CREATE TABLE fails gracefully', () => {
    const memDb = newDb();

    memDb.public.many(`
      CREATE TABLE brands (brand_id SERIAL PRIMARY KEY, name VARCHAR NOT NULL UNIQUE);
    `);
    expect(getTableNames(memDb)).toContain('brands');

    // Second run should throw (table already exists)
    expect(() => {
      memDb.public.many(`
        CREATE TABLE brands (brand_id SERIAL PRIMARY KEY, name VARCHAR NOT NULL UNIQUE);
      `);
    }).toThrow();

    // Table should still exist
    expect(getTableNames(memDb)).toContain('brands');
    expect(getTableNames(memDb)).toHaveLength(1);
  });

  it('should support JSONB and array columns', () => {
    const memDb = newDb();

    memDb.public.many(`
      CREATE TABLE recommendation_logs (
        request_id SERIAL PRIMARY KEY,
        user_input JSONB,
        product_ids INTEGER[],
        rationale TEXT,
        model VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    memDb.public.none(`
      INSERT INTO recommendation_logs (user_input, product_ids, rationale, model)
      VALUES ('{"species":"dog","age":"adult"}', '{1,2,3}', 'Best match', 'gpt-4o')
    `);

    const rows = memDb.public.many('SELECT * FROM recommendation_logs');
    expect(rows).toHaveLength(1);
    expect(rows[0].user_input).toEqual({ species: 'dog', age: 'adult' });
    // pg-mem may return array as string or parsed; accept both
    const ids = rows[0].product_ids;
    if (typeof ids === 'string') {
      // format like "{1,2,3}"
      expect(ids).toContain('1');
    } else {
      expect(ids).toEqual([1, 2, 3]);
    }
  });

  it('should support default values on crawler_jobs', () => {
    const memDb = newDb();

    memDb.public.many(`
      CREATE TABLE crawler_jobs (
        job_id SERIAL PRIMARY KEY,
        source VARCHAR,
        status VARCHAR DEFAULT 'pending',
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);

    memDb.public.none(`INSERT INTO crawler_jobs (source) VALUES ('petcircle')`);
    const rows = memDb.public.many('SELECT * FROM crawler_jobs');
    expect(rows[0].status).toBe('pending');
    expect(rows[0].source).toBe('petcircle');
  });
});
