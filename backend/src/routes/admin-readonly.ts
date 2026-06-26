import { Router, Request, Response, NextFunction } from 'express';
import { sql, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { adminAuditLogs, brands, products, retailOffers, sources } from '../db/schema';
import { requireAdminAuth } from '../middleware/admin-auth';
import { sendSuccess } from '../middleware/response';

export const adminReadonlyRouter = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function limitFromQuery(value: unknown, fallback = 50): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

adminReadonlyRouter.use(requireAdminAuth);

adminReadonlyRouter.get(
  '/dashboard',
  asyncHandler(async (_req: Request, res: Response) => {
    const [productCount, offerCount, sourceCount, auditCount, retailerCount, latestOffer] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(products),
      db.select({ count: sql<number>`count(*)::int` }).from(retailOffers),
      db.select({ count: sql<number>`count(*)::int` }).from(sources),
      db.select({ count: sql<number>`count(*)::int` }).from(adminAuditLogs),
      db.select({ count: sql<number>`count(distinct ${retailOffers.retailer_slug})::int` }).from(retailOffers),
      db
        .select({ last_checked_at: sql<Date | null>`max(${retailOffers.last_checked_at})` })
        .from(retailOffers),
    ]);

    sendSuccess(res, {
      summary: {
        products: productCount[0]?.count ?? 0,
        offers: offerCount[0]?.count ?? 0,
        sources: sourceCount[0]?.count ?? 0,
        audit_events: auditCount[0]?.count ?? 0,
        retailers: retailerCount[0]?.count ?? 0,
        latest_offer_checked_at: latestOffer[0]?.last_checked_at ?? null,
      },
    });
  }),
);

adminReadonlyRouter.get(
  '/products',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = limitFromQuery(req.query.limit);
    const items = await db
      .select({
        product_id: products.product_id,
        name: products.name,
        brand_name: brands.name,
        species: products.species,
        life_stage: products.life_stage,
        product_type: products.product_type,
        format: products.format,
        origin: products.origin,
        package_size_g: products.package_size_g,
        status: products.status,
        source_count: products.source_count,
        confidence_score: products.confidence_score,
        verification_status: products.verification_status,
        updated_at: products.updated_at,
      })
      .from(products)
      .leftJoin(brands, eq(products.brand_id, brands.brand_id))
      .orderBy(products.product_id)
      .limit(limit);

    sendSuccess(res, { items });
  }),
);

adminReadonlyRouter.get(
  '/offers',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = limitFromQuery(req.query.limit);
    const items = await db
      .select({
        retail_offer_id: retailOffers.retail_offer_id,
        product_slug: retailOffers.product_slug,
        retailer_name: retailOffers.retailer_name,
        retailer_slug: retailOffers.retailer_slug,
        market: retailOffers.market,
        currency: retailOffers.currency,
        pack_size_g: retailOffers.pack_size_g,
        effective_price: retailOffers.effective_price,
        unit_price_per_kg: retailOffers.unit_price_per_kg,
        stock_status: retailOffers.stock_status,
        source_url: retailOffers.product_url,
        last_checked_at: retailOffers.last_checked_at,
      })
      .from(retailOffers)
      .orderBy(retailOffers.retail_offer_id)
      .limit(limit);

    sendSuccess(res, { items });
  }),
);

adminReadonlyRouter.get(
  '/sources',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = limitFromQuery(req.query.limit);
    const items = await db
      .select({
        source_id: sources.source_id,
        product_id: sources.product_id,
        product_name: products.name,
        source_url: sources.source_url,
        source_type: sources.source_type,
        status: sources.status,
        needs_review: sources.needs_review,
        notes: sources.notes,
        expected_pack_size_g: sources.expected_pack_size_g,
        expected_offer_type: sources.expected_offer_type,
        expected_unit_count: sources.expected_unit_count,
        confidence_score: sources.confidence_score,
        captured_at: sources.captured_at,
        updated_at: sources.updated_at,
      })
      .from(sources)
      .leftJoin(products, eq(sources.product_id, products.product_id))
      .orderBy(sources.source_id)
      .limit(limit);

    sendSuccess(res, { items });
  }),
);

adminReadonlyRouter.get(
  '/audit-log',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = limitFromQuery(req.query.limit);
    const items = await db
      .select({
        id: adminAuditLogs.id,
        actor_admin_user_id: adminAuditLogs.actor_admin_user_id,
        action: adminAuditLogs.action,
        entity_type: adminAuditLogs.entity_type,
        entity_id: adminAuditLogs.entity_id,
        reason: adminAuditLogs.reason,
        created_at: adminAuditLogs.created_at,
      })
      .from(adminAuditLogs)
      .orderBy(adminAuditLogs.id)
      .limit(limit);

    sendSuccess(res, { items });
  }),
);
