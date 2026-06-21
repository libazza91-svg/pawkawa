import { integer, pgTable, serial, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { adminUsers } from './admin_users';

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: serial('id').primaryKey(),
    admin_user_id: integer('admin_user_id')
      .notNull()
      .references(() => adminUsers.id),
    session_token_hash: varchar('session_token_hash').notNull(),
    expires_at: timestamp('expires_at').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    last_seen_at: timestamp('last_seen_at').defaultNow().notNull(),
    revoked_at: timestamp('revoked_at'),
  },
  (table) => ({
    uniqueSessionTokenHash: uniqueIndex('idx_admin_sessions_token_hash_unique').on(table.session_token_hash),
  }),
);

export type AdminSession = typeof adminSessions.$inferSelect;
export type NewAdminSession = typeof adminSessions.$inferInsert;
