import { pgTable, serial, integer, varchar, timestamp, real, text } from 'drizzle-orm/pg-core';
import { brands } from './brands';

export const products = pgTable('products', {
  product_id: serial('product_id').primaryKey(),
  brand_id: integer('brand_id').references(() => brands.brand_id),
  name: varchar('name').notNull(),
  species: varchar('species'),
  life_stage: varchar('life_stage'),
  product_type: varchar('product_type'),
  format: varchar('format'),
  package_size_g: integer('package_size_g'),
  origin: varchar('origin'),
  status: varchar('status').default('active'),
  // ── Data Confidence Layer (Epic C) ──
  source_count: integer('source_count').default(0),
  confidence_score: real('confidence_score').default(0.0),
  verification_status: text('verification_status').default('UNVERIFIED'),
  // ── Import tracking ──
  imported_batch_id: text('imported_batch_id'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
