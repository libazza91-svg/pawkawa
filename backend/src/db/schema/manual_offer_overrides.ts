import { pgTable, serial, integer, varchar, text, numeric, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { products } from './products';
import { sources } from './sources';

export const manualOfferOverrides = pgTable('manual_offer_overrides', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').references(() => products.product_id),
  product_slug: varchar('product_slug'),
  retailer_name: varchar('retailer_name').notNull(),
  retailer_slug: varchar('retailer_slug').notNull(),
  source_id: integer('source_id').references(() => sources.source_id),
  source_url: text('source_url').notNull(),
  market: varchar('market').notNull().default('AU'),
  currency: varchar('currency').notNull(),
  base_price: numeric('base_price'),
  sale_price: numeric('sale_price'),
  member_price: numeric('member_price'),
  subscription_price: numeric('subscription_price'),
  coupon_price: numeric('coupon_price'),
  minimum_spend: numeric('minimum_spend'),
  stock_status: varchar('stock_status').notNull().default('UNKNOWN'),
  pack_size_g: integer('pack_size_g').notNull(),
  unit_count: integer('unit_count').notNull().default(1),
  total_pack_size_g: integer('total_pack_size_g'),
  offer_type: varchar('offer_type').notNull().default('single_pack'),
  price_basis: varchar('price_basis').notNull().default('total'),
  conditional_flags: jsonb('conditional_flags').notNull().default([]),
  ordinary_best_price_eligible: boolean('ordinary_best_price_eligible').notNull().default(false),
  reason: text('reason').notNull(),
  notes: text('notes'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export type ManualOfferOverride = typeof manualOfferOverrides.$inferSelect;
export type NewManualOfferOverride = typeof manualOfferOverrides.$inferInsert;
