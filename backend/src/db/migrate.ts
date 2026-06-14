import fs from 'fs';
import path from 'path';
import { pool } from './client';

export async function migrate(): Promise<void> {
  const schemaPath = path.resolve(__dirname, '../../schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
