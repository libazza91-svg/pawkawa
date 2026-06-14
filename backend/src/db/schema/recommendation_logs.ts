import { pgTable, serial, jsonb, integer, text, varchar, timestamp } from 'drizzle-orm/pg-core';

export const recommendationLogs = pgTable('recommendation_logs', {
  request_id: serial('request_id').primaryKey(),
  user_input: jsonb('user_input'),
  product_ids: integer('product_ids').array(),
  rationale: text('rationale'),
  model: varchar('model'),
  created_at: timestamp('created_at').defaultNow(),
});

export type RecommendationLog = typeof recommendationLogs.$inferSelect;
export type NewRecommendationLog = typeof recommendationLogs.$inferInsert;
