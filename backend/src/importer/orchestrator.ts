import { db } from '../db/client';
import {
  products,
  brands,
  productNutrition,
  productIngredients,
  productPrices,
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { parseCsvFile } from './csvImporter';
import { parseJsonFile } from './jsonImporter';
import { validateImportRows, ProductImportRow } from './validation';
import { createBatch, finalizeBatch, getBatchReport } from './logger';
import { rollbackImport } from './rollback';
import { calcConfidenceScore, calcVerificationStatus } from '../connectors/confidence';

// ── Upsert a brand (find or create) ────────────────────────────────
async function upsertBrand(
  brandName: string,
): Promise<number> {
  const existing = await db
    .select({ brand_id: brands.brand_id })
    .from(brands)
    .where(eq(brands.name, brandName))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].brand_id;
  }

  const inserted = await db.insert(brands).values({ name: brandName }).returning({
    brand_id: brands.brand_id,
  });
  return inserted[0].brand_id;
}

// ── Dedup: check if product already exists by name + brand_id + package_size_g ──
async function findExistingProduct(
  name: string,
  brandId: number,
  packageSizeG?: number,
): Promise<number | null> {
  const conditions = [
    eq(products.name, name),
    eq(products.brand_id, brandId),
  ];
  if (packageSizeG !== undefined) {
    conditions.push(eq(products.package_size_g, packageSizeG));
  }

  const existing = await db
    .select({ product_id: products.product_id, source_count: products.source_count })
    .from(products)
    .where(and(...conditions))
    .limit(1);

  return existing.length > 0 ? existing[0].product_id : null;
}

// ── Parse ingredients (semicolon-separated) into ordered list ──────
function parseIngredients(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ── Import a single product row ────────────────────────────────────
async function importProductRow(
  row: ProductImportRow,
  batchId: string,
): Promise<{ success: boolean; productId?: number }> {
  // 1. Upsert brand
  const brandId = await upsertBrand(row.brand_name);

  // 2. Dedup
  const existingProductId = await findExistingProduct(
    row.name,
    brandId,
    row.package_size_g,
  );

  let productId: number;

  if (existingProductId !== null) {
    // Skip: duplicate
    return { success: false };
  }

  // 3. Insert product
  const inserted = await db
    .insert(products)
    .values({
      brand_id: brandId,
      name: row.name,
      species: row.species || null,
      life_stage: row.life_stage || null,
      product_type: row.product_type || null,
      package_size_g: row.package_size_g ?? null,
      status: row.status || 'ACTIVE',
      source_count: 1,
      confidence_score: 0, // calculated after
      verification_status: 'UNVERIFIED',
      imported_batch_id: batchId,
    })
    .returning({ product_id: products.product_id });

  productId = inserted[0].product_id;

  // 4. Insert nutrition
  const hasNutrition =
    row.protein_pct !== undefined ||
    row.fat_pct !== undefined ||
    row.crude_fiber_pct !== undefined ||
    row.moisture_pct !== undefined ||
    row.ash_pct !== undefined ||
    row.me_kcal_per_kg !== undefined ||
    row.omega_3_pct !== undefined ||
    row.omega_6_pct !== undefined ||
    row.calcium_pct !== undefined ||
    row.phosphorus_pct !== undefined;

  if (hasNutrition) {
    await db.insert(productNutrition).values({
      product_id: productId,
      protein_pct: row.protein_pct?.toString() ?? null,
      fat_pct: row.fat_pct?.toString() ?? null,
      crude_fiber_pct: row.crude_fiber_pct?.toString() ?? null,
      moisture_pct: row.moisture_pct?.toString() ?? null,
      ash_pct: row.ash_pct?.toString() ?? null,
      me_kcal_per_kg: row.me_kcal_per_kg?.toString() ?? null,
      omega_3_pct: row.omega_3_pct?.toString() ?? null,
      omega_6_pct: row.omega_6_pct?.toString() ?? null,
      calcium_pct: row.calcium_pct?.toString() ?? null,
      phosphorus_pct: row.phosphorus_pct?.toString() ?? null,
    });
  }

  // 5. Insert ingredients
  const ingredients = parseIngredients(row.ingredients);
  if (ingredients.length > 0) {
    const ingRows = ingredients.map((ing, idx) => ({
      product_id: productId,
      raw_ingredient: ing,
      ingredient_order: idx + 1,
    }));
    await db.insert(productIngredients).values(ingRows);
  }

  // 6. Insert price
  if (row.unit_price_aud !== undefined) {
    await db.insert(productPrices).values({
      product_id: productId,
      retailer: row.store_name || null,
      price_aud: row.unit_price_aud.toString(),
      captured_at: row.price_date ? new Date(row.price_date) : new Date(),
    });
  }

  // 7. Calculate & update confidence score
  const confidenceScore = calcConfidenceScore(
    { ...row, brand_name: row.brand_name },
    'csv',
  );
  await db
    .update(products)
    .set({
      confidence_score: confidenceScore,
      verification_status: calcVerificationStatus(1),
    })
    .where(eq(products.product_id, productId));

  return { success: true, productId };
}

// ── Batch import ───────────────────────────────────────────────────
async function importRows(
  rows: Record<string, string>[],
  sourceType: 'csv' | 'json',
): Promise<{
  batchId: string;
  report: Awaited<ReturnType<typeof getBatchReport>>;
}> {
  // Validate
  const { valid, invalid } = validateImportRows(rows);

  // Create batch
  const batch = await createBatch(sourceType);
  const batchId = batch.batch_id;

  // Import valid rows
  let successCount = 0;
  let failedCount = invalid.length;
  let skippedCount = 0;

  for (const row of valid) {
    const result = await importProductRow(row, batchId);
    if (result.success) {
      successCount++;
    } else {
      skippedCount++;
    }
  }

  // Finalize batch
  await finalizeBatch(batchId, {
    rows_total: rows.length,
    rows_success: successCount,
    rows_failed: failedCount + skippedCount,
    failed_details: [
      ...invalid.map((e) => ({ row: e.row, reason: e.reason })),
    ],
    status: 'completed',
  });

  const report = await getBatchReport(batchId);
  return { batchId, report };
}

// ── Public API ─────────────────────────────────────────────────────

export async function importFromCSV(filePath: string) {
  const { rows } = parseCsvFile(filePath);
  return importRows(rows, 'csv');
}

export async function importFromJSON(filePath: string) {
  const { rows } = parseJsonFile(filePath);
  return importRows(rows, 'json');
}

export async function getImportReport(batchId: string) {
  return getBatchReport(batchId);
}

export async function rollbackImportByBatch(batchId: string) {
  return rollbackImport(batchId);
}
