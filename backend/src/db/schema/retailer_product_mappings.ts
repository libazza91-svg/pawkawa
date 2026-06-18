import { pgTable, serial, integer, text, varchar, numeric, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { products } from './products';

export const retailerProductMappings = pgTable('retailer_product_mappings', {
  mapping_id: serial('mapping_id').primaryKey(),
  product_id: integer('product_id').references(() => products.product_id),
  retailer: varchar('retailer').notNull(),
  retailer_product_id: varchar('retailer_product_id').notNull(),
  product_key: text('product_key').notNull(),
  product_name: text('product_name').notNull(),
  brand_name: varchar('brand_name').notNull(),
  species: varchar('species').notNull(),
  life_stage: varchar('life_stage'),
  pack_size: varchar('pack_size').notNull(),
  pack_size_g: integer('pack_size_g'),
  price_aud: numeric('price_aud'),
  source_url: text('source_url').notNull(),
  source_type: varchar('source_type').notNull(),
  image_url: text('image_url'),
  market_availability: varchar('market_availability').notNull(),
  metadata: jsonb('metadata').default({}),
  captured_at: timestamp('captured_at').defaultNow(),
});

export type RetailerProductMapping = typeof retailerProductMappings.$inferSelect;
export type NewRetailerProductMapping = typeof retailerProductMappings.$inferInsert;
