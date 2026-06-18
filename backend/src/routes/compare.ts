import { Router, Request, Response } from 'express';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { checkConnection } from '../db/client';
import { products, brands, productNutrition, productIngredients, productPrices } from '../db/schema';
import { buildRecommendationContext } from '../intelligence/recommendation-context-engine';
import { PetProfileInput, VerifiedProduct } from '../intelligence/types';
import { slugifyProductName, toConfidencePercent, toVerificationGrade } from '../lib/product-slug';
import { verifiedProducts } from '../verified-products/catalog';
import { sendError, sendSuccess } from '../middleware/response';

export const compareRouter = Router();

// ── Helpers ─────────────────────────────────────────────────────

type NutritionData = Record<string, string | number | null>;

interface ComparisonRow {
  product_id: number;
  slug: string;
  product_name: string;
  brand_name: string;
  species: string | null;
  life_stage: string | null;
  format: string | null;
  origin: string | null;
  confidence: number;
  trust_grade: 'GOLD' | 'SILVER' | 'BRONZE' | 'UNVERIFIED';
  market_availability: 'ACTIVE' | 'LIMITED' | 'DISCONTINUED';
  nutrition: Record<string, string | number | null>;
  ingredients: string[];
  prices: Array<{
    retailer: string | null;
    price_aud: string;
    unit_price_aud_per_kg: string | null;
  }>;
}

function mapMarketAvailability(status: string | null): 'ACTIVE' | 'LIMITED' | 'DISCONTINUED' {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'DISCONTINUED') return 'DISCONTINUED';
  if (normalized === 'LIMITED') return 'LIMITED';
  return 'ACTIVE';
}

function detectControversialIngredients(ingredients: string[]): string[] {
  const watchList = ['maize', 'corn', 'natural flavour', 'animal fat', 'soy'];
  return ingredients.filter((ingredient) =>
    watchList.some((term) => ingredient.toLowerCase().includes(term))
  );
}

function deriveSuitabilityTags(product: {
  species: string | null;
  life_stage: string | null;
  protein: number;
  fat: number;
  fiber: number;
  ingredients: string[];
}): string[] {
  const tags: string[] = [];

  if (product.protein >= 36) tags.push('High Protein');
  if (product.fat <= 15) tags.push('Weight Control');
  if (product.species === 'CAT' && product.life_stage === 'ADULT' && product.fiber >= 5) tags.push('Indoor Cat');
  if (product.life_stage === 'PUPPY' || product.life_stage === 'KITTEN') tags.push('Growth Support');
  if (product.ingredients.some((ingredient) => ingredient.toLowerCase().includes('rice'))) tags.push('Sensitive Stomach');

  return Array.from(new Set(tags));
}

async function resolveProductIds(productIds?: unknown, productSlugs?: unknown): Promise<number[]> {
  const resolvedIds = new Set<number>();

  if (Array.isArray(productIds)) {
    for (const value of productIds) {
      if (typeof value === 'number' && Number.isInteger(value)) resolvedIds.add(value);
    }
  }

  if (Array.isArray(productSlugs) && productSlugs.length > 0) {
    const dbProducts = await db
      .select({ product_id: products.product_id, name: products.name })
      .from(products);
    const slugMap = new Map(dbProducts.map((item) => [slugifyProductName(item.name), item.product_id]));

    for (const value of productSlugs) {
      if (typeof value !== 'string') continue;
      const productId = slugMap.get(value);
      if (productId !== undefined) resolvedIds.add(productId);
    }
  }

  return Array.from(resolvedIds);
}

function resolveFallbackProducts(productIds?: unknown, productSlugs?: unknown): VerifiedProduct[] {
  const requestedSlugs = Array.isArray(productSlugs) ? productSlugs.filter((item): item is string => typeof item === 'string') : [];
  const requestedIds = Array.isArray(productIds) ? productIds.map((item) => String(item)) : [];

  if (requestedSlugs.length === 0 && requestedIds.length === 0) return [];

  return verifiedProducts.filter((product, index) => {
    return requestedSlugs.includes(product.slug) || requestedIds.includes(product.id) || requestedIds.includes(String(index + 1));
  });
}

function buildFallbackCompareData(items: VerifiedProduct[]): ComparisonRow[] {
  return items.map((product, index) => ({
    product_id: index + 1,
    slug: product.slug,
    product_name: product.name,
    brand_name: product.brand,
    species: product.species,
    life_stage: product.life_stage,
    format: null,
    origin: null,
    confidence: product.confidence,
    trust_grade: product.verification_grade,
    market_availability: product.market_availability,
    nutrition: {
      protein_pct: String(product.nutrition.protein),
      fat_pct: String(product.nutrition.fat),
      fiber_pct: String(product.nutrition.fiber),
      moisture_pct: String(product.nutrition.moisture),
      ash_pct: String(product.nutrition.ash),
      phosphorus_pct: String(product.nutrition.phosphorus),
      calories_kcal: String(product.nutrition.calories),
    },
    ingredients: product.ingredients_normalized,
    prices: [
      {
        retailer: 'Verified catalog',
        price_aud: product.unit_price_aud_per_kg.toFixed(2),
        unit_price_aud_per_kg: product.unit_price_aud_per_kg.toFixed(2),
      },
    ],
  }));
}

async function fetchCompareData(productIds: number[]): Promise<ComparisonRow[]> {
  // Products with brands
  const productRows = await db
    .select({
      product_id: products.product_id,
      product_name: products.name,
      brand_name: brands.name,
      species: products.species,
      life_stage: products.life_stage,
      format: products.format,
      origin: products.origin,
      status: products.status,
      confidence_score: products.confidence_score,
    })
    .from(products)
    .leftJoin(brands, eq(products.brand_id, brands.brand_id))
    .where(inArray(products.product_id, productIds));

  // Nutrition data
  const nutritionRows = await db
    .select()
    .from(productNutrition)
    .where(inArray(productNutrition.product_id, productIds));

  // Ingredients
  const ingredientRows = await db
    .select()
    .from(productIngredients)
    .where(inArray(productIngredients.product_id, productIds))
    .orderBy(productIngredients.ingredient_order);

  // Prices
  const priceRows = await db
    .select()
    .from(productPrices)
    .where(inArray(productPrices.product_id, productIds));

  // Assemble comparison rows
  return productRows.map((p) => {
    const nut = nutritionRows.find((n) => n.product_id === p.product_id);
    const ings = ingredientRows
      .filter((i) => i.product_id === p.product_id)
      .map((i) => i.normalized_ingredient || i.raw_ingredient || '')
      .filter(Boolean);
    const prc = priceRows
      .filter((pr) => pr.product_id === p.product_id)
      .map((pr) => ({
        retailer: pr.retailer,
        price_aud: String(pr.price_aud ?? ''),
        unit_price_aud_per_kg: pr.unit_price_aud_per_kg != null ? String(pr.unit_price_aud_per_kg) : null,
      }));

    const protein = nut?.protein_pct != null ? Number(nut.protein_pct) : 0;
    const fat = nut?.fat_pct != null ? Number(nut.fat_pct) : 0;
    const fiber = (nut?.fiber_pct ?? nut?.crude_fiber_pct) != null ? Number(nut?.fiber_pct ?? nut?.crude_fiber_pct) : 0;

    const nutrition: NutritionData = nut
      ? {
          protein_pct: nut.protein_pct != null ? String(nut.protein_pct) : null,
          fat_pct: nut.fat_pct != null ? String(nut.fat_pct) : null,
          fiber_pct: nut.fiber_pct != null ? String(nut.fiber_pct) : null,
          crude_fiber_pct: nut.crude_fiber_pct != null ? String(nut.crude_fiber_pct) : null,
          moisture_pct: nut.moisture_pct != null ? String(nut.moisture_pct) : null,
          ash_pct: nut.ash_pct != null ? String(nut.ash_pct) : null,
          phosphorus_pct: nut.phosphorus_pct != null ? String(nut.phosphorus_pct) : null,
          calcium_pct: nut.calcium_pct != null ? String(nut.calcium_pct) : null,
          omega_3_pct: nut.omega_3_pct != null ? String(nut.omega_3_pct) : null,
          omega_6_pct: nut.omega_6_pct != null ? String(nut.omega_6_pct) : null,
          calories_kcal: nut.calories_kcal != null ? String(nut.calories_kcal) : null,
          me_kcal_per_kg: nut.me_kcal_per_kg != null ? String(nut.me_kcal_per_kg) : null,
        }
      : {};

    return {
      product_id: p.product_id,
      slug: slugifyProductName(p.product_name),
      product_name: p.product_name,
      brand_name: p.brand_name || 'Unknown',
      species: p.species,
      life_stage: p.life_stage,
      format: p.format,
      origin: p.origin,
      confidence: toConfidencePercent(p.confidence_score ?? null),
      trust_grade: toVerificationGrade(p.confidence_score ?? null),
      market_availability: mapMarketAvailability(p.status),
      nutrition,
      ingredients: ings,
      prices: prc,
    };
  });
}

function buildComparison(data: ComparisonRow[]) {
  // Build nutrition comparison table
  const nutritionFields: Array<{ key: keyof ComparisonRow['nutrition']; label: string; unit: string }> = [
    { key: 'protein_pct', label: 'Protein', unit: '%' },
    { key: 'fat_pct', label: 'Fat', unit: '%' },
    { key: 'fiber_pct', label: 'Fiber', unit: '%' },
    { key: 'crude_fiber_pct', label: 'Crude Fiber', unit: '%' },
    { key: 'moisture_pct', label: 'Moisture', unit: '%' },
    { key: 'ash_pct', label: 'Ash', unit: '%' },
    { key: 'phosphorus_pct', label: 'Phosphorus', unit: '%' },
    { key: 'calcium_pct', label: 'Calcium', unit: '%' },
    { key: 'omega_3_pct', label: 'Omega-3', unit: '%' },
    { key: 'omega_6_pct', label: 'Omega-6', unit: '%' },
    { key: 'calories_kcal', label: 'Calories', unit: 'kcal' },
    { key: 'me_kcal_per_kg', label: 'ME', unit: 'kcal/kg' },
  ];

  const nutritionTable = nutritionFields.map((field) => {
    const row: Record<string, string | null> = { metric: field.label, unit: field.unit };
    data.forEach((p) => {
      row[`product_${p.product_id}`] = (p.nutrition[field.key] as string) ?? '-';
    });
    return row;
  });

  // Ingredient comparison
  const ingredientSets = data.map((p) => ({
    product_id: p.product_id,
    product_name: p.product_name,
    ingredients: p.ingredients,
  }));

  // Price comparison (AUD/kg)
  const priceComparison = data.map((p) => ({
    product_id: p.product_id,
    product_name: p.product_name,
    retailers: p.prices.map((pr) => ({
      retailer: pr.retailer,
      price_aud: pr.price_aud,
      unit_price_aud_per_kg: pr.unit_price_aud_per_kg,
    })),
  }));

  return { nutritionTable, ingredientSets, priceComparison };
}

// ── Routes ──────────────────────────────────────────────────────

// POST /api/compare — Multi-product comparison (2-4 products)
compareRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { product_ids } = req.body;
    if (!(await checkConnection())) {
      const fallbackProducts = resolveFallbackProducts(product_ids, req.body.product_slugs);
      if (fallbackProducts.length < 2 || fallbackProducts.length > 4) {
        sendError(res, 'INVALID_PARAMETER', 'Provide 2-4 valid product_ids or product_slugs', 400);
        return;
      }
      const fallbackData = buildFallbackCompareData(fallbackProducts);
      sendSuccess(res, {
        products: fallbackData.map((product) => ({
          product_id: product.product_id,
          slug: product.slug,
          product_name: product.product_name,
          brand_name: product.brand_name,
          species: product.species,
          life_stage: product.life_stage,
          format: product.format,
          origin: product.origin,
          confidence: product.confidence,
          trust_grade: product.trust_grade,
          market_availability: product.market_availability,
        })),
        comparison: buildComparison(fallbackData),
      });
      return;
    }

    const resolvedProductIds = await resolveProductIds(product_ids, req.body.product_slugs);

    if (resolvedProductIds.length < 2 || resolvedProductIds.length > 4) {
      sendError(res, 'INVALID_PARAMETER', 'Provide 2-4 valid product_ids or product_slugs', 400);
      return;
    }

    const data = await fetchCompareData(resolvedProductIds);
    const comparison = buildComparison(data);

    sendSuccess(res, {
      products: data.map((p) => ({
        product_id: p.product_id,
        slug: p.slug,
        product_name: p.product_name,
        brand_name: p.brand_name,
        species: p.species,
        life_stage: p.life_stage,
        format: p.format,
        origin: p.origin,
        confidence: p.confidence,
        trust_grade: p.trust_grade,
        market_availability: p.market_availability,
      })),
      comparison,
    });
  } catch (err: any) {
    sendError(res, 'COMPARE_FAILED', err.message || 'Comparison failed', 500);
  }
});

// POST /api/compare/recommend — Health-aware comparison ranking
compareRouter.post('/recommend', async (req: Request, res: Response) => {
  try {
    const { product_ids, product_slugs, species, age_years, breed, need_codes, health_conditions, vet_prescription_required } = req.body;
    if (!(await checkConnection())) {
      const fallbackProducts = resolveFallbackProducts(product_ids, product_slugs);
      if (fallbackProducts.length < 2) {
        sendError(res, 'INVALID_PARAMETER', 'Provide at least 2 valid product_ids or product_slugs', 400);
        return;
      }
      const profile: PetProfileInput = {
        species,
        age_years: typeof age_years === 'number' ? age_years : 3,
        breed: typeof breed === 'string' ? breed : undefined,
        need_codes: Array.isArray(need_codes) ? need_codes : undefined,
        health_conditions: health_conditions || [],
        vet_prescription_required: vet_prescription_required || false,
      };
      const result = buildRecommendationContext(profile, fallbackProducts);
      sendSuccess(res, {
        constraints: result.constraints,
        recommendations: result.recommendations,
        warnings: result.warnings,
        disclaimer: '以上分析仅供参考，不构成兽医建议。实际饮食决策请在兽医指导下进行。',
      });
      return;
    }
    const resolvedProductIds = await resolveProductIds(product_ids, product_slugs);

    if (resolvedProductIds.length < 2) {
      sendError(res, 'INVALID_PARAMETER', 'Provide at least 2 valid product_ids or product_slugs', 400);
      return;
    }

    if (!species || !['CAT', 'DOG'].includes(species)) {
      sendError(res, 'INVALID_PARAMETER', 'species must be CAT or DOG', 400);
      return;
    }

    const compareRows = await fetchCompareData(resolvedProductIds);
    const catalogSubset: VerifiedProduct[] = compareRows.map((row) => {
      const protein = Number(row.nutrition.protein_pct ?? 0);
      const fat = Number(row.nutrition.fat_pct ?? 0);
      const fiber = Number((row.nutrition.fiber_pct ?? row.nutrition.crude_fiber_pct) ?? 0);
      const calories = Number((row.nutrition.calories_kcal ?? row.nutrition.me_kcal_per_kg) ?? 0);
      const moisture = Number(row.nutrition.moisture_pct ?? 0);
      const ash = Number(row.nutrition.ash_pct ?? 0);
      const phosphorus = Number(row.nutrition.phosphorus_pct ?? 0);
      const lowestUnitPrice = row.prices
        .map((price) => Number(price.unit_price_aud_per_kg ?? 0))
        .filter((value) => value > 0)
        .sort((a, b) => a - b)[0] ?? 0;

      return {
        id: String(row.product_id),
        slug: row.slug,
        name: row.product_name,
        brand: row.brand_name,
        species: row.species === 'DOG' ? 'DOG' : 'CAT',
        life_stage: (row.life_stage as VerifiedProduct['life_stage']) || 'ALL_LIFE_STAGES',
        verification_grade: row.trust_grade,
        confidence: row.confidence,
        market_availability: row.market_availability,
        nutrition: { protein, fat, fiber, calories, moisture, ash, phosphorus },
        ingredients_normalized: row.ingredients,
        controversial_ingredients: detectControversialIngredients(row.ingredients),
        suitability_tags: deriveSuitabilityTags({
          species: row.species,
          life_stage: row.life_stage,
          protein,
          fat,
          fiber,
          ingredients: row.ingredients,
        }),
        unit_price_aud_per_kg: lowestUnitPrice,
      };
    });

    const profile: PetProfileInput = {
      species,
      age_years: typeof age_years === 'number' ? age_years : 3,
      breed: typeof breed === 'string' ? breed : undefined,
      need_codes: Array.isArray(need_codes) ? need_codes : undefined,
      health_conditions: health_conditions || [],
      vet_prescription_required: vet_prescription_required || false,
    };

    const result = buildRecommendationContext(profile, catalogSubset);
    const enrichedRecommendations = result.recommendations.map((rec) => ({
      ...rec,
      db_product_id: Number(rec.product_id),
    }));

    sendSuccess(res, {
      constraints: result.constraints,
      recommendations: enrichedRecommendations.sort((a, b) => b.suitability_score - a.suitability_score),
      warnings: result.warnings,
      disclaimer: '以上分析仅供参考，不构成兽医建议。实际饮食决策请在兽医指导下进行。',
    });
  } catch (err: any) {
    sendError(res, 'COMPARE_RECOMMEND_FAILED', err.message || 'Recommendation failed', 500);
  }
});
