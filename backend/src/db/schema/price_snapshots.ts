import { integer, jsonb, numeric, pgTable, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { retailOffers } from './retail_offers';

export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    snapshot_id: serial('snapshot_id').primaryKey(),
    retail_offer_id: integer('retail_offer_id').references(() => retailOffers.retail_offer_id),
    product_slug: varchar('product_slug').notNull(),
    retailer_slug: varchar('retailer_slug').notNull(),
    market: varchar('market').notNull(),
    currency: varchar('currency').notNull(),
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
    source_url: text('source_url').notNull(),
    captured_at: timestamp('captured_at').defaultNow(),
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    uniqueSnapshotPoint: uniqueIndex('idx_price_snapshots_unique_offer_time').on(table.retail_offer_id, table.captured_at),
  }),
);

export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type NewPriceSnapshot = typeof priceSnapshots.$inferInsert;
