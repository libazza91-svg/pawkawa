import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { ProductImportRow } from './validation';

// ── CSV column header mapping (snake_case CSV header → internal field name) ──
// The CSV headers are the canonical column names (already snake_case).
// We just need to return them as-is keyed objects.

export interface CsvImportResult {
  rows: Record<string, string>[];
  rowCount: number;
}

// ── Parse CSV file ─────────────────────────────────────────────────
export function parseCsvFile(filePath: string): CsvImportResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records: Record<string, string>[] = parse(content, {
    columns: true, // Use first row as header
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  // Normalize: convert empty strings to undefined for downstream validation
  const normalized = records.map((row: Record<string, string>) => {
    const obj: Record<string, string> = {};
    for (const key of Object.keys(row)) {
      obj[key] = row[key]?.trim() ?? '';
    }
    return obj;
  });

  return { rows: normalized, rowCount: normalized.length };
}
