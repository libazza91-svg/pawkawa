import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { findVerifiedProduct } from '../intelligence/product-insight-engine';
import { generateProductIntelligenceV1 } from '../rules/suitability/suitability-engine';
import { buildRecommendationContext } from '../intelligence/recommendation-context-engine';
import { getRecoveryKnowledgeTopics } from '../intelligence/recovery-knowledge-base';
import { sendError, sendSuccess } from '../middleware/response';

export const intelligenceRouter = Router();

const contextInputSchema = z.object({
  species: z.enum(['CAT', 'DOG']),
  age_years: z.number().min(0).max(40),
  breed: z.string().trim().optional(),
  health_conditions: z
    .array(z.enum(['GI_SENSITIVE', 'IBD_OR_CHRONIC_GI', 'POST_SURGERY', 'HEART_RISK', 'KIDNEY_SUPPORT', 'URINARY_SUPPORT']))
    .default([]),
  vet_prescription_required: z.boolean().optional(),
});

intelligenceRouter.get('/product/:id', (req: Request, res: Response) => {
  const product = findVerifiedProduct(req.params.id);
  if (!product) {
    sendError(res, 'PRODUCT_NOT_FOUND', 'Verified product not found', 404);
    return;
  }

  sendSuccess(res, generateProductIntelligenceV1(product));
});

intelligenceRouter.post('/context', (req: Request, res: Response) => {
  const parsed = contextInputSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'INVALID_PARAMETER', parsed.error.issues[0].message, 400);
    return;
  }

  sendSuccess(res, buildRecommendationContext(parsed.data));
});

intelligenceRouter.get('/recovery', (_req: Request, res: Response) => {
  sendSuccess(res, getRecoveryKnowledgeTopics());
});
