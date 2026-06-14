import { pgTable, serial, integer, varchar, numeric, text, timestamp } from 'drizzle-orm/pg-core';
import { products } from './products';

export const productPrices = pgTable('product_prices', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').references(() => products.product_id),
  retailer: varchar('retailer'),
  price_aud: numeric('price_aud'),
  pack_size: numeric('pack_size'),
  unit_price_aud_per_kg: numeric('unit_price_aud_per_kg'),
  affiliate_url: text('affiliate_url'),
  captured_at: timestamp('captured_at').defaultNow(),
});

export type ProductPrice = typeof productPrices.$inferSelect;
export type NewProductPrice = typeof productPrices.$inferInsert;
