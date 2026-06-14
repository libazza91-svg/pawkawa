import { pgTable, serial, integer, text, varchar } from 'drizzle-orm/pg-core';
import { products } from './products';

export const productIngredients = pgTable('product_ingredients', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').references(() => products.product_id),
  raw_ingredient: text('raw_ingredient'),
  normalized_ingredient: varchar('normalized_ingredient'),
  ingredient_order: integer('ingredient_order'),
  category: varchar('category'),
});

export type ProductIngredient = typeof productIngredients.$inferSelect;
export type NewProductIngredient = typeof productIngredients.$inferInsert;
