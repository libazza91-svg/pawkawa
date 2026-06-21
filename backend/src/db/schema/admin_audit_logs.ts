import { integer, jsonb, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { adminUsers } from './admin_users';

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: serial('id').primaryKey(),
  actor_admin_user_id: integer('actor_admin_user_id').references(() => adminUsers.id),
  action: varchar('action').notNull(),
  entity_type: varchar('entity_type').notNull(),
  entity_id: varchar('entity_id').notNull(),
  before_json: jsonb('before_json'),
  after_json: jsonb('after_json'),
  reason: text('reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
