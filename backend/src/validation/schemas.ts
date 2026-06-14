import { z } from 'zod';
import { Species, LifeStage } from './enums';

export const productQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 1;
      return isNaN(n) || n < 1 ? 1 : n;
    })
    .pipe(z.number().int().min(1).default(1)),
  pageSize: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 20;
      return isNaN(n) || n < 1 ? 20 : n;
    })
    .pipe(z.number().int().min(1).max(100).default(20)),
  species: z
    .string()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined))
    .pipe(z.enum(Species).optional()),
  lifeStage: z
    .string()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined))
    .pipe(z.enum(LifeStage).optional()),
  brand: z.string().optional(),
});

export const productSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 1;
      return isNaN(n) || n < 1 ? 1 : n;
    })
    .pipe(z.number().int().min(1).default(1)),
  pageSize: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 20;
      return isNaN(n) || n < 1 ? 20 : n;
    })
    .pipe(z.number().int().min(1).max(100).default(20)),
});

export const brandsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 1;
      return isNaN(n) || n < 1 ? 1 : n;
    })
    .pipe(z.number().int().min(1).default(1)),
  pageSize: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 20;
      return isNaN(n) || n < 1 ? 20 : n;
    })
    .pipe(z.number().int().min(1).max(100).default(20)),
  country: z.string().optional(),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type ProductSearchInput = z.infer<typeof productSearchSchema>;
export type BrandsQueryInput = z.infer<typeof brandsQuerySchema>;
