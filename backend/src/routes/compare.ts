import { Router, Request, Response } from 'express';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { products, brands, productNutrition, productIngredients, productPrices } from '../db/schema';
import { scoreProductSuitability } from '../intelligence/suitability-engine';
import { buildRecommendationContext } from '../intelligence/recommendation-context-engine';
import { PetProfileInput, VerifiedProduct } from '../intelligence/types';
import { verifiedProducts } from '../intelligence/product-insight-engine';

export const compareRouter = Router();

// ── Helpers ─────────────────────────────────────────────────────

type NutritionData = Record<string, string | number | null>;

interface ComparisonRow {
  product_id: number;
  product_name: string;
  brand_name: string;
  species: string | null;
  life_stage: string | null;
  format: string | null;
  origin: string | null;
  nutrition: Record<string, string | number | null>;
  ingredients: string[];
  prices: Array<{
    retailer: string | null;
    price_aud: string;
    unit_price_aud_per_kg: string | null;
  }>;
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
      product_name: p.product_name,
      brand_name: p.brand_name || 'Unknown',
      species: p.species,
      life_stage: p.life_stage,
      format: p.format,
      origin: p.origin,
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

    if (!Array.isArray(product_ids) || product_ids.length < 2 || product_ids.length > 4) {
      res.status(400).json({ success: false, error: 'product_ids must contain 2-4 product IDs' });
      return;
    }

    const data = await fetchCompareData(product_ids);
    const comparison = buildComparison(data);

    res.json({
      success: true,
      data: {
        products: data.map((p) => ({
          product_id: p.product_id,
          product_name: p.product_name,
          brand_name: p.brand_name,
          species: p.species,
          life_stage: p.life_stage,
          format: p.format,
          origin: p.origin,
        })),
        comparison,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Comparison failed' });
  }
});

// POST /api/compare/recommend — Health-aware comparison ranking
compareRouter.post('/recommend', async (req: Request, res: Response) => {
  try {
    const { product_ids, species, health_conditions, vet_prescription_required } = req.body;

    if (!Array.isArray(product_ids) || product_ids.length < 2) {
      res.status(400).json({ success: false, error: 'product_ids must contain at least 2 product IDs' });
      return;
    }

    if (!species || !['CAT', 'DOG'].includes(species)) {
      res.status(400).json({ success: false, error: 'species must be CAT or DOG' });
      return;
    }

    // Match DB products to verified products catalog by name
    // First get product names from DB
    const dbProducts = await db
      .select({ product_id: products.product_id, name: products.name })
      .from(products)
      .where(inArray(products.product_id, product_ids));

    const dbNameMap = new Map(dbProducts.map((p) => [p.name.toLowerCase(), p.product_id]));

    // Filter verifiedProducts to those matching requested product_ids (by name)
    const catalogSubset = verifiedProducts.filter((vp) =>
      dbNameMap.has(vp.name.toLowerCase())
    );

    const profile: PetProfileInput = {
      species: species,
      age_years: 0,
      health_conditions: health_conditions || [],
      vet_prescription_required: vet_prescription_required || false,
    };

    const result = buildRecommendationContext(profile, catalogSubset);

    // Map back to DB product IDs for the response
    const enrichedRecommendations = result.recommendations.map((rec) => ({
      ...rec,
      db_product_id: dbNameMap.get(rec.product_name.toLowerCase()) || null,
    }));

    res.json({
      success: true,
      data: {
        constraints: result.constraints,
        recommendations: enrichedRecommendations.sort((a, b) => b.suitability_score - a.suitability_score),
        warnings: result.warnings,
        disclaimer: '以上分析仅供参考，不构成兽医建议。实际饮食决策请在兽医指导下进行。',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Recommendation failed' });
  }
});
