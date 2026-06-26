import { pgTable, serial, integer, text, varchar, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';
import { products } from './products';

export const sources = pgTable('sources', {
  source_id: serial('source_id').primaryKey(),
  product_id: integer('product_id').references(() => products.product_id),
  source_url: text('source_url'),
  source_type: varchar('source_type'),
  status: varchar('status').default('active'),
  needs_review: boolean('needs_review').default(false),
  notes: text('notes'),
  expected_pack_size_g: integer('expected_pack_size_g'),
  expected_offer_type: varchar('expected_offer_type'),
  expected_unit_count: integer('expected_unit_count'),
  captured_at: timestamp('captured_at').defaultNow(),
  confidence_score: numeric('confidence_score').default('0'),
  updated_at: timestamp('updated_at').defaultNow(),
});

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
