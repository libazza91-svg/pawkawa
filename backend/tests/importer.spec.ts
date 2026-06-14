import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateImportRows, productImportRowSchema, ProductImportRow } from '../src/importer/validation';

describe('Import Validation', () => {
  describe('productImportRowSchema', () => {
    it('should validate a complete valid row', () => {
      const row = {
        name: 'Royal Canin Kitten',
        brand_name: 'Royal Canin',
        species: 'CAT',
        life_stage: 'KITTEN',
        product_type: 'Dry Food',
        package_size_g: '400',
        status: 'ACTIVE',
        protein_pct: '34',
        fat_pct: '20',
        crude_fiber_pct: '5.5',
        moisture_pct: '6.5',
        ash_pct: '7.5',
        me_kcal_per_kg: '4000',
        omega_3_pct: '0.8',
        omega_6_pct: '3.2',
        calcium_pct: '1.0',
        phosphorus_pct: '0.9',
        ingredients: 'Chicken; Rice; Oil',
        unit_price_aud: '28.99',
        price_date: '2026-05-01',
        store_name: 'Pet Circle',
      };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Royal Canin Kitten');
        expect(result.data.species).toBe('CAT');
        expect(result.data.protein_pct).toBe(34);
        expect(result.data.package_size_g).toBe(400);
      }
    });

    it('should accept row with only required fields', () => {
      const row = { name: 'Test Food', brand_name: 'Test Brand' };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(true);
    });

    it('should fail without name', () => {
      const row = { brand_name: 'Test Brand' };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should fail without brand_name', () => {
      const row = { name: 'Test Food' };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should auto-uppercase species', () => {
      const row = { name: 'Test', brand_name: 'Test', species: 'cat' };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.species).toBe('CAT');
    });

    it('should reject invalid species enum', () => {
      const row = { name: 'Test', brand_name: 'Test', species: 'BIRD' };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should reject invalid life_stage enum', () => {
      const row = { name: 'Test', brand_name: 'Test', life_stage: 'BABY' };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status enum', () => {
      const row = { name: 'Test', brand_name: 'Test', status: 'UNKNOWN' };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should accept undefined optional fields', () => {
      const row = { name: 'Test', brand_name: 'Test' };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.protein_pct).toBeUndefined();
        expect(result.data.ingredients).toBeUndefined();
      }
    });

    it('should parse decimal nutrition values', () => {
      const row = {
        name: 'Test',
        brand_name: 'Test',
        protein_pct: '35.5',
        fat_pct: '18.2',
        moisture_pct: '8.0',
      };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.protein_pct).toBe(35.5);
        expect(result.data.fat_pct).toBe(18.2);
      }
    });
  });

  describe('validateImportRows', () => {
    it('should return valid rows and no invalid for good data', () => {
      const rows = [
        { name: 'Product A', brand_name: 'Brand A' },
        { name: 'Product B', brand_name: 'Brand B', species: 'DOG' },
        { name: 'Product C', brand_name: 'Brand C', life_stage: 'ADULT' },
      ];
      const result = validateImportRows(rows);
      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
    });

    it('should separate valid and invalid rows', () => {
      const rows = [
        { name: 'Product A', brand_name: 'Brand A' },
        { name: '', brand_name: 'Brand B' },                    // invalid: empty name
        { name: 'Product C', brand_name: '' },                   // invalid: empty brand
        { name: 'Product D', brand_name: 'Brand D', species: 'BIRD' }, // invalid enum
      ];
      const result = validateImportRows(rows);
      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(3);
    });

    it('should report row numbers (1-based) for invalid rows', () => {
      const rows = [
        { name: 'A', brand_name: 'B' },
        { name: '', brand_name: 'B' },      // row 2
        { name: 'C', brand_name: '' },       // row 3
      ];
      const result = validateImportRows(rows);
      expect(result.invalid[0].row).toBe(2);
      expect(result.invalid[1].row).toBe(3);
    });

    it('should include reason in invalid entries', () => {
      const rows = [{ name: '', brand_name: 'B' }];
      const result = validateImportRows(rows);
      expect(result.invalid[0].reason).toContain('name');
    });

    it('should include raw row data in invalid entries', () => {
      const rows = [{ name: '', brand_name: 'Test Brand' }];
      const result = validateImportRows(rows);
      expect(result.invalid[0].raw).toEqual({ name: '', brand_name: 'Test Brand' });
    });

    it('should handle empty rows array', () => {
      const result = validateImportRows([]);
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });

    it('should handle rows with extra unknown fields gracefully', () => {
      const rows = [{ name: 'Test', brand_name: 'Test', unknown_field: 'ignored' }];
      const result = validateImportRows(rows);
      expect(result.valid).toHaveLength(1);
    });

    it('should validate all life_stage values', () => {
      const stages = ['KITTEN', 'ADULT', 'SENIOR', 'PUPPY', 'ALL_LIFE_STAGES'];
      for (const stage of stages) {
        const row = { name: 'Test', brand_name: 'Test', life_stage: stage };
        const result = productImportRowSchema.safeParse(row);
        expect(result.success).toBe(true);
      }
    });

    it('should validate DOG species', () => {
      const row = { name: 'Test', brand_name: 'Test', species: 'dog' };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.species).toBe('DOG');
    });

    it('should handle numeric fields as empty strings', () => {
      const row = { name: 'Test', brand_name: 'Test', protein_pct: '' };
      const result = productImportRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.protein_pct).toBeUndefined();
    });
  });
});

// ── CSV Importer Tests ─────────────────────────────────────────────
import { parseCsvFile } from '../src/importer/csvImporter';
import { parseJsonFile } from '../src/importer/jsonImporter';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CSV Importer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pfc-test-'));
  });

  it('should parse a CSV file with headers', () => {
    const filePath = path.join(tempDir, 'test.csv');
    fs.writeFileSync(filePath, 'name,brand_name,species\nRoyal Canin Kitten,Royal Canin,CAT\nHill\'s Adult,Hill\'s,DOG\n');

    const result = parseCsvFile(filePath);
    expect(result.rowCount).toBe(2);
    expect(result.rows[0].name).toBe('Royal Canin Kitten');
    expect(result.rows[0].brand_name).toBe('Royal Canin');
    expect(result.rows[0].species).toBe('CAT');
    expect(result.rows[1].name).toBe("Hill's Adult");
  });

  it('should trim whitespace from values', () => {
    const filePath = path.join(tempDir, 'test.csv');
    fs.writeFileSync(filePath, 'name,brand_name\n  Test Food  ,  Test Brand  \n');

    const result = parseCsvFile(filePath);
    expect(result.rows[0].name).toBe('Test Food');
    expect(result.rows[0].brand_name).toBe('Test Brand');
  });

  it('should skip empty lines', () => {
    const filePath = path.join(tempDir, 'test.csv');
    fs.writeFileSync(filePath, 'name,brand_name\n\nTest Food,Test Brand\n\n');

    const result = parseCsvFile(filePath);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].name).toBe('Test Food');
  });

  it('should handle empty CSV (only header)', () => {
    const filePath = path.join(tempDir, 'test.csv');
    fs.writeFileSync(filePath, 'name,brand_name,species\n');

    const result = parseCsvFile(filePath);
    expect(result.rowCount).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it('should handle all nutrition and price columns', () => {
    const filePath = path.join(tempDir, 'test.csv');
    fs.writeFileSync(
      filePath,
      'name,brand_name,species,life_stage,product_type,package_size_g,status,protein_pct,fat_pct,crude_fiber_pct,moisture_pct,ash_pct,me_kcal_per_kg,omega_3_pct,omega_6_pct,calcium_pct,phosphorus_pct,ingredients,unit_price_aud,price_date,store_name\n' +
      'Premium Cat,Royal Canin,CAT,ADULT,Dry Food,400,ACTIVE,34,20,5.5,6.5,7.5,4000,0.8,3.2,1.0,0.9,"Chicken;Rice;Oil",28.99,2026-05-01,Pet Circle\n',
    );

    const result = parseCsvFile(filePath);
    expect(result.rowCount).toBe(1);
    const row = result.rows[0];
    expect(row.package_size_g).toBe('400');
    expect(row.protein_pct).toBe('34');
    expect(row.ingredients).toBe('Chicken;Rice;Oil');
    expect(row.unit_price_aud).toBe('28.99');
    expect(row.store_name).toBe('Pet Circle');
  });

  it('should handle quoted fields with commas', () => {
    const filePath = path.join(tempDir, 'test.csv');
    fs.writeFileSync(filePath, 'name,brand_name,ingredients\n"Royal Canin, Kitten","Royal Canin","Chicken, Rice, Oil"\n');

    const result = parseCsvFile(filePath);
    expect(result.rows[0].name).toBe('Royal Canin, Kitten');
    expect(result.rows[0].ingredients).toBe('Chicken, Rice, Oil');
  });
});

describe('JSON Importer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pfc-test-'));
  });

  it('should parse a JSON array', () => {
    const filePath = path.join(tempDir, 'test.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify([
        { name: 'Test Food', brand_name: 'Test Brand', species: 'CAT' },
        { name: 'Another', brand_name: 'Brand 2', species: 'DOG' },
      ]),
    );

    const result = parseJsonFile(filePath);
    expect(result.rowCount).toBe(2);
    expect(result.rows[0].name).toBe('Test Food');
    expect(result.rows[1].brand_name).toBe('Brand 2');
  });

  it('should convert null/undefined to empty strings', () => {
    const filePath = path.join(tempDir, 'test.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify([{ name: 'Test', brand_name: null, extra: null }]),
    );

    const result = parseJsonFile(filePath);
    expect(result.rows[0].brand_name).toBe('');
    expect(result.rows[0].extra).toBe('');
    // Missing keys are not in the normalized row (undefined), handled by Zod as missing
    expect(result.rows[0].species).toBeUndefined();
  });

  it('should convert object values to JSON strings', () => {
    const filePath = path.join(tempDir, 'test.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify([{ name: 'Test', brand_name: 'Brand', meta: { key: 'val' } }]),
    );

    const result = parseJsonFile(filePath);
    expect(result.rows[0].meta).toBe('{"key":"val"}');
  });

  it('should throw for non-array JSON', () => {
    const filePath = path.join(tempDir, 'test.json');
    fs.writeFileSync(filePath, JSON.stringify({ not_an_array: true }));

    expect(() => parseJsonFile(filePath)).toThrow('JSON file must contain an array of objects');
  });

  it('should handle empty JSON array', () => {
    const filePath = path.join(tempDir, 'test.json');
    fs.writeFileSync(filePath, '[]');

    const result = parseJsonFile(filePath);
    expect(result.rowCount).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it('should parse OPFF-like raw format', () => {
    const filePath = path.join(tempDir, 'test.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify([
        {
          product_name: 'ACANA Cat Food',
          brands: 'ACANA',
          categories_tags: ['cat-food'],
          nutriments: { proteins_100g: 37, fat_100g: 18 },
          ingredients: [{ text: 'Chicken' }, { text: 'Rice' }],
        },
      ]),
    );

    const result = parseJsonFile(filePath);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].product_name).toBe('ACANA Cat Food');
    expect(result.rows[0].nutriments).toContain('proteins_100g');
  });
});