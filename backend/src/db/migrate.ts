import fs from 'fs';
import path from 'path';
import { pool } from './client';

export async function migrate(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    throw new Error(`No SQL migrations found in ${migrationsDir}`);
  }

  const client = await pool.connect();
  try {
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      console.log(`Applying migration: ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    console.log(`Migration completed successfully. Applied ${migrationFiles.length} files.`);
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
