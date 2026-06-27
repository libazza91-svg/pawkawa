import { Router, Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import { z } from 'zod';
import { recordAdminAuditEvent } from '../admin/audit';
import {
  ALLOWED_PRODUCT_IMAGE_TYPES,
  PRODUCT_IMAGE_MAX_BYTES,
  ProductImageStorageConfigError,
  ProductImageStorageUploadError,
  uploadProductImageToStorage,
} from '../admin/product-image-storage';
import { db } from '../db/client';
import { adminDictionaryTerms, manualOfferOverrides, productImages, products, sources } from '../db/schema';
import { requireAdminAuth } from '../middleware/admin-auth';
import { requireAdminCsrf } from '../middleware/admin-csrf';
import { sendError, sendSuccess } from '../middleware/response';
import { isOrdinaryBestPriceEligible, normalizeConditionalFlags } from '../price-comparison/manual-overrides';

export const adminWriteRouter = Router();

const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PRODUCT_IMAGE_MAX_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(file.mimetype)) {
      callback(new Error('Unsupported image type. Use JPEG, PNG, or WebP.'));
      return;
    }
    callback(null, true);
  },
}).single('file');

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

const conditionalFlagsSchema = z.array(z.string().trim().min(1).max(64)).max(20);

const overrideCreateSchema = z
  .object({
    product_id: z.number().int().positive().nullable().optional(),
    product_slug: z.string().trim().min(1).max(255).nullable().optional(),
    retailer_name: z.string().trim().min(1).max(255),
    retailer_slug: z.string().trim().min(1).max(128),
    source_id: z.number().int().positive().nullable().optional(),
    source_url: z.string().trim().url(),
    market: z.string().trim().min(2).max(8).optional(),
    currency: z.string().trim().min(3).max(8),
    base_price: z.number().positive().nullable().optional(),
    sale_price: z.number().positive().nullable().optional(),
    member_price: z.number().positive().nullable().optional(),
    subscription_price: z.number().positive().nullable().optional(),
    coupon_price: z.number().positive().nullable().optional(),
    minimum_spend: z.number().positive().nullable().optional(),
    stock_status: z.string().trim().min(1).max(32),
    pack_size_g: z.number().int().positive(),
    unit_count: z.number().int().positive().optional(),
    total_pack_size_g: z.number().int().positive().nullable().optional(),
    offer_type: z.string().trim().min(1).max(64),
    price_basis: z.string().trim().min(1).max(64),
    conditional_flags: conditionalFlagsSchema.optional(),
    reason: z.string().trim().min(1).max(1000),
    notes: z.string().trim().max(4000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.product_id || value.product_slug, 'product_id or product_slug is required');

const overrideUpdateSchema = z
  .object({
    product_id: z.number().int().positive().nullable().optional(),
    product_slug: z.string().trim().min(1).max(255).nullable().optional(),
    retailer_name: z.string().trim().min(1).max(255).optional(),
    retailer_slug: z.string().trim().min(1).max(128).optional(),
    source_id: z.number().int().positive().nullable().optional(),
    source_url: z.string().trim().url().optional(),
    market: z.string().trim().min(2).max(8).optional(),
    currency: z.string().trim().min(3).max(8).optional(),
    base_price: z.number().positive().nullable().optional(),
    sale_price: z.number().positive().nullable().optional(),
    member_price: z.number().positive().nullable().optional(),
    subscription_price: z.number().positive().nullable().optional(),
    coupon_price: z.number().positive().nullable().optional(),
    minimum_spend: z.number().positive().nullable().optional(),
    stock_status: z.string().trim().min(1).max(32).optional(),
    pack_size_g: z.number().int().positive().optional(),
    unit_count: z.number().int().positive().optional(),
    total_pack_size_g: z.number().int().positive().nullable().optional(),
    offer_type: z.string().trim().min(1).max(64).optional(),
    price_basis: z.string().trim().min(1).max(64).optional(),
    conditional_flags: conditionalFlagsSchema.optional(),
    reason: z.string().trim().min(1).max(1000).optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const imageCreateSchema = z.object({
  product_id: z.number().int().positive().nullable().optional(),
  image_url: z.string().trim().url(),
  source_url: z.string().trim().url(),
  source_type: z.string().trim().min(1).max(64),
  retailer: z.string().trim().max(128).nullable().optional(),
  alt_text: z.string().trim().max(500).nullable().optional(),
  source_note: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(['active', 'disabled']).optional(),
  is_primary: z.boolean().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

const imageUpdateSchema = z
  .object({
    product_id: z.number().int().positive().nullable().optional(),
    image_url: z.string().trim().url().optional(),
    source_url: z.string().trim().url().optional(),
    source_type: z.string().trim().min(1).max(64).optional(),
    retailer: z.string().trim().max(128).nullable().optional(),
    alt_text: z.string().trim().max(500).nullable().optional(),
    source_note: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(['active', 'disabled']).optional(),
    is_primary: z.boolean().optional(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const imageUploadSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  source_url: z.string().trim().url().optional(),
  alt_text: z.string().trim().max(500).nullable().optional(),
  source_note: z.string().trim().max(2000).nullable().optional(),
  is_primary: z
    .preprocess((value) => value === true || value === 'true' || value === 'on' || value === '1', z.boolean())
    .optional(),
});

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

function numericString(value: number | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return String(value);
}

function parseProductImageUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    productImageUpload(req, res, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function assertRelatedProductExists(productId: number | null | undefined): Promise<void> {
  if (!productId) return;
  const [product] = await db.select({ product_id: products.product_id }).from(products).where(eq(products.product_id, productId));
  if (!product) {
    throw new Error('Product not found');
  }
}

async function assertRelatedSourceExists(sourceId: number | null | undefined): Promise<void> {
  if (!sourceId) return;
  const [source] = await db.select({ source_id: sources.source_id }).from(sources).where(eq(sources.source_id, sourceId));
  if (!source) {
    throw new Error('Source not found');
  }
}

async function clearPrimaryImageForProduct(productId: number | null | undefined, exceptImageId?: number): Promise<void> {
  if (!productId) return;
  const existingImages = await db
    .select({ image_id: productImages.image_id })
    .from(productImages)
    .where(eq(productImages.product_id, productId));

  for (const image of existingImages) {
    await db.update(productImages).set({ is_primary: false, updated_at: new Date() }).where(eq(productImages.image_id, image.image_id));
  }

  if (exceptImageId) {
    await db.update(productImages).set({ is_primary: true, updated_at: new Date() }).where(eq(productImages.image_id, exceptImageId));
  }
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
  '/offers/overrides',
  requireAdminCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = overrideCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0]?.message || 'Invalid manual override payload', 400);
      return;
    }

    try {
      await assertRelatedProductExists(parsed.data.product_id ?? null);
      await assertRelatedSourceExists(parsed.data.source_id ?? null);
    } catch (error) {
      sendError(res, 'NOT_FOUND', (error as Error).message, 404);
      return;
    }

    const conditionalFlags = normalizeConditionalFlags(parsed.data.conditional_flags);
    const ordinaryBestPriceEligible = isOrdinaryBestPriceEligible({
      offer_type: parsed.data.offer_type,
      price_basis: parsed.data.price_basis,
      conditional_flags: conditionalFlags,
      base_price: parsed.data.base_price ?? null,
      sale_price: parsed.data.sale_price ?? null,
      member_price: parsed.data.member_price ?? null,
      subscription_price: parsed.data.subscription_price ?? null,
      coupon_price: parsed.data.coupon_price ?? null,
      minimum_spend: parsed.data.minimum_spend ?? null,
    });

    const inserted = await db
      .insert(manualOfferOverrides)
      .values({
        product_id: parsed.data.product_id ?? null,
        product_slug: nullableText(parsed.data.product_slug),
        retailer_name: parsed.data.retailer_name.trim(),
        retailer_slug: parsed.data.retailer_slug.trim(),
        source_id: parsed.data.source_id ?? null,
        source_url: parsed.data.source_url.trim(),
        market: parsed.data.market?.trim() || 'AU',
        currency: parsed.data.currency.trim(),
        base_price: numericString(parsed.data.base_price ?? null),
        sale_price: numericString(parsed.data.sale_price ?? null),
        member_price: numericString(parsed.data.member_price ?? null),
        subscription_price: numericString(parsed.data.subscription_price ?? null),
        coupon_price: numericString(parsed.data.coupon_price ?? null),
        minimum_spend: numericString(parsed.data.minimum_spend ?? null),
        stock_status: parsed.data.stock_status.trim(),
        pack_size_g: parsed.data.pack_size_g,
        unit_count: parsed.data.unit_count ?? 1,
        total_pack_size_g: parsed.data.total_pack_size_g ?? parsed.data.pack_size_g,
        offer_type: parsed.data.offer_type.trim(),
        price_basis: parsed.data.price_basis.trim(),
        conditional_flags: conditionalFlags,
        ordinary_best_price_eligible: ordinaryBestPriceEligible,
        reason: parsed.data.reason.trim(),
        notes: nullableText(parsed.data.notes),
        is_active: parsed.data.is_active ?? true,
        updated_at: new Date(),
      })
      .returning({ id: manualOfferOverrides.id });

    const [created] = await db.select().from(manualOfferOverrides).where(eq(manualOfferOverrides.id, inserted[0].id));

    await recordAdminAuditEvent({
      actorAdminUserId: req.adminUser!.id,
      action: 'manual_offer_override_created',
      entityType: 'manual_offer_override',
      entityId: String(inserted[0].id),
      afterJson: created,
    });

    sendSuccess(res, { item: created });
  }),
);

adminWriteRouter.patch(
  '/offers/overrides/:id',
  requireAdminCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const overrideId = parseEntityId(req.params.id);
    if (!overrideId) {
      sendError(res, 'INVALID_PARAMETER', 'Valid override id is required', 400);
      return;
    }

    const parsed = overrideUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0]?.message || 'Invalid manual override update payload', 400);
      return;
    }

    const [existing] = await db.select().from(manualOfferOverrides).where(eq(manualOfferOverrides.id, overrideId));
    if (!existing) {
      sendError(res, 'NOT_FOUND', 'Manual offer override not found', 404);
      return;
    }

    try {
      await assertRelatedProductExists(parsed.data.product_id ?? undefined);
      await assertRelatedSourceExists(parsed.data.source_id ?? undefined);
    } catch (error) {
      sendError(res, 'NOT_FOUND', (error as Error).message, 404);
      return;
    }

    const conditionalFlags = parsed.data.conditional_flags ? normalizeConditionalFlags(parsed.data.conditional_flags) : undefined;
    const effectiveCandidate = {
      offer_type: parsed.data.offer_type ?? existing.offer_type,
      price_basis: parsed.data.price_basis ?? existing.price_basis,
      conditional_flags: conditionalFlags ?? (Array.isArray(existing.conditional_flags) ? existing.conditional_flags.map(String) : []),
      base_price: parsed.data.base_price ?? Number(existing.base_price ?? 0),
      sale_price: parsed.data.sale_price ?? Number(existing.sale_price ?? 0),
      member_price: parsed.data.member_price ?? Number(existing.member_price ?? 0),
      subscription_price: parsed.data.subscription_price ?? Number((existing as { subscription_price?: string | number | null }).subscription_price ?? 0),
      coupon_price: parsed.data.coupon_price ?? Number(existing.coupon_price ?? 0),
      minimum_spend: parsed.data.minimum_spend ?? Number(existing.minimum_spend ?? 0),
    };

    const updateValues = withoutUndefined({
      product_id: parsed.data.product_id ?? undefined,
      product_slug: parsed.data.product_slug !== undefined ? nullableText(parsed.data.product_slug) : undefined,
      retailer_name: parsed.data.retailer_name?.trim(),
      retailer_slug: parsed.data.retailer_slug?.trim(),
      source_id: parsed.data.source_id ?? undefined,
      source_url: parsed.data.source_url?.trim(),
      market: parsed.data.market?.trim(),
      currency: parsed.data.currency?.trim(),
      base_price: numericString(parsed.data.base_price),
      sale_price: numericString(parsed.data.sale_price),
      member_price: numericString(parsed.data.member_price),
      subscription_price: numericString(parsed.data.subscription_price),
      coupon_price: numericString(parsed.data.coupon_price),
      minimum_spend: numericString(parsed.data.minimum_spend),
      stock_status: parsed.data.stock_status?.trim(),
      pack_size_g: parsed.data.pack_size_g ?? undefined,
      unit_count: parsed.data.unit_count ?? undefined,
      total_pack_size_g: parsed.data.total_pack_size_g ?? undefined,
      offer_type: parsed.data.offer_type?.trim(),
      price_basis: parsed.data.price_basis?.trim(),
      conditional_flags: conditionalFlags,
      ordinary_best_price_eligible: isOrdinaryBestPriceEligible(effectiveCandidate),
      reason: parsed.data.reason?.trim(),
      notes: parsed.data.notes !== undefined ? nullableText(parsed.data.notes) : undefined,
      is_active: parsed.data.is_active,
      updated_at: new Date(),
    });

    await db.update(manualOfferOverrides).set(updateValues).where(eq(manualOfferOverrides.id, overrideId));
    const [updated] = await db.select().from(manualOfferOverrides).where(eq(manualOfferOverrides.id, overrideId));

    await recordAdminAuditEvent({
      actorAdminUserId: req.adminUser!.id,
      action: 'manual_offer_override_updated',
      entityType: 'manual_offer_override',
      entityId: String(overrideId),
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

adminWriteRouter.post(
  '/images',
  requireAdminCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = imageCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0]?.message || 'Invalid image payload', 400);
      return;
    }

    try {
      await assertRelatedProductExists(parsed.data.product_id ?? null);
    } catch (error) {
      sendError(res, 'NOT_FOUND', (error as Error).message, 404);
      return;
    }

    const inserted = await db
      .insert(productImages)
      .values({
        product_id: parsed.data.product_id ?? null,
        image_url: parsed.data.image_url.trim(),
        source_url: parsed.data.source_url.trim(),
        source_type: parsed.data.source_type.trim(),
        retailer: nullableText(parsed.data.retailer),
        alt_text: nullableText(parsed.data.alt_text),
        source_note: nullableText(parsed.data.source_note),
        status: parsed.data.status ?? 'active',
        is_primary: parsed.data.is_primary ?? false,
        width: parsed.data.width ?? null,
        height: parsed.data.height ?? null,
        updated_at: new Date(),
      })
      .returning({ image_id: productImages.image_id, product_id: productImages.product_id });

    if ((parsed.data.is_primary ?? false) && inserted[0].product_id) {
      await clearPrimaryImageForProduct(inserted[0].product_id, inserted[0].image_id);
    }

    const [created] = await db.select().from(productImages).where(eq(productImages.image_id, inserted[0].image_id));

    await recordAdminAuditEvent({
      actorAdminUserId: req.adminUser!.id,
      action: 'product_image_created',
      entityType: 'product_image',
      entityId: String(inserted[0].image_id),
      afterJson: created,
    });

    if (created?.is_primary) {
      await recordAdminAuditEvent({
        actorAdminUserId: req.adminUser!.id,
        action: 'product_image_primary_set',
        entityType: 'product_image',
        entityId: String(inserted[0].image_id),
        afterJson: created,
      });
    }

    sendSuccess(res, { item: created });
  }),
);

adminWriteRouter.post(
  '/images/upload',
  requireAdminCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      await parseProductImageUpload(req, res);
    } catch (error) {
      const message =
        error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 5MB or smaller'
          : error instanceof Error
            ? error.message
            : 'Invalid image upload';
      sendError(res, 'INVALID_IMAGE_UPLOAD', message, 400);
      return;
    }

    const parsed = imageUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0]?.message || 'Invalid image upload payload', 400);
      return;
    }

    if (!req.file) {
      sendError(res, 'INVALID_IMAGE_UPLOAD', 'Image file is required', 400);
      return;
    }

    try {
      await assertRelatedProductExists(parsed.data.product_id);
    } catch (error) {
      sendError(res, 'NOT_FOUND', (error as Error).message, 404);
      return;
    }

    try {
      const uploaded = await uploadProductImageToStorage({
        productId: parsed.data.product_id,
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
        originalName: req.file.originalname,
      });
      const storageMetadata = {
        storage_bucket: uploaded.bucket,
        storage_path: uploaded.objectPath,
        content_type: req.file.mimetype,
        size_bytes: req.file.size,
        original_filename: req.file.originalname,
      };

      const inserted = await db
        .insert(productImages)
        .values({
          product_id: parsed.data.product_id,
          image_url: uploaded.publicUrl,
          source_url: parsed.data.source_url?.trim() || uploaded.publicUrl,
          source_type: 'supabase_storage',
          alt_text: nullableText(parsed.data.alt_text),
          source_note: nullableText(parsed.data.source_note),
          status: 'active',
          is_primary: parsed.data.is_primary ?? false,
          metadata: JSON.stringify(storageMetadata) as unknown as Record<string, unknown>,
          updated_at: new Date(),
        })
        .returning({ image_id: productImages.image_id, product_id: productImages.product_id });

      if ((parsed.data.is_primary ?? false) && inserted[0].product_id) {
        await clearPrimaryImageForProduct(inserted[0].product_id, inserted[0].image_id);
      }

      const [created] = await db.select().from(productImages).where(eq(productImages.image_id, inserted[0].image_id));

      await recordAdminAuditEvent({
        actorAdminUserId: req.adminUser!.id,
        action: 'product_image_uploaded',
        entityType: 'product_image',
        entityId: String(inserted[0].image_id),
        afterJson: created,
      });

      if (created?.is_primary) {
        await recordAdminAuditEvent({
          actorAdminUserId: req.adminUser!.id,
          action: 'product_image_primary_set',
          entityType: 'product_image',
          entityId: String(inserted[0].image_id),
          afterJson: created,
        });
      }

      sendSuccess(res, { item: created });
    } catch (error) {
      if (error instanceof ProductImageStorageConfigError) {
        sendError(res, 'STORAGE_NOT_CONFIGURED', error.message, 503);
        return;
      }
      if (error instanceof ProductImageStorageUploadError) {
        sendError(res, 'STORAGE_UPLOAD_FAILED', error.message, 502);
        return;
      }
      throw error;
    }
  }),
);

adminWriteRouter.patch(
  '/images/:id',
  requireAdminCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const imageId = parseEntityId(req.params.id);
    if (!imageId) {
      sendError(res, 'INVALID_PARAMETER', 'Valid image id is required', 400);
      return;
    }

    const parsed = imageUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0]?.message || 'Invalid image update payload', 400);
      return;
    }

    const [existing] = await db.select().from(productImages).where(eq(productImages.image_id, imageId));
    if (!existing) {
      sendError(res, 'NOT_FOUND', 'Product image not found', 404);
      return;
    }

    try {
      await assertRelatedProductExists(parsed.data.product_id ?? undefined);
    } catch (error) {
      sendError(res, 'NOT_FOUND', (error as Error).message, 404);
      return;
    }

    const targetProductId = parsed.data.product_id ?? existing.product_id ?? null;

    const updateValues = withoutUndefined({
      product_id: parsed.data.product_id ?? undefined,
      image_url: parsed.data.image_url?.trim(),
      source_url: parsed.data.source_url?.trim(),
      source_type: parsed.data.source_type?.trim(),
      retailer: parsed.data.retailer !== undefined ? nullableText(parsed.data.retailer) : undefined,
      alt_text: parsed.data.alt_text !== undefined ? nullableText(parsed.data.alt_text) : undefined,
      source_note: parsed.data.source_note !== undefined ? nullableText(parsed.data.source_note) : undefined,
      status: parsed.data.status,
      is_primary: parsed.data.is_primary,
      width: parsed.data.width ?? undefined,
      height: parsed.data.height ?? undefined,
      updated_at: new Date(),
    });

    await db.update(productImages).set(updateValues).where(eq(productImages.image_id, imageId));
    if (parsed.data.is_primary === true && targetProductId) {
      await clearPrimaryImageForProduct(targetProductId, imageId);
    }
    const [updated] = await db.select().from(productImages).where(eq(productImages.image_id, imageId));

    await recordAdminAuditEvent({
      actorAdminUserId: req.adminUser!.id,
      action: 'product_image_updated',
      entityType: 'product_image',
      entityId: String(imageId),
      beforeJson: existing,
      afterJson: updated,
    });

    if (parsed.data.is_primary === true) {
      await recordAdminAuditEvent({
        actorAdminUserId: req.adminUser!.id,
        action: 'product_image_primary_set',
        entityType: 'product_image',
        entityId: String(imageId),
        beforeJson: existing,
        afterJson: updated,
      });
    }

    sendSuccess(res, { item: updated });
  }),
);
