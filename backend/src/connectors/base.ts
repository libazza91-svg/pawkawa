// ── Base Connector (Epic B2) ──────────────────────────────────────

import { Connector, RawProduct, RawProductDetail } from './interface';
import { db } from '../db/client';
import {
  products,
  brands,
  productNutrition,
  productIngredients,
  productPrices,
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createBatch, finalizeBatch, getBatchReport } from '../importer/logger';
import { validateImportRows } from '../importer/validation';
import {
  calcConfidenceScore,
  calcVerificationStatus,
  mergeConfidence,
} from './confidence';
import { randomUUID } from 'crypto';

export abstract class BaseConnector implements Connector {
  abstract name: string;
  abstract sourceType: string;

  abstract fetchProducts(): Promise<RawProduct[]>;

  async fetchProductDetail(_externalId: string): Promise<RawProductDetail> {
    throw new Error(`fetchProductDetail not implemented for ${this.name}`);
  }

  // ── Retry mechanism: 3 attempts, exponential backoff (1s, 2s, 4s) ──
  protected async withRetry<T>(
    fn: () => Promise<T>,
    label: string,
    maxAttempts = 3,
  ): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.error(
            `[${this.name}] ${label} attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms: ${lastError.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError!;
  }

  // ── Normalize raw products to rows for validation ────────────────
  private rawToRows(products: RawProduct[]): Record<string, string>[] {
    return products.map((p) => {
      const row: Record<string, string> = {};
      for (const [key, val] of Object.entries(p)) {
        if (val === null || val === undefined) {
          row[key] = '';
        } else {
          row[key] = String(val);
        }
      }
      return row;
    });
  }

  // ── Upsert brand (find or create) ────────────────────────────────
  private async upsertBrand(brandName: string): Promise<number> {
    const existing = await db
      .select({ brand_id: brands.brand_id })
      .from(brands)
      .where(eq(brands.name, brandName))
      .limit(1);

    if (existing.length > 0) return existing[0].brand_id;

    const inserted = await db
      .insert(brands)
      .values({ name: brandName })
      .returning({ brand_id: brands.brand_id });
    return inserted[0].brand_id;
  }

  // ── Parse ingredients from raw product ───────────────────────────
  private parseIngredients(raw?: string): string[] {
    if (!raw) return [];
    return raw
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // ── Normalize and import products via importer orchestrator logic ──
  async normalizeAndImport(rawProducts: RawProduct[]): Promise<{
    batchId: string;
    imported: number;
    skipped: number;
    failed: number;
  }> {
    // Create batch
    const batch = await createBatch('connector', this.name);
    const batchId = batch.batch_id;

    // Convert to rows and validate
    const rows = this.rawToRows(rawProducts);
    const { valid, invalid } = validateImportRows(rows);

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of valid) {
      const brandId = await this.upsertBrand(row.brand_name);

      // Dedup: name + brand_id + package_size_g
      const pkgSize = row.package_size_g ? parseInt(row.package_size_g, 10) : undefined;
      const conditions = [
        eq(products.name, row.name),
        eq(products.brand_id, brandId),
      ];
      if (pkgSize !== undefined) {
        conditions.push(eq(products.package_size_g, pkgSize));
      }

      const existing = await db
        .select({
          product_id: products.product_id,
          source_count: products.source_count,
          confidence_score: products.confidence_score,
        })
        .from(products)
        .where(and(...conditions))
        .limit(1);

      if (existing.length > 0) {
        // Update source_count and confidence on existing
        const newScore = calcConfidenceScore(row, this.sourceType);
        const merged = mergeConfidence(
          existing[0].source_count ?? 0,
          this.sourceType,
          existing[0].confidence_score ?? 0,
          newScore,
        );
        await db
          .update(products)
          .set({
            source_count: merged.source_count,
            confidence_score: merged.confidence_score,
            verification_status: merged.verification_status,
            updated_at: new Date(),
          })
          .where(eq(products.product_id, existing[0].product_id));
        skippedCount++;
        continue;
      }

      // Insert new product
      const inserted = await db
        .insert(products)
        .values({
          brand_id: brandId,
          name: row.name,
          species: row.species || null,
          life_stage: row.life_stage || null,
          product_type: row.product_type || null,
          package_size_g: pkgSize ?? null,
          status: row.status || 'ACTIVE',
          source_count: 1,
          confidence_score: 0, // calculated below
          verification_status: 'UNVERIFIED',
          imported_batch_id: batchId,
        })
        .returning({ product_id: products.product_id });

      const productId = inserted[0].product_id;

      // Nutrition
      const hasNutrition =
        row.protein_pct !== '' ||
        row.fat_pct !== '' ||
        row.crude_fiber_pct !== '' ||
        row.moisture_pct !== '' ||
        row.ash_pct !== '' ||
        row.me_kcal_per_kg !== '';

      if (hasNutrition) {
        await db.insert(productNutrition).values({
          product_id: productId,
          protein_pct: row.protein_pct || null,
          fat_pct: row.fat_pct || null,
          crude_fiber_pct: row.crude_fiber_pct || null,
          moisture_pct: row.moisture_pct || null,
          ash_pct: row.ash_pct || null,
          me_kcal_per_kg: row.me_kcal_per_kg || null,
          omega_3_pct: row.omega_3_pct || null,
          omega_6_pct: row.omega_6_pct || null,
          calcium_pct: row.calcium_pct || null,
          phosphorus_pct: row.phosphorus_pct || null,
        });
      }

      // Ingredients
      const ingredients = this.parseIngredients(row.ingredients);
      if (ingredients.length > 0) {
        await db.insert(productIngredients).values(
          ingredients.map((ing, idx) => ({
            product_id: productId,
            raw_ingredient: ing,
            ingredient_order: idx + 1,
          })),
        );
      }

      // Price
      if (row.unit_price_aud && row.unit_price_aud !== '') {
        await db.insert(productPrices).values({
          product_id: productId,
          retailer: row.store_name || null,
          price_aud: row.unit_price_aud,
          captured_at: row.price_date ? new Date(row.price_date) : new Date(),
        });
      }

      // Confidence
      const confScore = calcConfidenceScore(row, this.sourceType);
      await db
        .update(products)
        .set({
          confidence_score: confScore,
          verification_status: calcVerificationStatus(1),
        })
        .where(eq(products.product_id, productId));

      importedCount++;
    }

    // Finalize
    await finalizeBatch(batchId, {
      rows_total: rawProducts.length,
      rows_success: importedCount,
      rows_failed: invalid.length + skippedCount,
      failed_details: [
        ...invalid.map((e) => ({ row: e.row, reason: e.reason })),
      ],
      status: 'completed',
    });

    return {
      batchId,
      imported: importedCount,
      skipped: skippedCount,
      failed: invalid.length,
    };
  }
}
