import { pgTable, integer, numeric } from 'drizzle-orm/pg-core';
import { products } from './products';

export const productNutrition = pgTable('product_nutrition', {
  product_id: integer('product_id').primaryKey().references(() => products.product_id),
  protein_pct: numeric('protein_pct'),
  fat_pct: numeric('fat_pct'),
  fiber_pct: numeric('fiber_pct'),
  crude_fiber_pct: numeric('crude_fiber_pct'),
  moisture_pct: numeric('moisture_pct'),
  ash_pct: numeric('ash_pct'),
  phosphorus_pct: numeric('phosphorus_pct'),
  calcium_pct: numeric('calcium_pct'),
  omega_3_pct: numeric('omega_3_pct'),
  omega_6_pct: numeric('omega_6_pct'),
  calories_kcal: numeric('calories_kcal'),
  me_kcal_per_kg: numeric('me_kcal_per_kg'),
});

export type ProductNutrition = typeof productNutrition.$inferSelect;
export type NewProductNutrition = typeof productNutrition.$inferInsert;
