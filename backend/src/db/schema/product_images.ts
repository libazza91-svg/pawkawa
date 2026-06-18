import { pgTable, serial, integer, text, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { products } from './products';

export const productImages = pgTable('product_images', {
  image_id: serial('image_id').primaryKey(),
  product_id: integer('product_id').references(() => products.product_id),
  image_url: text('image_url').notNull(),
  source_url: text('source_url').notNull(),
  source_type: varchar('source_type').notNull(),
  retailer: varchar('retailer'),
  alt_text: text('alt_text'),
  width: integer('width'),
  height: integer('height'),
  metadata: jsonb('metadata').default({}),
  captured_at: timestamp('captured_at').defaultNow(),
});

export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
