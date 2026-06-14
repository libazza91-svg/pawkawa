import { describe, it, expect, beforeEach } from 'vitest';
import { newDb } from 'pg-mem';

function createSchema(memDb: ReturnType<typeof newDb>) {
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
  `);
}

describe('CRUD Operations', () => {
  let memDb: ReturnType<typeof newDb>;

  beforeEach(() => {
    memDb = newDb();
    createSchema(memDb);
  });

  describe('brands table', () => {
    it('should INSERT a brand', () => {
      memDb.public.none(
        `INSERT INTO brands (name, country, official_url) VALUES ('Acme Pet Food', 'AU', 'https://acme.example.com')`
      );
      const rows = memDb.public.many('SELECT * FROM brands');
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Acme Pet Food');
      expect(rows[0].country).toBe('AU');
      expect(rows[0].brand_id).toBeGreaterThan(0);
    });

    it('should SELECT all brands', () => {
      memDb.public.none(`INSERT INTO brands (name) VALUES ('B1')`);
      memDb.public.none(`INSERT INTO brands (name) VALUES ('B2')`);
      const rows = memDb.public.many('SELECT * FROM brands');
      expect(rows).toHaveLength(2);
    });

    it('should UPDATE a brand', () => {
      memDb.public.none(`INSERT INTO brands (name) VALUES ('Old Name')`);
      memDb.public.none(`UPDATE brands SET name = 'New Name', country = 'NZ' WHERE name = 'Old Name'`);
      const rows = memDb.public.many('SELECT * FROM brands');
      expect(rows[0].name).toBe('New Name');
      expect(rows[0].country).toBe('NZ');
    });

    it('should DELETE a brand', () => {
      memDb.public.none(`INSERT INTO brands (name) VALUES ('ToDelete')`);
      memDb.public.none(`DELETE FROM brands WHERE name = 'ToDelete'`);
      const rows = memDb.public.many('SELECT * FROM brands');
      expect(rows).toHaveLength(0);
    });

    it('should enforce UNIQUE constraint on name', () => {
      memDb.public.none(`INSERT INTO brands (name) VALUES ('UniqueBrand')`);
      expect(() => {
        memDb.public.none(`INSERT INTO brands (name) VALUES ('UniqueBrand')`);
      }).toThrow();
    });
  });

  describe('products and related tables', () => {
    beforeEach(() => {
      memDb.public.none(`INSERT INTO brands (name) VALUES ('TestBrand')`);
    });

    it('should INSERT a product with FK to brand', () => {
      memDb.public.none(
        `INSERT INTO products (brand_id, name, species) VALUES (1, 'Premium Kibble', 'dog')`
      );
      const rows = memDb.public.many('SELECT * FROM products');
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Premium Kibble');
      expect(rows[0].brand_id).toBe(1);
    });

    it('should INSERT product nutrition data', () => {
      memDb.public.none(`INSERT INTO products (brand_id, name) VALUES (1, 'Food1')`);
      memDb.public.none(
        `INSERT INTO product_nutrition (product_id, protein_pct, fat_pct, calories_kcal) VALUES (1, 32.5, 18.2, 3800)`
      );
      const rows = memDb.public.many('SELECT * FROM product_nutrition');
      expect(rows).toHaveLength(1);
      expect(rows[0].protein_pct).toBe(32.5);
      expect(rows[0].fat_pct).toBe(18.2);
    });

    it('should INSERT product ingredients', () => {
      memDb.public.none(`INSERT INTO products (brand_id, name) VALUES (1, 'Food1')`);
      memDb.public.none(
        `INSERT INTO product_ingredients (product_id, raw_ingredient, ingredient_order, category) VALUES (1, 'Chicken Meal', 1, 'protein')`
      );
      memDb.public.none(
        `INSERT INTO product_ingredients (product_id, raw_ingredient, ingredient_order, category) VALUES (1, 'Brown Rice', 2, 'grain')`
      );
      const rows = memDb.public.many('SELECT * FROM product_ingredients ORDER BY ingredient_order');
      expect(rows).toHaveLength(2);
      expect(rows[0].raw_ingredient).toBe('Chicken Meal');
      expect(rows[1].raw_ingredient).toBe('Brown Rice');
    });

    it('should INSERT product prices', () => {
      memDb.public.none(`INSERT INTO products (brand_id, name) VALUES (1, 'Food1')`);
      memDb.public.none(
        `INSERT INTO product_prices (product_id, retailer, price_aud, pack_size, unit_price_aud_per_kg) VALUES (1, 'PetCircle', 89.99, 11.4, 7.89)`
      );
      const rows = memDb.public.many('SELECT * FROM product_prices');
      expect(rows).toHaveLength(1);
      expect(rows[0].retailer).toBe('PetCircle');
      expect(rows[0].price_aud).toBe(89.99);
    });

    it('should INSERT sources', () => {
      memDb.public.none(`INSERT INTO products (brand_id, name) VALUES (1, 'Food1')`);
      memDb.public.none(
        `INSERT INTO sources (product_id, source_url, source_type) VALUES (1, 'https://example.com', 'manufacturer')`
      );
      const rows = memDb.public.many('SELECT * FROM sources');
      expect(rows).toHaveLength(1);
      expect(rows[0].source_type).toBe('manufacturer');
    });
  });

  describe('foreign key constraints', () => {
    it('should prevent inserting orphan product', () => {
      expect(() => {
        memDb.public.none(`INSERT INTO products (name, brand_id) VALUES ('Orphan', 999)`);
      }).toThrow();
    });

    it('should prevent deleting brand with products', () => {
      memDb.public.none(`INSERT INTO brands (name) VALUES ('ParentBrand')`);
      memDb.public.none(`INSERT INTO products (brand_id, name, species) VALUES (1, 'Child', 'dog')`);
      expect(() => {
        memDb.public.none(`DELETE FROM brands WHERE brand_id = 1`);
      }).toThrow();
    });

    it('should allow deleting brand after removing products', () => {
      memDb.public.none(`INSERT INTO brands (name) VALUES ('ParentBrand')`);
      memDb.public.none(`INSERT INTO products (brand_id, name, species) VALUES (1, 'Child', 'dog')`);
      memDb.public.none(`DELETE FROM products WHERE product_id = 1`);
      memDb.public.none(`DELETE FROM brands WHERE brand_id = 1`);
      const rows = memDb.public.many('SELECT * FROM brands');
      expect(rows).toHaveLength(0);
    });

    it('should prevent inserting nutrition for non-existent product', () => {
      expect(() => {
        memDb.public.none(`INSERT INTO product_nutrition (product_id, protein_pct) VALUES (999, 30)`);
      }).toThrow();
    });
  });

  describe('default values', () => {
    it('should use DEFAULT for status column', () => {
      memDb.public.none(`INSERT INTO brands (name) VALUES ('DefaultTest')`);
      memDb.public.none(`INSERT INTO products (brand_id, name) VALUES (1, 'WithDefaults')`);
      const rows = memDb.public.many('SELECT * FROM products');
      expect(rows[0].status).toBe('active');
    });

    it('should auto-set created_at timestamp', () => {
      memDb.public.none(`INSERT INTO brands (name) VALUES ('TimestampTest')`);
      const rows = memDb.public.many('SELECT * FROM brands');
      expect(rows[0].created_at).toBeDefined();
      expect(rows[0].created_at).toBeInstanceOf(Date);
    });
  });
});
