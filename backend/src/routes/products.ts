import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { products, brands, productNutrition, productIngredients, productPrices, sources } from '../db/schema';
import { eq, and, ilike, asc, sql } from 'drizzle-orm';
import { productQuerySchema, productSearchSchema } from '../validation/schemas';
import { sendSuccess, sendError } from '../middleware/response';
import { ZodError } from 'zod';
import { slugifyProductName, toConfidencePercent, toVerificationGrade } from '../lib/product-slug';
import { checkConnection } from '../db/client';
import { verifiedProducts } from '../verified-products/catalog';
import { getProductOffers } from '../price-comparison/service';
import { isMarketRegion, parseMarket } from '../price-comparison/markets';

export const productsRouter = Router();

function serializeProductListItem(item: {
  product_id: number;
  brand_id: number | null;
  name: string;
  species: string | null;
  life_stage: string | null;
  format: string | null;
  origin: string | null;
  status: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  brand_name: string | null;
  confidence_score?: number | null;
  verification_status?: string | null;
}) {
  return {
    ...item,
    slug: slugifyProductName(item.name),
    confidence: toConfidencePercent(item.confidence_score ?? null),
    trust_grade: toVerificationGrade(item.confidence_score ?? null),
  };
}

function buildFallbackProductItems() {
  return verifiedProducts.map((product, index) => ({
    product_id: index + 1,
    brand_id: null,
    name: product.name,
    species: product.species,
    life_stage: product.life_stage,
    format: null,
    origin: null,
    status: product.market_availability,
    created_at: null,
    updated_at: null,
    brand_name: product.brand,
    slug: product.slug,
    confidence: product.confidence,
    trust_grade: product.verification_grade,
  }));
}

// ── Error wrapper ──────────────────────────────────────────────────
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// ── GET /api/products — Product Query ─────────────────────────────
productsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = productQuerySchema.safeParse(req.query);
    if (!query.success) {
      const err = query.error as ZodError;
      const firstIssue = err.issues[0];
      const path = firstIssue.path.join('.');
      if (path === 'species' && firstIssue.code === 'invalid_enum_value') {
        sendError(res, 'INVALID_PARAMETER', 'Invalid species value. Allowed: CAT, DOG', 400);
        return;
      }
      if (path === 'lifeStage' && firstIssue.code === 'invalid_enum_value') {
        sendError(res, 'INVALID_PARAMETER', 'Invalid lifeStage value. Allowed: KITTEN, ADULT, SENIOR, PUPPY, ALL_LIFE_STAGES', 400);
        return;
      }
      sendError(res, 'INVALID_PARAMETER', firstIssue.message, 400);
      return;
    }

    const { page, pageSize, species, lifeStage, brand } = query.data;

    if (!(await checkConnection())) {
      const fallbackItems = buildFallbackProductItems().filter((item) => {
        const matchesSpecies = !species || item.species === species;
        const matchesLifeStage = !lifeStage || item.life_stage === lifeStage;
        const matchesBrand = !brand || (item.brand_name || '').toLowerCase().includes(brand.toLowerCase());
        return matchesSpecies && matchesLifeStage && matchesBrand;
      });
      const offset = (page - 1) * pageSize;
      sendSuccess(res, {
        items: fallbackItems.slice(offset, offset + pageSize),
        pagination: { page, pageSize, total: fallbackItems.length },
      });
      return;
    }

    // Build SQL conditions
    const whereParts: ReturnType<typeof eq>[] = [];
    if (species) whereParts.push(eq(products.species, species));
    if (lifeStage) whereParts.push(eq(products.life_stage, lifeStage));
    if (brand) whereParts.push(ilike(brands.name, `%${brand}%`));
    const whereClause = whereParts.length > 0 ? and(...whereParts) : undefined;

    // Total count
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .leftJoin(brands, eq(products.brand_id, brands.brand_id))
      .where(whereClause);

    // Main query
    const items = await db
      .select({
        product_id: products.product_id,
        brand_id: products.brand_id,
        name: products.name,
        species: products.species,
        life_stage: products.life_stage,
        format: products.format,
        origin: products.origin,
        status: products.status,
        confidence_score: products.confidence_score,
        verification_status: products.verification_status,
        created_at: products.created_at,
        updated_at: products.updated_at,
        brand_name: brands.name,
      })
      .from(products)
      .leftJoin(brands, eq(products.brand_id, brands.brand_id))
      .where(whereClause)
      .orderBy(products.name)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    sendSuccess(res, {
      items: items.map(serializeProductListItem),
      pagination: { page, pageSize, total },
    });
  })
);

// ── GET /api/products/search — Product Search ─────────────────────
productsRouter.get(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const query = productSearchSchema.safeParse(req.query);
    if (!query.success) {
      const err = query.error as ZodError;
      sendError(res, 'INVALID_PARAMETER', err.issues[0].message, 400);
      return;
    }

    const { q, page, pageSize } = query.data;
    const searchPattern = `%${q}%`;

    if (!(await checkConnection())) {
      const fallbackItems = buildFallbackProductItems().filter((item) => {
        const haystack = `${item.name} ${item.brand_name || ''}`.toLowerCase();
        return haystack.includes(q.toLowerCase());
      });
      const offset = (page - 1) * pageSize;
      sendSuccess(res, {
        items: fallbackItems.slice(offset, offset + pageSize),
        pagination: { page, pageSize, total: fallbackItems.length },
      });
      return;
    }

    // Count
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .leftJoin(brands, eq(products.brand_id, brands.brand_id))
      .where(
        sql`(${ilike(products.name, searchPattern)} OR ${ilike(brands.name, searchPattern)})`
      );

    // Main query
    const items = await db
      .select({
        product_id: products.product_id,
        brand_id: products.brand_id,
        name: products.name,
        species: products.species,
        life_stage: products.life_stage,
        format: products.format,
        origin: products.origin,
        status: products.status,
        confidence_score: products.confidence_score,
        verification_status: products.verification_status,
        created_at: products.created_at,
        updated_at: products.updated_at,
        brand_name: brands.name,
      })
      .from(products)
      .leftJoin(brands, eq(products.brand_id, brands.brand_id))
      .where(
        sql`(${ilike(products.name, searchPattern)} OR ${ilike(brands.name, searchPattern)})`
      )
      .orderBy(products.name)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    sendSuccess(res, {
      items: items.map(serializeProductListItem),
      pagination: { page, pageSize, total },
    });
  })
);

// ── GET /api/products/:slug/offers — Price-first retailer offers ───
productsRouter.get(
  '/:slug/offers',
  asyncHandler(async (req: Request, res: Response) => {
    const rawMarket = req.query.market;
    if (rawMarket !== undefined && !isMarketRegion(rawMarket)) {
      sendError(res, 'INVALID_MARKET', 'market must be AU or NZ', 400);
      return;
    }

    const result = await getProductOffers(req.params.slug, parseMarket(rawMarket));
    if (!result) {
      sendError(res, 'PRODUCT_NOT_FOUND', 'Product not found', 404);
      return;
    }

    sendSuccess(res, result);
  })
);

// ── GET /api/products/:id — Product Detail ────────────────────────
productsRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
      sendError(res, 'INVALID_PARAMETER', 'Product ID must be a number', 400);
      return;
    }

    // Fetch product with brand
    const productRows = await db
      .select({
        product_id: products.product_id,
        brand_id: products.brand_id,
        name: products.name,
        species: products.species,
        life_stage: products.life_stage,
        product_type: products.product_type,
        format: products.format,
        package_size_g: products.package_size_g,
        origin: products.origin,
        status: products.status,
        source_count: products.source_count,
        confidence_score: products.confidence_score,
        verification_status: products.verification_status,
        created_at: products.created_at,
        updated_at: products.updated_at,
        brand_name: brands.name,
        brand_country: brands.country,
        brand_official_url: brands.official_url,
      })
      .from(products)
      .leftJoin(brands, eq(products.brand_id, brands.brand_id))
      .where(eq(products.product_id, productId));

    if (productRows.length === 0) {
      sendError(res, 'PRODUCT_NOT_FOUND', 'Product not found', 404);
      return;
    }

    const product = productRows[0];

    // Fetch related data in parallel
    const [nutritionRows, ingredientRows, priceRows, sourceRows] = await Promise.all([
      db
        .select()
        .from(productNutrition)
        .where(eq(productNutrition.product_id, productId)),
      db
        .select()
        .from(productIngredients)
        .where(eq(productIngredients.product_id, productId))
        .orderBy(asc(productIngredients.ingredient_order)),
      db
        .select()
        .from(productPrices)
        .where(eq(productPrices.product_id, productId))
        .orderBy(asc(productPrices.unit_price_aud_per_kg)),
      db
        .select()
        .from(sources)
        .where(eq(sources.product_id, productId)),
    ]);

    sendSuccess(res, {
      product,
      nutrition: nutritionRows[0] || null,
      ingredients: ingredientRows,
      prices: priceRows,
      sources: sourceRows,
    });
  })
);
