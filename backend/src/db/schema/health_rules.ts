import { pgTable, serial, varchar, numeric, text } from 'drizzle-orm/pg-core';

export const healthRules = pgTable('health_rules', {
  id: serial('id').primaryKey(),
  need_code: varchar('need_code'),
  rule_type: varchar('rule_type'),
  field_name: varchar('field_name'),
  operator: varchar('operator'),
  threshold: numeric('threshold'),
  explanation: text('explanation'),
});

export type HealthRule = typeof healthRules.$inferSelect;
export type NewHealthRule = typeof healthRules.$inferInsert;
