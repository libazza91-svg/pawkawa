import { integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { products } from './products';

export const retailOffers = pgTable(
  'retail_offers',
  {
    retail_offer_id: serial('retail_offer_id').primaryKey(),
    product_id: integer('product_id').references(() => products.product_id),
    product_slug: varchar('product_slug').notNull(),
    retailer_name: varchar('retailer_name').notNull(),
    retailer_slug: varchar('retailer_slug').notNull(),
    market: varchar('market').notNull(),
    currency: varchar('currency').notNull(),
    product_url: text('product_url').notNull(),
    pack_size_g: integer('pack_size_g').notNull(),
    base_price: numeric('base_price').notNull(),
    sale_price: numeric('sale_price'),
    member_price: numeric('member_price'),
    coupon_price: numeric('coupon_price'),
    conditional_best_price: numeric('conditional_best_price'),
    conditional_price_reason: text('conditional_price_reason'),
    effective_price: numeric('effective_price').notNull(),
    unit_price_per_kg: numeric('unit_price_per_kg').notNull(),
    stock_status: varchar('stock_status').notNull(),
    promotion_text: text('promotion_text'),
    promotion_type: varchar('promotion_type'),
    coupon_code: varchar('coupon_code'),
    minimum_spend: numeric('minimum_spend'),
    shipping_threshold: numeric('shipping_threshold'),
    last_checked_at: timestamp('last_checked_at').notNull(),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    uniqueCurrentOffer: uniqueIndex('idx_retail_offers_unique_current_offer').on(
      table.product_slug,
      table.retailer_slug,
      table.market,
      table.currency,
      table.pack_size_g,
    ),
  }),
);

export type RetailOffer = typeof retailOffers.$inferSelect;
export type NewRetailOffer = typeof retailOffers.$inferInsert;
