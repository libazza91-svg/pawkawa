import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import {
  products,
  brands,
  productPrices,
  productNutrition,
  productIngredients,
  importBatches,
} from '../db/schema';
import { eq, and, or, gte, lt, isNull, sql } from 'drizzle-orm';
import { sendSuccess, sendError } from '../middleware/response';

export const metricsRouter = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// ── GET /api/metrics/data-quality ─────────────────────────────────
metricsRouter.get(
  '/data-quality',
  asyncHandler(async (req: Request, res: Response) => {
    // ── Brands ────────────────────────────────────────────────────
    const [brandsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(brands);
    const brandsTotal = brandsResult?.count ?? 0;

    // Verified brands: count brands that appear in products table
    const [brandsUsedResult] = await db
      .select({ count: sql<number>`count(DISTINCT ${products.brand_id})::int` })
      .from(products);
    const brandsUsed = brandsUsedResult?.count ?? 0;

    // ── Products ──────────────────────────────────────────────────
    const [productsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products);
    const productsTotal = productsResult?.count ?? 0;

    // Products by verification_status (separate queries to avoid GROUP BY)
    const [unverifiedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.verification_status, 'UNVERIFIED'));
    const [singleSourceResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.verification_status, 'SINGLE_SOURCE'));
    const [multiSourceResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.verification_status, 'MULTI_SOURCE'));
    const [manualVerifiedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.verification_status, 'MANUALLY_VERIFIED'));

    const productsByVerification: Record<string, number> = {
      UNVERIFIED: unverifiedResult?.count ?? 0,
      SINGLE_SOURCE: singleSourceResult?.count ?? 0,
      MULTI_SOURCE: multiSourceResult?.count ?? 0,
      MANUALLY_VERIFIED: manualVerifiedResult?.count ?? 0,
    };
    const productsVerified =
      productsTotal - (productsByVerification['UNVERIFIED'] ?? 0);

    // Products by species
    const [catResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.species, 'CAT'));
    const [dogResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.species, 'DOG'));

    const bySpecies: Record<string, number> = {
      CAT: catResult?.count ?? 0,
      DOG: dogResult?.count ?? 0,
    };

    // Products by life_stage
    const lifeStages = ['ADULT', 'SENIOR', 'KITTEN', 'PUPPY', 'ALL_LIFE_STAGES'] as const;
    const byLifeStage: Record<string, number> = {};
    for (const stage of lifeStages) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(eq(products.life_stage, stage));
      byLifeStage[stage] = row?.count ?? 0;
    }

    // ── Ingredients ───────────────────────────────────────────────
    const [ingTotalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productIngredients);
    const totalIngredientRecords = ingTotalResult?.count ?? 0;

    const [ingUniqueResult] = await db
      .select({
        count: sql<number>`count(DISTINCT ${productIngredients.normalized_ingredient})::int`,
      })
      .from(productIngredients);
    const uniqueIngredients = ingUniqueResult?.count ?? 0;

    // Normalized percentage: records with non-NULL normalized_ingredient
    const [ingNormalizedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productIngredients)
      .where(sql`${productIngredients.normalized_ingredient} IS NOT NULL`);
    const normalizedIngCount = ingNormalizedResult?.count ?? 0;
    const normalizedPct =
      totalIngredientRecords > 0
        ? Math.round((normalizedIngCount / totalIngredientRecords) * 1000) / 10
        : 0;

    // Additional ingredient normalization metrics (A2)
    const rawCount = totalIngredientRecords;
    const normalizedCount = normalizedIngCount;
    const normalizationRatio =
      rawCount > 0 ? Math.round((normalizedCount / rawCount) * 100) / 100 : 0;

    // ── Prices ────────────────────────────────────────────────────
    const [pricesTotalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productPrices);
    const totalPriceRecords = pricesTotalResult?.count ?? 0;

    // Products with prices: distinct product_ids in product_prices
    const [productsWithPricesResult] = await db
      .select({
        count: sql<number>`count(DISTINCT ${productPrices.product_id})::int`,
      })
      .from(productPrices);
    const productsWithPrices = productsWithPricesResult?.count ?? 0;

    const missingPricePct =
      productsTotal > 0
        ? Math.round(
            ((productsTotal - productsWithPrices) / productsTotal) * 1000
          ) / 10
        : 0;

    // ── Nutrition ─────────────────────────────────────────────────
    // Products with nutrition records
    const [productsWithNutritionResult] = await db
      .select({
        count: sql<number>`count(DISTINCT ${productNutrition.product_id})::int`,
      })
      .from(productNutrition);
    const productsWithNutrition = productsWithNutritionResult?.count ?? 0;

    const missingNutritionPct =
      productsTotal > 0
        ? Math.round(
            ((productsTotal - productsWithNutrition) / productsTotal) * 1000
          ) / 10
        : 0;

    // Average field completeness: fetch all nutrition rows, compute in JS
    const allNutritionRows = await db.select().from(productNutrition);
    let avgFieldCompleteness = 0;
    if (allNutritionRows.length > 0) {
      const nutritionFields = [
        'protein_pct',
        'fat_pct',
        'fiber_pct',
        'crude_fiber_pct',
        'moisture_pct',
        'ash_pct',
        'phosphorus_pct',
        'calcium_pct',
        'omega_3_pct',
        'omega_6_pct',
        'calories_kcal',
        'me_kcal_per_kg',
      ] as const;
      const totalNutritionFields = nutritionFields.length;
      const completenessSum = allNutritionRows.reduce((sum, row) => {
        const filled = nutritionFields.filter((f) => row[f] != null).length;
        return sum + filled / totalNutritionFields;
      }, 0);
      avgFieldCompleteness =
        Math.round((completenessSum / allNutritionRows.length) * 100) / 100;
    }

    // ── Confidence ────────────────────────────────────────────────
    const [avgConfResult] = await db
      .select({ avg: sql<number>`avg(${products.confidence_score})::real` })
      .from(products);
    const avgConfidenceScore =
      avgConfResult?.avg != null
        ? Math.round(avgConfResult.avg * 100) / 100
        : 0;

    // Confidence distribution: 3-tier (high / medium / low)
    const [highConfResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(gte(products.confidence_score, 0.8));
    const [mediumConfResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(
          gte(products.confidence_score, 0.6),
          lt(products.confidence_score, 0.8)
        )
      );
    const [lowConfResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(
        or(
          lt(products.confidence_score, 0.6),
          isNull(products.confidence_score)
        )
      );

    const confidenceDistribution = {
      high: highConfResult?.count ?? 0,
      medium: mediumConfResult?.count ?? 0,
      low: lowConfResult?.count ?? 0,
    };

    // ── Imports ───────────────────────────────────────────────────
    const [batchesTotalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(importBatches);
    const totalBatches = batchesTotalResult?.count ?? 0;

    const [lastImportEpoch] = await db
      .select({
        last_import_epoch: sql<number | null>`EXTRACT(EPOCH FROM max(${importBatches.completed_at}))`,
      })
      .from(importBatches)
      .where(eq(importBatches.status, 'completed'));
    const lastImport = lastImportEpoch?.last_import_epoch != null
      ? new Date(lastImportEpoch.last_import_epoch * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
      : null;

    const [rowsSuccessResult] = await db
      .select({
        total: sql<number>`coalesce(sum(${importBatches.rows_success}), 0)::int`,
      })
      .from(importBatches);
    const totalRowsSuccess = rowsSuccessResult?.total ?? 0;

    const [rowsFailedResult] = await db
      .select({
        total: sql<number>`coalesce(sum(${importBatches.rows_failed}), 0)::int`,
      })
      .from(importBatches);
    const totalRowsFailed = rowsFailedResult?.total ?? 0;

    // ── Overall quality score (A3) ─────────────────────────────────
    const nutritionPct = productsTotal > 0 ? productsWithNutrition / productsTotal : 0;
    const pricePct = productsTotal > 0 ? productsWithPrices / productsTotal : 0;
    const verifiedPct = productsTotal > 0 ? (productsVerified / productsTotal) : 0;
    const normalization = normalizationRatio;
    const confidence = avgConfidenceScore;

    const overallQualityScore =
      Math.round(
        (nutritionPct * 0.25 +
          pricePct * 0.20 +
          verifiedPct * 0.20 +
          normalization * 0.20 +
          confidence * 0.15) *
          100
      ) / 100;

    // ── Build response ────────────────────────────────────────────
    sendSuccess(res, {
      overall_quality_score: overallQualityScore,
      brands: {
        total: brandsTotal,
        verified: brandsUsed,
        verified_pct:
          brandsTotal > 0
            ? Math.round((brandsUsed / brandsTotal) * 1000) / 10
            : 0,
      },
      products: {
        total: productsTotal,
        verified: productsVerified,
        verified_pct:
          productsTotal > 0
            ? Math.round((productsVerified / productsTotal) * 1000) / 10
            : 0,
        by_species: bySpecies,
        by_life_stage: byLifeStage,
      },
      ingredients: {
        total_ingredient_records: totalIngredientRecords,
        unique_ingredients: uniqueIngredients,
        normalized_pct: normalizedPct,
        raw_count: rawCount,
        normalized_count: normalizedCount,
        normalization_ratio: normalizationRatio,
      },
      prices: {
        total_price_records: totalPriceRecords,
        products_with_prices: productsWithPrices,
        missing_price_pct: missingPricePct,
      },
      nutrition: {
        products_with_nutrition: productsWithNutrition,
        missing_nutrition_pct: missingNutritionPct,
        avg_field_completeness: avgFieldCompleteness,
      },
      confidence: {
        avg_confidence_score: avgConfidenceScore,
        confidence_distribution: confidenceDistribution,
        by_verification_status: productsByVerification,
      },
      imports: {
        total_batches: totalBatches,
        last_import: lastImport,
        total_rows_success: totalRowsSuccess,
        total_rows_failed: totalRowsFailed,
      },
    });
  })
);
