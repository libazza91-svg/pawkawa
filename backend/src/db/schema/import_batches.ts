import { pgTable, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const importBatches = pgTable('import_batches', {
  batch_id: text('batch_id').primaryKey(),
  source_type: text('source_type').notNull(), // 'csv' | 'json' | 'connector'
  connector_name: text('connector_name'),
  rows_total: integer('rows_total').default(0),
  rows_success: integer('rows_success').default(0),
  rows_failed: integer('rows_failed').default(0),
  failed_details: jsonb('failed_details').default([]),
  started_at: timestamp('started_at').defaultNow(),
  completed_at: timestamp('completed_at'),
  status: text('status').default('running'),
});

export type ImportBatch = typeof importBatches.$inferSelect;
export type NewImportBatch = typeof importBatches.$inferInsert;
