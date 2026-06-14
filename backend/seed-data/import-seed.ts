#!/usr/bin/env node
/**
 * Seed Data Import Script
 * 
 * 用法: cd backend && npx tsx seed-data/import-seed.ts
 * 
 * 要求:
 * - PostgreSQL 运行中 (localhost:5432, DB: petfoodcompare)
 * - Node.js >= 18
 * - npm install 已完成
 * 
 * 导入: 1 combined CSV → 5 Brands / 20 Products / 120 Ingredients / 20 Prices / 20 Nutrition
 */

import { importFromCSV, getImportReport } from '../src/importer/orchestrator';
import * as path from 'path';
import * as fs from 'fs';

const SEED_DATA_DIR = __dirname;
const CSV_FILE = path.join(SEED_DATA_DIR, 'products.csv');

async function main() {
  console.log('=== PetFoodCompare Seed Data Import ===\n');
  
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`ERROR: CSV file not found: ${CSV_FILE}`);
    process.exit(1);
  }

  console.log(`Source: ${CSV_FILE}`);
  console.log(`File size: ${(fs.statSync(CSV_FILE).size / 1024).toFixed(1)} KB\n`);
  
  try {
    console.log('Importing...');
    const result = await importFromCSV(CSV_FILE);
    
    console.log(`\nBatch ID: ${result.batchId}`);
    console.log(`Status:   ${result.report.status}`);
    console.log(`Success:  ${result.report.rows_success}`);
    console.log(`Failed:   ${result.report.rows_failed}`);
    console.log(`Total:    ${result.report.rows_total}`);
    
    if (result.report.failed_details && result.report.failed_details.length > 0) {
      console.log('\nFailed rows:');
      for (const detail of result.report.failed_details) {
        console.log(`  Row ${detail.row}: ${detail.reason}`);
      }
    }
    
    console.log('\n=== Import Complete ===');
    console.log(`\n验证: GET http://localhost:3001/api/products`);
    console.log(`数据质量: GET http://localhost:3001/api/metrics/data-quality`);
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
}

main();
