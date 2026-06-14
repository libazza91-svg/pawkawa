import * as fs from 'fs';
import { ProductImportRow } from './validation';

export interface JsonImportResult {
  rows: Record<string, string>[];
  rowCount: number;
}

// ── Parse JSON array file ──────────────────────────────────────────
// Compatible with OPFF API raw format: expects JSON array of objects
export function parseJsonFile(filePath: string): JsonImportResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error('JSON file must contain an array of objects');
  }

  // Normalize all values to strings for uniform validation
  const normalized = parsed.map((obj: Record<string, unknown>) => {
    const row: Record<string, string> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val === null || val === undefined) {
        row[key] = '';
      } else if (typeof val === 'object') {
        row[key] = JSON.stringify(val);
      } else {
        row[key] = String(val).trim();
      }
    }
    return row;
  });

  return { rows: normalized, rowCount: normalized.length };
}
