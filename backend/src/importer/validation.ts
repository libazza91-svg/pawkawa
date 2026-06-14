import { z } from 'zod';
import { Species, LifeStage, ProductStatus, SourceType } from '../validation/enums';

// ── Product import row schema ──────────────────────────────────────
// All fields nullable except name + brand_name
const decimalStr = (name: string) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v.trim() === '') return undefined;
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    })
    .pipe(z.number().optional());

const intStr = (name: string) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v.trim() === '') return undefined;
      const n = parseInt(v, 10);
      return isNaN(n) ? undefined : n;
    })
    .pipe(z.number().int().optional());

export const productImportRowSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  brand_name: z.string().min(1, 'Brand name is required'),
  species: z
    .string()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined))
    .pipe(z.enum(Species).optional()),
  life_stage: z
    .string()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined))
    .pipe(z.enum(LifeStage).optional()),
  product_type: z.string().optional(),
  package_size_g: intStr('package_size_g'),
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined))
    .pipe(z.enum(ProductStatus).optional()),
  // Nutrition fields
  protein_pct: decimalStr('protein_pct'),
  fat_pct: decimalStr('fat_pct'),
  crude_fiber_pct: decimalStr('crude_fiber_pct'),
  moisture_pct: decimalStr('moisture_pct'),
  ash_pct: decimalStr('ash_pct'),
  me_kcal_per_kg: decimalStr('me_kcal_per_kg'),
  omega_3_pct: decimalStr('omega_3_pct'),
  omega_6_pct: decimalStr('omega_6_pct'),
  calcium_pct: decimalStr('calcium_pct'),
  phosphorus_pct: decimalStr('phosphorus_pct'),
  // Ingredient field (semicolon-separated, parsed separately)
  ingredients: z.string().optional(),
  // Price fields
  unit_price_aud: decimalStr('unit_price_aud'),
  price_date: z.string().optional(),
  store_name: z.string().optional(),
});

export type ProductImportRow = z.infer<typeof productImportRowSchema>;

// ── Validation result ──────────────────────────────────────────────
export interface ValidationError {
  row: number; // 1-based row number
  reason: string;
  raw: Record<string, unknown>;
}

export interface ValidationResult {
  valid: ProductImportRow[];
  invalid: ValidationError[];
}

// ── Validate rows ──────────────────────────────────────────────────
export function validateImportRows(
  rows: Record<string, string>[],
): ValidationResult {
  const valid: ProductImportRow[] = [];
  const invalid: ValidationError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const result = productImportRowSchema.safeParse(rows[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      const issues = result.error.issues;
      const reason = issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      invalid.push({
        row: i + 1,
        reason,
        raw: rows[i] as Record<string, unknown>,
      });
    }
  }

  return { valid, invalid };
}
