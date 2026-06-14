import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const crawlerJobs = pgTable('crawler_jobs', {
  job_id: serial('job_id').primaryKey(),
  source: varchar('source'),
  status: varchar('status').default('pending'),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
});

export type CrawlerJob = typeof crawlerJobs.$inferSelect;
export type NewCrawlerJob = typeof crawlerJobs.$inferInsert;
