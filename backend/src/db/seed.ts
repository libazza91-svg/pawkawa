import fs from 'fs';
import path from 'path';
import { pool } from './client';

export async function seed(): Promise<void> {
  const seedPath = path.resolve(__dirname, '../../../data/sample-products.sql');
  const sql = fs.readFileSync(seedPath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
