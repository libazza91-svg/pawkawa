import { db } from '../db/client';
import {
  products,
  productNutrition,
  productIngredients,
  productPrices,
  importBatches,
} from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

// ── Rollback an import batch ───────────────────────────────────────
// Deletes all products imported by this batch + their related records
export async function rollbackImport(batchId: string): Promise<{
  products_deleted: number;
  nutrition_deleted: number;
  ingredients_deleted: number;
  prices_deleted: number;
}> {
  // 1. Find all products from this batch
  const batchProducts = await db
    .select({ product_id: products.product_id })
    .from(products)
    .where(eq(products.imported_batch_id, batchId));

  const productIds = batchProducts.map((p) => p.product_id);

  if (productIds.length === 0) {
    // Still mark batch as rolled_back
    await db
      .update(importBatches)
      .set({ status: 'rolled_back', completed_at: new Date() })
      .where(eq(importBatches.batch_id, batchId));
    return {
      products_deleted: 0,
      nutrition_deleted: 0,
      ingredients_deleted: 0,
      prices_deleted: 0,
    };
  }

  // 2. Delete related records
  const nutResult = await db
    .delete(productNutrition)
    .where(inArray(productNutrition.product_id, productIds as [number, ...number[]]));

  const ingResult = await db
    .delete(productIngredients)
    .where(inArray(productIngredients.product_id, productIds as [number, ...number[]]));

  const priceResult = await db
    .delete(productPrices)
    .where(inArray(productPrices.product_id, productIds as [number, ...number[]]));

  // 3. Delete products
  const prodResult = await db
    .delete(products)
    .where(eq(products.imported_batch_id, batchId));

  // 4. Mark batch as rolled_back
  await db
    .update(importBatches)
    .set({ status: 'rolled_back', completed_at: new Date() })
    .where(eq(importBatches.batch_id, batchId));

  return {
    products_deleted: productIds.length,
    nutrition_deleted: nutResult.rowCount ?? 0,
    ingredients_deleted: ingResult.rowCount ?? 0,
    prices_deleted: priceResult.rowCount ?? 0,
  };
}
