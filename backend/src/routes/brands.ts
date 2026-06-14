import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { brands, products } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { brandsQuerySchema } from '../validation/schemas';
import { sendSuccess, sendError } from '../middleware/response';
import { ZodError } from 'zod';

export const brandsRouter = Router();

// ── Error wrapper ──────────────────────────────────────────────────
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// ── GET /api/brands — Brands List ─────────────────────────────────
brandsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = brandsQuerySchema.safeParse(req.query);
    if (!query.success) {
      const err = query.error as ZodError;
      sendError(res, 'INVALID_PARAMETER', err.issues[0].message, 400);
      return;
    }

    const { page, pageSize, country } = query.data;

    // Build where clause
    const whereClause = country ? eq(brands.country, country) : undefined;

    // Count
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(brands)
      .where(whereClause);

    // Main query
    const items = await db
      .select()
      .from(brands)
      .where(whereClause)
      .orderBy(brands.name)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    sendSuccess(res, {
      items,
      pagination: { page, pageSize, total },
    });
  })
);

// ── GET /api/brands/:id — Brand Detail ────────────────────────────
brandsRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const brandId = parseInt(req.params.id, 10);
    if (isNaN(brandId)) {
      sendError(res, 'INVALID_PARAMETER', 'Brand ID must be a number', 400);
      return;
    }

    // Fetch brand
    const brandRows = await db
      .select()
      .from(brands)
      .where(eq(brands.brand_id, brandId));

    if (brandRows.length === 0) {
      sendError(res, 'BRAND_NOT_FOUND', 'Brand not found', 404);
      return;
    }

    // Fetch products for this brand
    const productRows = await db
      .select()
      .from(products)
      .where(eq(products.brand_id, brandId))
      .orderBy(products.name);

    sendSuccess(res, {
      brand: brandRows[0],
      products: productRows,
    });
  })
);
