import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const ingredientDictionary = pgTable('ingredient_dictionary', {
  id: serial('id').primaryKey(),
  raw_name: varchar('raw_name'),
  normalized_name: varchar('normalized_name'),
  category: varchar('category'),
});

export type IngredientDictionary = typeof ingredientDictionary.$inferSelect;
export type NewIngredientDictionary = typeof ingredientDictionary.$inferInsert;
