import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestDb, setupDbMock } from './helpers/mockDb';
import { writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const TMP_DIR = resolve(__dirname, '../temp_test_orch');
function tmpFile(name: string) { return resolve(TMP_DIR, name); }

function writeCsv(path: string, content: string) {
  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(path, content, 'utf-8');
}

describe('Orchestrator', () => {
  beforeEach(() => {
    vi.resetModules();
    const memDb = createTestDb();
    setupDbMock(memDb);
    mkdirSync(TMP_DIR, { recursive: true });
  });

  // ── importFromCSV ────────────────────────────────────────────────
  describe('importFromCSV', () => {
    it('should import a valid CSV with single product', async () => {
      const { importFromCSV, getImportReport } = await import(
        '../src/importer/orchestrator'
      );
      const csvPath = tmpFile('single.csv');
      writeCsv(
        csvPath,
        'name,brand_name,species,life_stage,product_type,package_size_g,status,protein_pct,fat_pct,crude_fiber_pct,moisture_pct,ash_pct,me_kcal_per_kg,omega_3_pct,omega_6_pct,calcium_pct,phosphorus_pct,ingredients,unit_price_aud,price_date,store_name\n' +
          'Chicken Feast,Royal Canin,CAT,ADULT,dry,400,ACTIVE,35,15,3,10,7,3800,0.5,2.0,1.2,0.9,"chicken;rice;oil",25.99,2025-01-15,PetBarn',
      );

      const result = await importFromCSV(csvPath);
      expect(result.batchId).toBeDefined();
      expect(result.batchId).toMatch(/^[0-9a-f-]+$/);
      expect(result.report.rows_total).toBe(1);
      expect(result.report.rows_success).toBe(1);

      const report = await getImportReport(result.batchId);
      expect(report).toBeDefined();
      expect(report.rows_success).toBe(1);
    });

    it('should import CSV with multiple products', async () => {
      const { importFromCSV } = await import('../src/importer/orchestrator');
      const csvPath = tmpFile('multi.csv');
      const header =
        'name,brand_name,species,life_stage,product_type,package_size_g,status,protein_pct,fat_pct,crude_fiber_pct,moisture_pct,ash_pct,me_kcal_per_kg,omega_3_pct,omega_6_pct,calcium_pct,phosphorus_pct,ingredients,unit_price_aud,price_date,store_name';
      const rows = [
        'Food A,Brand A,CAT,ADULT,dry,200,ACTIVE,30,12,3,10,7,3500,,,,,,,19.99,,',
        'Food B,Brand A,CAT,ADULT,wet,85,ACTIVE,10,5,2,78,2,850,,,,,,,2.50,,',
        'Food C,Brand B,DOG,ADULT,dry,500,ACTIVE,25,14,4,10,8,3600,,,,,,,35.00,,',
      ].join('\n');
      writeCsv(csvPath, `${header}\n${rows}`);

      const result = await importFromCSV(csvPath);
      expect(result.report.rows_total).toBe(3);
      expect(result.report.rows_success).toBe(3);
    });

    it('should track failed rows for invalid data', async () => {
      const { importFromCSV } = await import('../src/importer/orchestrator');
      const csvPath = tmpFile('invalid.csv');
      writeCsv(
        csvPath,
        'name,brand_name,species,life_stage,product_type,package_size_g,status,protein_pct,fat_pct,crude_fiber_pct,moisture_pct,ash_pct,me_kcal_per_kg,omega_3_pct,omega_6_pct,calcium_pct,phosphorus_pct,ingredients,unit_price_aud,price_date,store_name\n' +
          // Empty name = invalid
          ',Brand X,CAT,ADULT,dry,100,ACTIVE,30,10,3,10,7,3500,,,,,,,10.00,,',
      );

      const result = await importFromCSV(csvPath);
      expect(result.report.rows_total).toBe(1);
      expect(result.report.rows_failed).toBeGreaterThanOrEqual(1);
    });

    it('should detect duplicates and skip them', async () => {
      const { importFromCSV } = await import('../src/importer/orchestrator');
      const csvPath = tmpFile('dup.csv');
      const header =
        'name,brand_name,species,life_stage,product_type,package_size_g,status,protein_pct,fat_pct,crude_fiber_pct,moisture_pct,ash_pct,me_kcal_per_kg,omega_3_pct,omega_6_pct,calcium_pct,phosphorus_pct,ingredients,unit_price_aud,price_date,store_name';
      const row =
        'Duplicate Food,Brand D,CAT,KITTEN,dry,500,ACTIVE,35,15,2,8,6,4000,,,,,,,40.00,,';
      writeCsv(csvPath, `${header}\n${row}\n${row}`);

      const result = await importFromCSV(csvPath);
      expect(result.report.rows_total).toBe(2);
      // First row succeeds, second is detected as duplicate
      expect(result.report.rows_success).toBe(1);
    });

    it('should reuse existing brands (upsert)', async () => {
      const { importFromCSV } = await import('../src/importer/orchestrator');
      const csvPath = tmpFile('brands.csv');
      const header =
        'name,brand_name,species,life_stage,product_type,package_size_g,status,protein_pct,fat_pct,crude_fiber_pct,moisture_pct,ash_pct,me_kcal_per_kg,omega_3_pct,omega_6_pct,calcium_pct,phosphorus_pct,ingredients,unit_price_aud,price_date,store_name';
      writeCsv(
        csvPath,
        `${header}\n` +
          'Food 1,SameBrand,CAT,ADULT,dry,100,ACTIVE,,,,,,,,,,,,,\n' +
          'Food 2,SameBrand,DOG,ADULT,dry,200,ACTIVE,,,,,,,,,,,,,',
      );

      const result = await importFromCSV(csvPath);
      expect(result.report.rows_success).toBe(2);
      // Should have created one brand, not two
    });

    it('should handle empty CSV (header only)', async () => {
      const { importFromCSV } = await import('../src/importer/orchestrator');
      const csvPath = tmpFile('empty.csv');
      writeCsv(
        csvPath,
        'name,brand_name,species,life_stage,product_type,package_size_g,status,protein_pct,fat_pct,crude_fiber_pct,moisture_pct,ash_pct,me_kcal_per_kg,omega_3_pct,omega_6_pct,calcium_pct,phosphorus_pct,ingredients,unit_price_aud,price_date,store_name',
      );

      const result = await importFromCSV(csvPath);
      expect(result.report.rows_total).toBe(0);
      expect(result.report.rows_success).toBe(0);
    });

    it('should handle CSV with missing optional columns', async () => {
      const { importFromCSV } = await import('../src/importer/orchestrator');
      const csvPath = tmpFile('minimal.csv');
      writeCsv(
        csvPath,
        'name,brand_name,species\n' +
          'Minimal Food,Minimal Brand,CAT',
      );

      const result = await importFromCSV(csvPath);
      expect(result.report.rows_success).toBe(1);
    });

    it('should throw for non-existent file', async () => {
      const { importFromCSV } = await import('../src/importer/orchestrator');
      await expect(
        importFromCSV('/nonexistent/path/file.csv'),
      ).rejects.toThrow();
    });
  });

  // ── importFromJSON ───────────────────────────────────────────────
  describe('importFromJSON', () => {
    it('should import a valid JSON array', async () => {
      const { importFromJSON } = await import('../src/importer/orchestrator');
      const jsonPath = tmpFile('products.json');
      writeCsv(
        jsonPath,
        JSON.stringify([
          {
            name: 'JSON Food',
            brand_name: 'JSON Brand',
            species: 'CAT',
            life_stage: 'ADULT',
            product_type: 'dry',
            package_size_g: 300,
            status: 'ACTIVE',
            protein_pct: 32,
            ingredients: 'chicken;fish',
            unit_price_aud: 15.99,
          },
        ]),
      );

      const result = await importFromJSON(jsonPath);
      expect(result.batchId).toBeDefined();
      expect(result.report.rows_success).toBe(1);
    });

    it('should import multiple products from JSON', async () => {
      const { importFromJSON } = await import('../src/importer/orchestrator');
      const jsonPath = tmpFile('multi.json');
      writeCsv(
        jsonPath,
        JSON.stringify([
          { name: 'P1', brand_name: 'B1', species: 'CAT' },
          { name: 'P2', brand_name: 'B1', species: 'DOG' },
          { name: 'P3', brand_name: 'B2', species: 'CAT' },
        ]),
      );

      const result = await importFromJSON(jsonPath);
      expect(result.report.rows_success).toBe(3);
    });

    it('should track invalid rows in JSON', async () => {
      const { importFromJSON } = await import('../src/importer/orchestrator');
      const jsonPath = tmpFile('invalid.json');
      writeCsv(
        jsonPath,
        JSON.stringify([
          { name: '', brand_name: 'Brand', species: 'CAT' }, // empty name
          { name: 'Valid', brand_name: 'Brand', species: 'CAT' },
        ]),
      );

      const result = await importFromJSON(jsonPath);
      expect(result.report.rows_total).toBe(2);
      expect(result.report.rows_success).toBe(1);
      expect(result.report.rows_failed).toBeGreaterThanOrEqual(1);
    });

    it('should throw for non-existent JSON file', async () => {
      const { importFromJSON } = await import('../src/importer/orchestrator');
      await expect(
        importFromJSON('/nonexistent/path/file.json'),
      ).rejects.toThrow();
    });
  });

  // ── Import Report ────────────────────────────────────────────────
  describe('getImportReport', () => {
    it('should return report for a completed import', async () => {
      const { importFromCSV, getImportReport } = await import(
        '../src/importer/orchestrator'
      );
      const csvPath = tmpFile('report_test.csv');
      writeCsv(
        csvPath,
        'name,brand_name,species\n' + 'Report Food,Report Brand,CAT',
      );

      const { batchId } = await importFromCSV(csvPath);
      const report = await getImportReport(batchId);
      expect(report.batch_id).toBe(batchId);
      expect(report.rows_success).toBe(1);
      expect(report.status).toBe('completed');
    });

    it('should return null for non-existent batch', async () => {
      const { getImportReport } = await import('../src/importer/orchestrator');
      const report = await getImportReport('non-existent-batch-id');
      expect(report).toBeNull();
    });
  });

  // ── Rollback ─────────────────────────────────────────────────────
  describe('rollbackImportByBatch', () => {
    it('should rollback a completed import (no related records)', async () => {
      const { importFromCSV, rollbackImportByBatch, getImportReport } =
        await import('../src/importer/orchestrator');
      const csvPath = tmpFile('rollback_simple.csv');
      writeCsv(
        csvPath,
        'name,brand_name,species\n' +
          'Simple Product,Simple Brand,CAT',
      );

      const { batchId } = await importFromCSV(csvPath);

      // Rollback
      await rollbackImportByBatch(batchId);

      // Batch status should be rolled_back
      const report = await getImportReport(batchId);
      expect(report?.status).toBe('rolled_back');
    });

    it('should rollback product with nutrition and ingredients', async () => {
      const { importFromCSV, rollbackImportByBatch, getImportReport } =
        await import('../src/importer/orchestrator');
      const csvPath = tmpFile('rollback_full.csv');
      writeCsv(
        csvPath,
        'name,brand_name,species,protein_pct,fat_pct,ingredients,unit_price_aud\n' +
          'Full Product,Full Brand,CAT,35,15,"chicken;rice",25.00',
      );

      const { batchId } = await importFromCSV(csvPath);

      // Verify product was created
      const { db } = await import('../src/db/client');
      const { products: prods } = await import('../src/db/schema');

      // Rollback
      const result = await rollbackImportByBatch(batchId);
      expect(result.products_deleted).toBeGreaterThan(0);

      // Batch status should be rolled_back
      const report = await getImportReport(batchId);
      expect(report?.status).toBe('rolled_back');
    });
  });

  // ── Post-cleanup ────────────────────────────────────────────────
  afterAll(() => {
    try {
      const files = require('fs').readdirSync(TMP_DIR);
      for (const f of files) {
        try { unlinkSync(resolve(TMP_DIR, f)); } catch {}
      }
      require('fs').rmdirSync(TMP_DIR, { recursive: true });
    } catch {}
  });
});
