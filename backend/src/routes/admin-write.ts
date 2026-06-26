import { Router, Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { recordAdminAuditEvent } from '../admin/audit';
import { db } from '../db/client';
import { adminDictionaryTerms, products, sources } from '../db/schema';
import { requireAdminAuth } from '../middleware/admin-auth';
import { requireAdminCsrf } from '../middleware/admin-csrf';
import { sendError, sendSuccess } from '../middleware/response';

export const adminWriteRouter = Router();

const dictionaryCategorySchema = z.enum([
  'brand_alias',
  'product_alias',
  'formula_token',
  'ingredient_normalization',
  'pack_size_pattern',
  'bundle_keyword',
  'conditional_price_keyword',
  'retailer_mapping',
  'exclusion_keyword',
]);

const productUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    species: z.string().trim().min(1).max(32).nullable().optional(),
    life_stage: z.string().trim().min(1).max(32).nullable().optional(),
    product_type: z.string().trim().min(1).max(64).nullable().optional(),
    format: z.string().trim().min(1).max(64).nullable().optional(),
    origin: z.string().trim().min(1).max(64).nullable().optional(),
    status: z.string().trim().min(1).max(32).optional(),
    verification_status: z.string().trim().min(1).max(64).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const sourceCreateSchema = z.object({
  product_id: z.number().int().positive(),
  source_url: z.string().trim().url(),
  source_type: z.string().trim().min(1).max(64).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  needs_review: z.boolean().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  expected_pack_size_g: z.number().int().positive().nullable().optional(),
  expected_offer_type: z.string().trim().min(1).max(64).nullable().optional(),
  expected_unit_count: z.number().int().positive().nullable().optional(),
});

const sourceUpdateSchema = z
  .object({
    source_url: z.string().trim().url().optional(),
    source_type: z.string().trim().min(1).max(64).optional(),
    status: z.enum(['active', 'disabled']).optional(),
    needs_review: z.boolean().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    expected_pack_size_g: z.number().int().positive().nullable().optional(),
    expected_offer_type: z.string().trim().min(1).max(64).nullable().optional(),
    expected_unit_count: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const dictionaryCreateSchema = z.object({
  category: dictionaryCategorySchema,
  raw_term: z.string().trim().min(1).max(500),
  normalized_value: z.string().trim().max(500).nullable().optional(),
  pattern: z.string().trim().max(1000).nullable().optional(),
  retailer_slug: z.string().trim().max(128).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(['active', 'disabled']).optional(),
  needs_review: z.boolean().optional(),
});

const dictionaryUpdateSchema = z
  .object({
    category: dictionaryCategorySchema.optional(),
    raw_term: z.string().trim().min(1).max(500).optional(),
    normalized_value: z.string().trim().max(500).nullable().optional(),
    pattern: z.string().trim().max(1000).nullable().optional(),
    retailer_slug: z.string().trim().max(128).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(['active', 'disabled']).optional(),
    needs_review: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function parseEntityId(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function limitFromQuery(value: unknown, fallback = 50): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

function nullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value === null || value.trim().length === 0 ? null : value.trim();
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as Partial<T>;
}

adminWriteRouter.use(requireAdminAuth);

adminWriteRouter.get(
  '/dictionary',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = limitFromQuery(req.query.limit);
    const items = await db
      .select()
      .from(adminDictionaryTerms)
      .orderBy(adminDictionaryTerms.id)
      .limit(limit);

    sendSuccess(res, { items });
  }),
);

adminWriteRouter.patch(
  '/products/:id',
  requireAdminCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseEntityId(req.params.id);
    if (!productId) {
      sendError(res, 'INVALID_PARAMETER', 'Valid product id is required', 400);
      return;
    }

    const parsed = productUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0]?.message || 'Invalid product payload', 400);
      return;
    }

    const [existing] = await db.select().from(products).where(eq(products.product_id, productId));
    if (!existing) {
      sendError(res, 'NOT_FOUND', 'Product not found', 404);
      return;
    }

    const updateValues = {
      ...parsed.data,
      updated_at: new Date(),
    };

    await db.update(products).set(updateValues).where(eq(products.product_id, productId));
    const [updated] = await db.select().from(products).where(eq(products.product_id, productId));

    await recordAdminAuditEvent({
      actorAdminUserId: req.adminUser!.id,
      action: 'product_updated',
      entityType: 'product',
      entityId: String(productId),
      beforeJson: existing,
      afterJson: updated,
    });

    sendSuccess(res, { item: updated });
  }),
);

adminWriteRouter.post(
  '/sources',
  requireAdminCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = sourceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0]?.message || 'Invalid source payload', 400);
      return;
    }

    const [product] = await db.select().from(products).where(eq(products.product_id, parsed.data.product_id));
    if (!product) {
      sendError(res, 'NOT_FOUND', 'Product not found for source record', 404);
      return;
    }

    const inserted = await db
      .insert(sources)
      .values({
        product_id: parsed.data.product_id,
        source_url: parsed.data.source_url.trim(),
        source_type: parsed.data.source_type?.trim(),
        status: parsed.data.status ?? 'active',
        needs_review: parsed.data.needs_review ?? false,
        notes: nullableText(parsed.data.notes),
        expected_pack_size_g: parsed.data.expected_pack_size_g ?? null,
        expected_offer_type: nullableText(parsed.data.expected_offer_type),
        expected_unit_count: parsed.data.expected_unit_count ?? null,
        updated_at: new Date(),
      })
      .returning({ source_id: sources.source_id });

    const [created] = await db.select().from(sources).where(eq(sources.source_id, inserted[0].source_id));

    await recordAdminAuditEvent({
      actorAdminUserId: req.adminUser!.id,
      action: 'source_url_created',
      entityType: 'source',
      entityId: String(inserted[0].source_id),
      afterJson: created,
    });

    sendSuccess(res, { item: created });
  }),
);

adminWriteRouter.patch(
  '/sources/:id',
  requireAdminCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const sourceId = parseEntityId(req.params.id);
    if (!sourceId) {
      sendError(res, 'INVALID_PARAMETER', 'Valid source id is required', 400);
      return;
    }

    const parsed = sourceUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0]?.message || 'Invalid source update payload', 400);
      return;
    }

    const [existing] = await db.select().from(sources).where(eq(sources.source_id, sourceId));
    if (!existing) {
      sendError(res, 'NOT_FOUND', 'Source record not found', 404);
      return;
    }

    const updateValues = withoutUndefined({
      source_url: parsed.data.source_url?.trim(),
      source_type: parsed.data.source_type?.trim(),
      status: parsed.data.status,
      needs_review: parsed.data.needs_review,
      notes: nullableText(parsed.data.notes),
      expected_pack_size_g: parsed.data.expected_pack_size_g ?? undefined,
      expected_offer_type: nullableText(parsed.data.expected_offer_type),
      expected_unit_count: parsed.data.expected_unit_count ?? undefined,
      updated_at: new Date(),
    });

    await db.update(sources).set(updateValues).where(eq(sources.source_id, sourceId));
    const [updated] = await db.select().from(sources).where(eq(sources.source_id, sourceId));

    await recordAdminAuditEvent({
      actorAdminUserId: req.adminUser!.id,
      action: 'source_url_updated',
      entityType: 'source',
      entityId: String(sourceId),
      beforeJson: existing,
      afterJson: updated,
    });

    sendSuccess(res, { item: updated });
  }),
);

adminWriteRouter.post(
  '/dictionary',
  requireAdminCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = dictionaryCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0]?.message || 'Invalid dictionary payload', 400);
      return;
    }

    const inserted = await db
      .insert(adminDictionaryTerms)
      .values({
        category: parsed.data.category,
        raw_term: parsed.data.raw_term.trim(),
        normalized_value: nullableText(parsed.data.normalized_value),
        pattern: nullableText(parsed.data.pattern),
        retailer_slug: nullableText(parsed.data.retailer_slug),
        notes: nullableText(parsed.data.notes),
        status: parsed.data.status ?? 'active',
        needs_review: parsed.data.needs_review ?? false,
        updated_at: new Date(),
      })
      .returning({ id: adminDictionaryTerms.id });

    const [created] = await db.select().from(adminDictionaryTerms).where(eq(adminDictionaryTerms.id, inserted[0].id));

    await recordAdminAuditEvent({
      actorAdminUserId: req.adminUser!.id,
      action: 'dictionary_term_created',
      entityType: 'dictionary_term',
      entityId: String(inserted[0].id),
      afterJson: created,
    });

    sendSuccess(res, { item: created });
  }),
);

adminWriteRouter.patch(
  '/dictionary/:id',
  requireAdminCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const termId = parseEntityId(req.params.id);
    if (!termId) {
      sendError(res, 'INVALID_PARAMETER', 'Valid dictionary id is required', 400);
      return;
    }

    const parsed = dictionaryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0]?.message || 'Invalid dictionary update payload', 400);
      return;
    }

    const [existing] = await db.select().from(adminDictionaryTerms).where(eq(adminDictionaryTerms.id, termId));
    if (!existing) {
      sendError(res, 'NOT_FOUND', 'Dictionary term not found', 404);
      return;
    }

    const updateValues = withoutUndefined({
      category: parsed.data.category,
      raw_term: parsed.data.raw_term?.trim(),
      normalized_value: nullableText(parsed.data.normalized_value),
      pattern: nullableText(parsed.data.pattern),
      retailer_slug: nullableText(parsed.data.retailer_slug),
      notes: nullableText(parsed.data.notes),
      status: parsed.data.status,
      needs_review: parsed.data.needs_review,
      updated_at: new Date(),
    });

    await db.update(adminDictionaryTerms).set(updateValues).where(eq(adminDictionaryTerms.id, termId));
    const [updated] = await db.select().from(adminDictionaryTerms).where(eq(adminDictionaryTerms.id, termId));

    await recordAdminAuditEvent({
      actorAdminUserId: req.adminUser!.id,
      action: 'dictionary_term_updated',
      entityType: 'dictionary_term',
      entityId: String(termId),
      beforeJson: existing,
      afterJson: updated,
    });

    sendSuccess(res, { item: updated });
  }),
);
