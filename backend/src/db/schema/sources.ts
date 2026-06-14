import { pgTable, serial, integer, text, varchar, timestamp, numeric } from 'drizzle-orm/pg-core';
import { products } from './products';

export const sources = pgTable('sources', {
  source_id: serial('source_id').primaryKey(),
  product_id: integer('product_id').references(() => products.product_id),
  source_url: text('source_url'),
  source_type: varchar('source_type'),
  captured_at: timestamp('captured_at').defaultNow(),
  confidence_score: numeric('confidence_score').default('0'),
});

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
