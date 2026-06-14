import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const brands = pgTable('brands', {
  brand_id: serial('brand_id').primaryKey(),
  name: varchar('name').notNull().unique(),
  country: varchar('country'),
  official_url: text('official_url'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
