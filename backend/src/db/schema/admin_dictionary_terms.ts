import { boolean, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const adminDictionaryTerms = pgTable('admin_dictionary_terms', {
  id: serial('id').primaryKey(),
  category: varchar('category').notNull(),
  raw_term: text('raw_term').notNull(),
  normalized_value: text('normalized_value'),
  pattern: text('pattern'),
  retailer_slug: varchar('retailer_slug'),
  notes: text('notes'),
  status: varchar('status').notNull().default('active'),
  needs_review: boolean('needs_review').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export type AdminDictionaryTerm = typeof adminDictionaryTerms.$inferSelect;
export type NewAdminDictionaryTerm = typeof adminDictionaryTerms.$inferInsert;
