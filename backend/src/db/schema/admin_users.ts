import { pgTable, serial, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const adminUsers = pgTable(
  'admin_users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email').notNull(),
    name: varchar('name').notNull(),
    password_hash: varchar('password_hash').notNull(),
    role: varchar('role').notNull().default('admin'),
    status: varchar('status').notNull().default('active'),
    last_login_at: timestamp('last_login_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueEmail: uniqueIndex('idx_admin_users_email_unique').on(table.email),
  }),
);

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
